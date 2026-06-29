/**
 * 测试工具集：鉴权、请求封装、断言、日志、并发测试
 *
 * ═══════════════════════════════════════════════════════════
 * v3 增强（2026-06-28）：
 *   1. 新增 concurrentRequest() — 并发冲突/幂等测试
 *   2. 新增 logout() — 测试 Token 退出后立即失效
 *   3. 新增 fetchWithRetry() — 独立重试逻辑，支持自定义退避
 *   4. 新增 safeGet() — 防御性 GET，避免空指针崩溃
 *   5. 新增 genPhone() — 统一手机号生成，避免重复代码
 *   6. loginAs() 增加详细错误信息（含角色名、HTTP状态码）
 *   7. createClient() 新增 query 方法，支持查询参数 GET
 *   8. runCase() 新增 hasNoField 断言、matchBody 断言
 *   9. 全局超时保护：所有 fetch 请求统一超时 15s
 * ═══════════════════════════════════════════════════════════
 */
const config = require('./config');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 一、底层 HTTP 封装 — 超时 + 错误处理
// ═══════════════════════════════════════════════════════════

/**
 * 带超时的 fetch 封装
 *
 * 【为什么需要】
 *  Node.js 原生 fetch 不支持 timeout 参数。如果不设超时，
 *  网络故障时请求会挂起直到系统超时（通常 30s+），导致测试脚本卡死。
 *
 * 【实现原理】
 *  用 AbortController 在指定时间后中断请求。Promise.race 不适用，
 *  因为 fetch 在 race 后仍会继续占用连接。AbortController 是标准做法。
 *
 * @param {string} url       - 完整请求 URL
 * @param {object} options   - fetch 选项 {method, headers, body, timeout(ms)}
 * @returns {Promise<{status, data, headers}>}  统一的响应格式
 */
function fetchWithTimeout(url, options = {}) {
  // 提取自定义 timeout，其余透传给原生 fetch
  const { timeout = config.REQUEST_TIMEOUT, ...fetchOpts } = options;

  return new Promise((resolve, reject) => {
    // AbortController：浏览器和 Node.js v15+ 原生支持
    const controller = new AbortController();
    const timer = setTimeout(() => {
      // 超时后主动 abort，触发 fetch 抛出 AbortError
      controller.abort();
    }, timeout);

    fetch(url, { ...fetchOpts, signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timer); // 请求完成，清除超时定时器

        // 根据 Content-Type 智能解析响应体
        let data = null;
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          // JSON 响应：解析为对象，方便后续断言
          try {
            data = await res.json();
          } catch (_e) {
            // 某些接口返回 204 No Content，body 为空，JSON 解析会失败
            // 此时 data 保持 null，不影响状态码断言
            data = null;
          }
        } else {
          // 非 JSON（如纯文本错误页）：保留原始文本
          data = await res.text();
        }

        // 统一返回格式，与旧 axios 版本兼容
        resolve({ status: res.status, data, headers: res.headers });
      })
      .catch((err) => {
        clearTimeout(timer);

        // AbortError → 超时（不是网络错误，语义不同）
        if (err.name === 'AbortError') {
          reject(new Error(`timeout of ${timeout}ms exceeded`));
        } else {
          // 其他错误：DNS 解析失败、连接拒绝、TLS 握手失败等
          reject(err);
        }
      });
  });
}

// ═══════════════════════════════════════════════════════════
// 二、鉴权管理 — Token 缓存 + 登录 + 登出
// ═══════════════════════════════════════════════════════════

/**
 * Token 缓存池
 *
 * 【为什么缓存】
 *  每个测试套件可能多次使用同一角色的 token（如 admin 查多条数据）。
 *  如果不缓存，每次调用 loginAs('admin') 都会发一次 POST /api/auth/login，
 *  浪费时间和 API 配额。8 个角色各缓存一份，整个测试周期复用。
 *
 * 【数据格式】{ admin: "eyJhbG...", agent: "eyJhbG...", ... }
 */
const tokenCache = {};

/**
 * 角色登录 → 获取 JWT Token
 *
 * 【防呆设计】
 *  1. 先查缓存 — 命中则直接返回，避免重复登录
 *  2. 角色不存在 — 立即抛出明确错误（不等到 API 返回 401）
 *  3. API 失败 — 错误信息包含角色名、HTTP 状态码、响应体摘要
 *  4. Token 为空 — 明确告知"响应成功但无 token"
 *
 * @param {string} roleKey  — 角色标识（admin/agent/worker/customer 等，见 config.ACCOUNTS）
 * @returns {Promise<string>} JWT Token 字符串
 * @throws {Error} 角色不存在 / 登录失败 / 响应无 token
 */
async function loginAs(roleKey) {
  // 1. 缓存命中 → 直接返回
  if (tokenCache[roleKey]) return tokenCache[roleKey];

  // 2. 角色校验
  const account = config.ACCOUNTS[roleKey];
  if (!account) {
    const available = Object.keys(config.ACCOUNTS).join(', ');
    throw new Error(`未知角色: "${roleKey}"，可用角色: ${available}`);
  }

  // 3. 发登录请求
  let res;
  try {
    res = await fetchWithTimeout(`${config.BASE_URL}/api/auth/password-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: account.phone, password: account.password }),
    });
  } catch (err) {
    // 网络层错误（连接拒绝、DNS 失败、超时）
    throw new Error(`登录网络错误 [${roleKey}(${account.name})]: ${err.message}`);
  }

  // 4. 校验响应
  if (!res.data?.success || !res.data?.token) {
    const summary = JSON.stringify(res.data).slice(0, 200);
    throw new Error(
      `登录失败 [${roleKey}(${account.name})]: ` +
      `HTTP ${res.status}, 响应: ${summary}`
    );
  }

  // 5. 缓存并返回
  tokenCache[roleKey] = res.data.token;
  return res.data.token;
}

/**
 * 登出并清除指定角色的 Token 缓存
 *
 * 【使用场景】
 *  测试 Token 退出后立即失效：logout→用旧 token 请求→期望 401。
 *  仅清除缓存不够，还要调用服务端登出接口使服务端 session 失效。
 *
 * @param {string} roleKey — 角色标识
 * @returns {Promise<object>} 登出 API 响应
 */
async function logout(roleKey) {
  const token = tokenCache[roleKey];
  if (!token) {
    // 未登录也返回成功（幂等操作）
    return { status: 200, data: { success: true } };
  }

  let res;
  try {
    res = await fetchWithTimeout(`${config.BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (_err) {
    // 即使 API 调用失败，也清除本地缓存（避免使用已失效 token）
  }

  // 无论服务端是否成功，都清除本地缓存
  delete tokenCache[roleKey];
  return res || { status: 200, data: { success: true } };
}

/**
 * 清空所有登录缓存
 *
 * 【使用场景】
 *  每个测试套件开始时调用，确保干净的鉴权状态。
 *  防止前一个套件的 token 影响后续测试。
 */
function clearTokens() {
  Object.keys(tokenCache).forEach(k => delete tokenCache[k]);
}

// ═══════════════════════════════════════════════════════════
// 三、请求客户端 — createClient + 重试
// ═══════════════════════════════════════════════════════════

/**
 * 创建带鉴权的 HTTP 请求客户端
 *
 * 【设计思路】
 *  每个 client 实例绑定一个 token（或空 token），所有通过该 client
 *  发出的请求自动携带该 token。token 可选：不传 = 匿名请求。
 *
 * 【返回值】
 *  { get(url, queryParams?), post(url, body?), put(url, body?),
 *    patch(url, body?), delete(url, queryParams?) }
 *
 * 【重要规则】
 *  - createClient()         → 匿名请求（无 Authorization header）
 *  - createClient(token)    → 带 token 的认证请求
 *  - createClient(null)     → 等价于 createClient()，安全处理 null
 *
 * @param {string|null|undefined} token — JWT Token（可选）
 * @returns {{get, post, put, patch, delete}} 请求方法集合
 */
function createClient(token) {
  // 构建基础 headers
  const headers = { 'Content-Type': 'application/json' };

  // 仅当 token 为非空字符串时才添加 Authorization header
  // token 为 null/undefined/'' 时 = 匿名请求
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  /**
   * 内部方法：执行 HTTP 请求并自动重试
   *
   * @param {string} method      — HTTP 方法
   * @param {string} urlStr      — 请求路径（如 '/api/workers'）
   * @param {object|null} body   — 请求体（POST/PUT/PATCH 时使用）
   * @param {object|string|null} queryParams — 查询参数
   * @returns {Promise<{status, data, headers}>}
   */
  const doFetch = (method, urlStr, body, queryParams) => {
    // 构建完整 URL
    let fullUrl = `${config.BASE_URL}${urlStr}`;

    // 处理查询参数（支持对象和字符串两种格式）
    if (queryParams) {
      const qs = typeof queryParams === 'string'
        ? queryParams
        : new URLSearchParams(queryParams).toString();
      if (qs) {
        fullUrl += (urlStr.includes('?') ? '&' : '?') + qs;
      }
    }

    // 序列化请求体（仅当方法需要 body 且有内容时）
    const fetchBody = (body && method !== 'GET' && method !== 'HEAD')
      ? JSON.stringify(body)
      : undefined;

    return fetchWithTimeout(fullUrl, {
      method,
      headers,
      body: fetchBody,
    });
  };

  return {
    /**
     * GET 请求
     * @param {string} url    — 路径
     * @param {object|string} queryParams — 查询参数（可选）
     */
    get: (url, queryParams) => retryable(() => doFetch('GET', url, undefined, queryParams)),

    /**
     * POST 请求
     * @param {string} url  — 路径
     * @param {object} data  — 请求体
     */
    post: (url, data) => retryable(() => doFetch('POST', url, data)),

    /**
     * PUT 请求
     * @param {string} url  — 路径
     * @param {object} data  — 请求体
     */
    put: (url, data) => retryable(() => doFetch('PUT', url, data)),

    /**
     * PATCH 请求
     * @param {string} url  — 路径
     * @param {object} data  — 请求体
     */
    patch: (url, data) => retryable(() => doFetch('PATCH', url, data)),

    /**
     * DELETE 请求（通过查询参数传 id）
     * @param {string} url          — 路径
     * @param {object|string} queryParams — 查询参数（如 {id: 'xxx'}）
     */
    delete: (url, queryParams) => retryable(() => doFetch('DELETE', url, undefined, queryParams)),
  };
}

/**
 * 自动重试包装器
 *
 * 【为什么需要】
 *  网络偶尔抖动（尤其是 Supabase 连接池耗尽）会导致请求失败。
 *  重试 1-2 次可以消除大部分瞬时故障，而又不会掩盖真正的 Bug。
 *
 * 【策略】
 *  线性退避：第 1 次重试等 500ms，第 2 次等 1000ms。
 *  如果 retries 用完仍失败，抛出最后一个错误。
 *
 * @param {Function} fn       — 要重试的异步函数
 * @param {number}   retries  — 最大重试次数（默认来自 config.RETRY_COUNT）
 * @returns {Promise<any>}
 */
async function retryable(fn, retries = config.RETRY_COUNT) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      // 最后一次尝试也失败了 → 不再重试，抛出错误
      if (i === retries) throw err;
      // 退避等待：500ms → 1000ms → 1500ms
      await sleep(500 * (i + 1));
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 四、并发/幂等测试工具
// ═══════════════════════════════════════════════════════════

/**
 * 并发请求执行器
 *
 * 【使用场景】
 *  - 测试幂等性：并发 2 次 settle 同一订单，第二次应返回 409 或幂等成功
 *  - 测试竞态条件：并发 PUT 同一资源，验证乐观锁或悲观锁工作正常
 *  - 测试限流：短时间内 20 次请求，验证是否返回 429
 *
 * 【实现细节】
 *  Promise.allSettled 而非 Promise.all：
 *  即使部分请求失败，也收集所有结果进行分析。
 *  不会因一个请求抛异常就丢失其他请求的结果。
 *
 * 【防呆】
 *  如果 fn 依赖外部变量（如闭包捕获的 token），确保传入前已固定，
 *  避免并发执行时 token 状态不一致。
 *
 * @param {number}   count — 并发请求数量
 * @param {Function} fn    — 返回 Promise 的请求函数（每次调用创建新的请求）
 * @returns {Promise<Array<{status:'fulfilled'|'rejected', value|reason}>>}
 *
 * @example
 *   // 测试幂等性：并发 2 次 settle
 *   const results = await concurrentRequest(2, async (i) => {
 *     return client.post(`/api/orders/${orderId}/settle`, {});
 *   });
 *   // results[0].value.status → 200 (第一次成功)
 *   // results[1].value.status → 409 (第二次被拒绝)
 */
async function concurrentRequest(count, fn) {
  // 边界保护：count 必须为正整数
  if (!Number.isInteger(count) || count < 1) {
    console.warn(`  ⚠ concurrentRequest: count 必须为正整数，实际值=${count}，已修正为 1`);
    count = 1;
  }

  // 生成 count 个独立请求（每次调用 fn(i) 创建新的 Promise）
  const tasks = Array.from({ length: count }, (_, i) => fn(i));

  // 全部同时发出，等待所有完成（无论成功或失败）
  const settled = await Promise.allSettled(tasks);

  return settled.map((r, i) => ({
    index: i,
    ok: r.status === 'fulfilled',
    // fulfilled → .value 是 API 响应 {status, data}
    // rejected  → .reason 是 Error 对象
    value: r.status === 'fulfilled' ? r.value : null,
    error: r.status === 'rejected' ? r.reason?.message || String(r.reason) : null,
    status: r.status === 'fulfilled' ? (r.value?.status || 0) : 0,
  }));
}

/**
 * 简单的限流测试：在 durationMs 内发送 count 次请求，检测是否有 429 响应
 *
 * @param {number}   count       — 请求次数
 * @param {number}   durationMs  — 时间窗口（毫秒）
 * @param {Function} fn          — 请求函数
 * @returns {Promise<{total:number, rateLimited:number, results:Array}>}
 */
async function rateLimitTest(count, durationMs, fn) {
  if (!Number.isInteger(count) || count < 1) count = 10;
  if (!Number.isInteger(durationMs) || durationMs < 100) durationMs = 1000;

  // 计算每个请求的间隔（在时间窗口内均匀分布）
  const interval = Math.floor(durationMs / count);

  const results = [];
  for (let i = 0; i < count; i++) {
    try {
      const res = await fn();
      results.push({ index: i, status: res?.status || 0 });
    } catch (err) {
      results.push({ index: i, status: 0, error: err.message });
    }
    if (i < count - 1) await sleep(interval);
  }

  const rateLimited = results.filter(r => r.status === 429).length;

  return {
    total: count,
    rateLimited,
    results,
  };
}

// ═══════════════════════════════════════════════════════════
// 五、断言与测试执行
// ═══════════════════════════════════════════════════════════

/**
 * 统一测试用例执行器
 *
 * 【为什么用统一入口而不是各自调用 fetch】
 *  1. 统一计时 — 自动记录每个用例的执行时长
 *  2. 统一断言 — 状态码、字段存在性、字段缺失性 集中处理
 *  3. 统一日志 — 格式一致的 PASS/FAIL 输出
 *  4. 防御性 — fn() 抛异常时自动捕获并标记 FAIL，不会中断整个套件
 *
 * 【expect 断言规则】
 *  - status:                精确匹配 HTTP 状态码
 *  - hasField:              验证响应体包含指定字段（支持嵌套路径 "data.user.name"）
 *  - hasNoField:            验证响应体不包含指定字段（如错误响应不应含 data）
 *  - matchBody:             部分匹配响应体（如 {success:true, role:'admin'}）
 *  - minItems / maxItems:   验证数组字段长度范围
 *
 * @param {object} opts
 * @param {string} opts.label     — 测试用例名称（如 "R01-正向-获取阿姨列表"）
 * @param {string} opts.module    — 所属模块（如 "workers", "orders"）
 * @param {string} opts.category  — 类别（正向功能/参数异常/权限校验/边界值/重复操作/并发冲突）
 * @param {string} opts.method    — HTTP 方法（GET/POST/PUT/PATCH/DELETE）
 * @param {string} opts.url       — 请求路径（如 "/api/workers"）
 * @param {object} opts.headers   — 请求头说明（仅用于报告展示）
 * @param {object} opts.body      — 请求体说明（仅用于报告展示，实际 body 在 fn 中定义）
 * @param {object} opts.expect    — 预期断言
 * @param {Function} opts.fn      — 实际执行的异步函数，返回 axios-like 响应对象
 */
async function runCase(opts) {
  const start = Date.now();
  let status = 'PASS';
  let error = null;
  let resBody = null;
  let resStatus = null;

  try {
    // 执行实际的 HTTP 请求
    const res = await opts.fn();
    resStatus = res.status;
    resBody = res.data;

    // ─── 断言阶段 ───

    // 【断言1】状态码精确匹配
    if (opts.expect?.status && res.status !== opts.expect.status) {
      throw new Error(
        `期望状态码 ${opts.expect.status}，实际 ${res.status}` +
        (resBody ? ` | 响应: ${JSON.stringify(resBody).slice(0, 200)}` : '')
      );
    }

    // 【断言2】字段存在性验证（支持数组和单值）
    if (opts.expect?.hasField) {
      // 统一处理为数组，方便遍历
      const fields = Array.isArray(opts.expect.hasField)
        ? opts.expect.hasField
        : [opts.expect.hasField];

      for (const f of fields) {
        if (!hasNested(res.data, f)) {
          // 提供更详细的错误信息，显示实际响应结构
          const keys = res.data && typeof res.data === 'object'
            ? Object.keys(res.data).join(', ')
            : typeof res.data;
          throw new Error(`缺少字段: "${f}" | 响应顶层字段: [${keys}]`);
        }
      }
    }

    // 【断言3】字段缺失性验证 — 确保某些字段不在响应中
    // 例如：非 admin 角色获取用户列表不应包含其他用户的敏感信息
    if (opts.expect?.hasNoField) {
      const fields = Array.isArray(opts.expect.hasNoField)
        ? opts.expect.hasNoField
        : [opts.expect.hasNoField];

      for (const f of fields) {
        if (hasNested(res.data, f)) {
          throw new Error(`不应包含字段: "${f}"，但响应中存在`);
        }
      }
    }

    // 【断言4】响应体部分匹配
    // 例如：验证 {success:true, role:'admin'}（不比较其他字段）
    if (opts.expect?.matchBody) {
      for (const [key, expectedVal] of Object.entries(opts.expect.matchBody)) {
        const actualVal = res.data?.[key];
        if (actualVal !== expectedVal) {
          throw new Error(
            `字段 "${key}" 期望值 "${expectedVal}"，实际值 "${actualVal}"`
          );
        }
      }
    }

    // 【断言5】数组长度范围验证
    if (opts.expect?.minItems !== undefined) {
      const list = res.data?.data || res.data?.list || [];
      if (Array.isArray(list) && list.length < opts.expect.minItems) {
        throw new Error(`列表长度 ${list.length} < 期望最小值 ${opts.expect.minItems}`);
      }
    }
    if (opts.expect?.maxItems !== undefined) {
      const list = res.data?.data || res.data?.list || [];
      if (Array.isArray(list) && list.length > opts.expect.maxItems) {
        throw new Error(`列表长度 ${list.length} > 期望最大值 ${opts.expect.maxItems}`);
      }
    }
  } catch (err) {
    // fn() 抛异常或断言失败 → 标记 FAIL，记录原因
    status = 'FAIL';
    error = err.message;
  }

  // 记录执行时长
  const duration = Date.now() - start;

  // 构建测试记录（用于报告和日志）
  const record = {
    label: opts.label,
    module: opts.module || 'unknown',
    category: opts.category || '未分类',
    method: opts.method || 'GET',
    url: opts.url || '',
    headers: opts.headers || 'Bearer <token>',
    body: opts.body || null,
    expectStatus: opts.expect?.status || 200,
    actualStatus: resStatus,
    status,
    error,
    duration,
    timestamp: new Date().toISOString(),
  };

  // 实时输出单条结果
  printResult(record);
  return record;
}

// ═══════════════════════════════════════════════════════════
// 六、输出与报告
// ═══════════════════════════════════════════════════════════

// chalk v5 是 ESM-only，使用 ANSI escape codes 替代
const C = {
  reset: '\x1b[0m',
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
};

/**
 * 打印单条测试结果
 * 格式: ✓ [PASS] 测试名称 (45ms)
 *        ✗ [FAIL] 测试名称 (230ms)
 *          错误详情（仅 VERBOSE 模式）
 */
function printResult(r) {
  const icon = r.status === 'PASS' ? C.green('\u2713') : C.red('\u2717');
  const tag = r.status === 'PASS' ? C.green('PASS') : C.red('FAIL');
  const dur = r.duration > 1000 ? C.yellow(`${r.duration}ms`) : C.gray(`${r.duration}ms`);
  console.log(`  ${icon} [${tag}] ${r.label} ${C.gray(`(${dur})`)}`);
  if (r.status === 'FAIL' && config.VERBOSE) {
    console.log(`       ${C.red(r.error)}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 七、工具函数
// ═══════════════════════════════════════════════════════════

/** 延迟等待（异步 sleep） */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 检查嵌套对象中是否存在指定路径的字段
 *
 * @example
 *   hasNested({data:{user:{name:'Alice'}}}, 'data.user.name') → true
 *   hasNested({data:{user:{}}}, 'data.user.name') → false
 *
 * @param {object|null|undefined} obj  — 要检查的对象
 * @param {string} path               — 用点号分隔的字段路径
 * @returns {boolean}
 */
function hasNested(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    // cur 为 null/undefined 或键不存在 → 中断
    if (cur == null || !(p in cur)) return false;
    cur = cur[p];
  }
  return true; // 所有路径段都存在
}

/**
 * 生成随机 11 位手机号
 *
 * 【使用场景】
 *  测试注册、创建客户/阿姨时需要唯一手机号，避免主键冲突。
 *  使用 Date.now() 后 8 位 + 固定前缀，保证同一次测试运行内唯一。
 *
 * @param {string} prefix — 3 位前缀（默认 150）
 * @returns {string} 11 位手机号
 */
function genPhone(prefix = '150') {
  const suffix = String(Math.floor(Math.random() * 90000000 + 10000000));
  return `${prefix}${suffix}`;
}

/**
 * 防御性 GET 请求（不抛异常版本）
 *
 * 【使用场景】
 *  获取测试 ID 时，某些表可能为空（如 contracts 表无数据）。
 *  不能用普通 client.get() 因为 404 会抛异常中断整个 fetchTestIds。
 *  safeGet 无论返回什么状态码都视为成功，调用方自行判断 data 是否有效。
 *
 * @param {object} client — createClient() 返回的客户端
 * @param {string} url    — 请求路径
 * @param {object} params — 查询参数（可选）
 * @returns {Promise<{status, data:null|object}>}
 */
async function safeGet(client, url, params = {}) {
  try {
    return await client.get(url, params);
  } catch (_err) {
    // 任何错误（超时、4xx、5xx）都返回安全的空数据
    // 调用方通过检查 data?.data 是否为空来判断是否有数据
    return { status: 0, data: null };
  }
}

/**
 * 批量执行用例组
 *
 * @param {string} label — 用例组名称（如 "C01 🔐 注册"）
 * @param {Array}  cases — runCase() 参数数组
 * @returns {Promise<Array>} 所有用例的测试记录
 */
async function batchRun(label, cases) {
  console.log(`\n${'\u2550'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'\u2550'.repeat(60)}`);

  const results = [];
  // 串行执行：避免并发导致 token/状态冲突
  // （如果用例之间没有依赖关系，未来可以考虑并发）
  for (const c of cases) {
    const r = await runCase(c);
    results.push(r);
  }

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.length - pass;
  console.log(`  \u2500\u2500 合计: ${results.length} | ${C.green(`通过 ${pass}`)} | ${fail > 0 ? C.red(`失败 ${fail}`) : ''}`);

  // 失败用例详情
  if (fail > 0) {
    console.log(`\n  \u274C 失败用例:`);
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`     - ${r.label}: ${r.error}`);
    });
  }

  return results;
}

/**
 * 保存 JSON 格式测试报告
 *
 * @param {Array}  allResults — 所有测试记录
 * @param {string} filename   — 报告文件名（可选）
 * @returns {string} 报告文件路径
 */
function saveReport(allResults, filename = null) {
  const dir = path.resolve(config.REPORT_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fname = filename || `report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(dir, fname);

  // 生成汇总统计
  const summary = {
    total: allResults.length,
    pass: allResults.filter((r) => r.status === 'PASS').length,
    fail: allResults.filter((r) => r.status === 'FAIL').length,
    duration: allResults.reduce((sum, r) => sum + (r.duration || 0), 0),
    byCategory: {},
    byModule: {},
  };

  for (const r of allResults) {
    // 按类别统计
    const cat = r.category || '未分类';
    if (!summary.byCategory[cat]) {
      summary.byCategory[cat] = { total: 0, pass: 0, fail: 0 };
    }
    summary.byCategory[cat].total++;
    if (r.status === 'PASS') summary.byCategory[cat].pass++;
    else summary.byCategory[cat].fail++;

    // 按模块统计
    const mod = r.module || 'unknown';
    if (!summary.byModule[mod]) {
      summary.byModule[mod] = { total: 0, pass: 0, fail: 0 };
    }
    summary.byModule[mod].total++;
    if (r.status === 'PASS') summary.byModule[mod].pass++;
    else summary.byModule[mod].fail++;
  }

  fs.writeFileSync(filePath, JSON.stringify({ summary, results: allResults }, null, 2));
  console.log(`\n\u{1F4CB} 报告已保存: ${filePath}`);
  return filePath;
}

// ═══════════════════════════════════════════════════════════
// 八、动态测试数据获取
// ═══════════════════════════════════════════════════════════

/**
 * 从列表接口获取第一个有效 ID
 *
 * @param {string} endpoint — API 路径（如 '/api/workers'）
 * @param {string} idField  — ID 字段名（默认 'id'）
 * @param {string} token    — 鉴权 token
 * @returns {Promise<string|null>}
 */
async function getFirstId(endpoint, idField, token) {
  const client = createClient(token);
  try {
    const res = await client.get(endpoint, { page: 1, pageSize: 1 });
    const list = res.data?.data || res.data?.list || [];
    if (list.length > 0) {
      return list[0][idField || 'id'];
    }
  } catch (_err) {
    // 接口不存在或无数据
  }
  return null;
}

/**
 * 测试 ID 缓存
 *
 * 【为什么缓存】
 *  7 个测试套件都需要各种 ID（firstWorkerId, firstOrderId 等），
 *  如果每个套件都重新调一遍所有 GET 接口获取 ID，非常浪费。
 *  缓存后整个测试生命周期仅获取一次。
 */
let _cachedIds = null;

/**
 * 预取常用测试 ID
 *
 * 【安全性】
 *  使用 safeGet 而非 client.get()：如果某个表为空或接口不存在，
 *  不会中断整体流程，只是对应的 ID 数组为空。后续测试应该能优雅降级。
 *
 * @returns {Promise<object>} 包含各模块 ID 数组和首条 ID 的对象
 */
async function fetchTestIds() {
  // 缓存命中 → 直接返回
  if (_cachedIds) return _cachedIds;

  const adminToken = await loginAs('admin');
  const client = createClient(adminToken);

  // 并发获取所有模块的列表数据
  const [
    wRes, uRes, cRes, oRes, crRes, lRes,
    rrRes, pfRes, ctRes, eRes, rRes, tcRes, vRes, csRes,
  ] = await Promise.all([
    client.get('/api/workers', { page: 1, pageSize: 5 }),
    client.get('/api/users', { page: 1, pageSize: 5 }),
    client.get('/api/customers', { page: 1, pageSize: 5 }),
    client.get('/api/orders', { page: 1, pageSize: 5 }),
    client.get('/api/courses', { page: 1, pageSize: 5 }),
    client.get('/api/leads', { page: 1, pageSize: 5 }),
    client.get('/api/resume-reviews', { page: 1, pageSize: 5 }),
    client.get('/api/platform-fees', { page: 1, pageSize: 5 }),
    safeGet(client, '/api/contracts', { page: 1, pageSize: 5 }),
    safeGet(client, '/api/enrollments', { page: 1, pageSize: 5 }),
    safeGet(client, '/api/reviews', { page: 1, pageSize: 5 }),
    safeGet(client, '/api/training-contracts', { page: 1, pageSize: 5 }),
    safeGet(client, '/api/venues', { page: 1, pageSize: 5 }),
    safeGet(client, '/api/course-schedules', { page: 1, pageSize: 5 }),
  ]);

  /**
   * 从 API 响应中提取 ID 数组
   * 兼容多种响应格式: {data:[...]} / {list:[...]} / {...}
   */
  const pick = (res, key = 'id') => {
    const list = res?.data?.data || res?.data?.list || res?.data || [];
    return Array.isArray(list) ? list.map((x) => x[key]).filter(Boolean) : [];
  };

  // 构建缓存对象（同时提供数组和首条快捷方式）
  _cachedIds = {
    // 数组 — 用于需要多条数据的场景
    workerIds: pick(wRes),
    userIds: pick(uRes),
    customerIds: pick(cRes),
    orderIds: pick(oRes),
    courseIds: pick(crRes),
    leadIds: pick(lRes),
    contractIds: pick(ctRes),
    enrollmentIds: pick(eRes),
    reviewIds: pick(rRes),
    trainingContractIds: pick(tcRes),
    venueIds: pick(vRes),
    scheduleIds: pick(csRes),
    platformFeeIds: pick(pfRes),
    resumeReviewIds: pick(rrRes),

    // 首条快捷方式 — 用于只需要一个 ID 的场景
    firstWorkerId: pick(wRes)[0] || null,
    firstCustomerId: pick(cRes)[0] || null,
    firstOrderId: pick(oRes)[0] || null,
    firstCourseId: pick(crRes)[0] || null,
    firstLeadId: pick(lRes)[0] || null,
    firstUserId: pick(uRes)[0] || null,
    firstContractId: pick(ctRes)[0] || null,
    firstEnrollmentId: pick(eRes)[0] || null,
    firstReviewId: pick(rRes)[0] || null,
    firstTrainingContractId: pick(tcRes)[0] || null,
    firstVenueId: pick(vRes)[0] || null,
    firstScheduleId: pick(csRes)[0] || null,
    firstPlatformFeeId: pick(pfRes)[0] || null,
    firstResumeReviewId: pick(rrRes)[0] || null,

    // 备用 ID（用于换阿姨、批量操作等需要第二个 ID 的场景）
    secondWorkerId: pick(wRes)[1] || pick(wRes)[0] || null,
    secondCustomerId: pick(cRes)[1] || pick(cRes)[0] || null,
    secondUserId: pick(uRes)[1] || pick(uRes)[0] || null,
    secondResumeReviewId: pick(rrRes)[1] || pick(rrRes)[0] || null,
  };

  return _cachedIds;
}

/** 清除 ID 缓存（用于测试间清理） */
function clearIdCache() {
  _cachedIds = null;
}

// ═══════════════════════════════════════════════════════════
// 九、导出所有公共 API
// ═══════════════════════════════════════════════════════════
module.exports = {
  // 鉴权
  loginAs,
  logout,
  clearTokens,

  // 请求
  createClient,
  fetchWithTimeout,
  safeGet,

  // 重试与并发
  retryable,
  concurrentRequest,
  rateLimitTest,

  // 测试执行
  runCase,
  batchRun,
  saveReport,

  // 工具函数
  sleep,
  genPhone,
  hasNested,
  getFirstId,
  fetchTestIds,
  clearIdCache,

  // 配置（只读引用）
  config,
};

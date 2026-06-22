/**
 * 测试工具集：鉴权、请求封装、断言、日志
 */
const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// ─── Token 缓存（同一角色复用） ───
const tokenCache = {};

// ─── 角色 → token 映射 ───
async function loginAs(roleKey) {
  if (tokenCache[roleKey]) return tokenCache[roleKey];
  const account = config.ACCOUNTS[roleKey];
  if (!account) throw new Error(`未知角色: ${roleKey}`);

  const res = await axios.post(`${config.BASE_URL}/api/auth/password-login`, {
    phone: account.phone,
    password: account.password,
  }, { timeout: config.REQUEST_TIMEOUT, validateStatus: () => true });

  if (res.data?.success && res.data?.token) {
    tokenCache[roleKey] = res.data.token;
    return res.data.token;
  }
  throw new Error(`登录失败 [${roleKey}]: ${JSON.stringify(res.data)}`);
}

/** 清空所有登录缓存 */
function clearTokens() {
  Object.keys(tokenCache).forEach(k => delete tokenCache[k]);
}

// ─── 请求封装 ───
function createClient(token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const axiosOpts = {
    headers,
    timeout: config.REQUEST_TIMEOUT,
    validateStatus: () => true, // 不抛异常，让测试自行判断状态码
  };
  return {
    get: (url, params) => retryable(() =>
      axios.get(`${config.BASE_URL}${url}`, { ...axiosOpts, params })
    ),
    post: (url, data) => retryable(() =>
      axios.post(`${config.BASE_URL}${url}`, data, axiosOpts)
    ),
    put: (url, data) => retryable(() =>
      axios.put(`${config.BASE_URL}${url}`, data, axiosOpts)
    ),
    delete: (url, params) => retryable(() =>
      axios.delete(`${config.BASE_URL}${url}`, { ...axiosOpts, params })
    ),
  };
}

/** 自动重试 */
async function retryable(fn, retries = config.RETRY_COUNT) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      await sleep(500 * (i + 1));
    }
  }
}

// ─── 断言封装 ───
/**
 * 统一测试用例执行器
 * @param {object} opts
 * @param {string} opts.label      - 测试名称
 * @param {string} opts.module     - 所属模块
 * @param {string} opts.category   - 5大类之一
 * @param {string} opts.method     - HTTP方法
 * @param {string} opts.url        - 请求路径
 * @param {object} opts.headers    - 请求头说明
 * @param {object} opts.body       - 请求体
 * @param {object} opts.expect     - 预期 {status, hasField, noField, match*}
 * @param {function} opts.fn       - 实际执行函数
 */
async function runCase(opts) {
  const start = Date.now();
  let status = 'PASS';
  let error = null;
  let resBody = null;
  let resStatus = null;

  try {
    const res = await opts.fn();
    resStatus = res.status;
    resBody = res.data;

    // 状态码断言
    if (opts.expect?.status && res.status !== opts.expect.status) {
      throw new Error(`期望状态码 ${opts.expect.status}，实际 ${res.status}`);
    }
    // 字段存在断言
    if (opts.expect?.hasField) {
      for (const f of [].concat(opts.expect.hasField)) {
        if (!hasNested(res.data, f)) throw new Error(`缺少字段: ${f}`);
      }
    }
  } catch (err) {
    status = 'FAIL';
    error = err.response
      ? `[${err.response.status}] ${JSON.stringify(err.response.data).slice(0, 200)}`
      : err.message;
    resStatus = err.response?.status;
    resBody = err.response?.data;
  }

  const duration = Date.now() - start;
  const record = {
    label: opts.label,
    module: opts.module,
    category: opts.category,
    method: opts.method,
    url: opts.url,
    headers: opts.headers || 'Bearer <token>',
    body: opts.body || null,
    expectStatus: opts.expect?.status || 200,
    actualStatus: resStatus,
    status,
    error,
    duration,
    timestamp: new Date().toISOString(),
  };

  printResult(record);
  return record;
}

// chalk v5 is ESM-only, use ANSI escape codes instead
const C = {
  reset: '\x1b[0m',
  red: s => `\x1b[31m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  gray: s => `\x1b[90m${s}\x1b[0m`,
};

/** 打印单条结果 */
function printResult(r) {
  const c = C;
  const icon = r.status === 'PASS' ? c.green('✓') : c.red('✗');
  const tag = r.status === 'PASS' ? c.green('PASS') : c.red('FAIL');
  const dur = r.duration > 1000 ? c.yellow(`${r.duration}ms`) : c.gray(`${r.duration}ms`);
  console.log(`  ${icon} [${tag}] ${r.label} ${c.gray(`(${dur})`)}`);
  if (r.status === 'FAIL' && config.VERBOSE) {
    console.log(`       ${c.red(r.error)}`);
  }
}

// ─── 工具函数 ───
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function hasNested(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

/** 批量执行用例 */
async function batchRun(label, cases) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'═'.repeat(60)}`);

  const results = [];
  for (const c of cases) {
    for (let i = 0; i < config.PARALLEL_LIMIT && cases.indexOf(c) + i < cases.length; i++) {
      // 串行执行避免并发token问题
    }
    const r = await runCase(c);
    results.push(r);
  }

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.length - pass;
  console.log(`  ── 合计: ${results.length} | ${C.green(`通过 ${pass}`)} | ${fail > 0 ? C.red(`失败 ${fail}`) : ''}`);

  // 失败详情
  if (fail > 0) {
    console.log(`\n  ❌ 失败用例:`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`     - ${r.label}: ${r.error}`);
    });
  }

  return results;
}

/** 保存测试报告 */
function saveReport(allResults, filename = null) {
  const dir = path.resolve(config.REPORT_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fname = filename || `report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(dir, fname);

  const summary = {
    total: allResults.length,
    pass: allResults.filter(r => r.status === 'PASS').length,
    fail: allResults.filter(r => r.status === 'FAIL').length,
    byCategory: {},
    byModule: {},
  };

  for (const r of allResults) {
    summary.byCategory[r.category] = (summary.byCategory[r.category] || 0) + 1;
    summary.byModule[r.module] = (summary.byModule[r.module] || 0) + 1;
  }

  fs.writeFileSync(filePath, JSON.stringify({ summary, results: allResults }, null, 2));
  console.log(`\n📋 报告已保存: ${filePath}`);
  return filePath;
}

// ─── 动态数据获取 ───
/** 从列表接口获取第一个有效ID */
async function getFirstId(endpoint, idField, token) {
  const client = createClient(token);
  const res = await client.get(endpoint, { page: 1, pageSize: 1 });
  const list = res.data?.data || res.data?.list || [];
  if (list.length > 0) {
    return list[0][idField || 'id'];
  }
  return null;
}

/** 预取常用ID（缓存） */
let _cachedIds = null;
async function fetchTestIds() {
  if (_cachedIds) return _cachedIds;
  const adminToken = await loginAs('admin');
  const client = createClient(adminToken);

  const safeGet = async (url, params = {}) => {
    try {
      return await client.get(url, params);
    } catch { return { data: null }; }
  };

  const [wRes, uRes, cRes, oRes, crRes, lRes,
         ctRes, eRes, rRes, tcRes, vRes, csRes, pfRes, rrRes] = await Promise.all([
    client.get('/api/workers', { page: 1, pageSize: 5 }),
    client.get('/api/users', { page: 1, pageSize: 5 }),
    client.get('/api/customers', { page: 1, pageSize: 5 }),
    client.get('/api/orders', { page: 1, pageSize: 5 }),
    client.get('/api/courses', { page: 1, pageSize: 5 }),
    client.get('/api/leads', { page: 1, pageSize: 5 }),
    safeGet('/api/contracts', { page: 1, pageSize: 5 }),
    safeGet('/api/enrollments', { page: 1, pageSize: 5 }),
    safeGet('/api/reviews', { page: 1, pageSize: 5 }),
    safeGet('/api/training-contracts', { page: 1, pageSize: 5 }),
    safeGet('/api/venues', { page: 1, pageSize: 5 }),
    safeGet('/api/course-schedules', { page: 1, pageSize: 5 }),
    safeGet('/api/platform-fees', { page: 1, pageSize: 5 }),
    safeGet('/api/resume-reviews', { page: 1, pageSize: 5 }),
  ]);

  const pick = (res, key) => {
    const list = res?.data?.data || res?.data?.list || res?.data || [];
    return Array.isArray(list) ? list.map(x => x[key || 'id']).filter(Boolean) : [];
  };

  _cachedIds = {
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
    secondWorkerId: pick(wRes)[1] || pick(wRes)[0] || null,
    secondCustomerId: pick(cRes)[1] || pick(cRes)[0] || null,
    secondUserId: pick(uRes)[1] || pick(uRes)[0] || null,
    secondResumeReviewId: pick(rrRes)[1] || pick(rrRes)[0] || null,
  };

  return _cachedIds;
}

/** 清除ID缓存 */
function clearIdCache() {
  _cachedIds = null;
}

module.exports = {
  loginAs, clearTokens, createClient, runCase, batchRun, saveReport, sleep,
  getFirstId, fetchTestIds, clearIdCache,
  config,
};

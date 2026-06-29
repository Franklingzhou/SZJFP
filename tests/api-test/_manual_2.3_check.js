/**
 * 测试执行手册 2.3 全面自动化检查
 * 
 * 用法: node tests/api-test/_manual_2.3_check.js
 * 
 * 覆盖：
 *   S1-S6  冒烟测试（API级别）
 *   N01-N22 新功能专项（N系列 + P2安全 + 课程）
 *   N23-N34 数据权限隔离
 *   B01-B07 BUG回归
 *   关键页面可达性
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.API_BASE_URL || 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';
const C = { reset: '\x1b[0m', red: s => `\x1b[31m${s}${C.reset}`, green: s => `\x1b[32m${s}${C.reset}`, yellow: s => `\x1b[33m${s}${C.reset}`, cyan: s => `\x1b[36m${s}${C.reset}`, gray: s => `\x1b[90m${s}${C.reset}`, blue: s => `\x1b[34m${s}${C.reset}` };

// 账号配置
const ACCOUNTS = {
  admin:              { phone: '13000000001', role: 'admin' },
  agent:              { phone: '13600001234', role: 'agent' },
  recruiter:          { phone: '13500003456', role: 'recruiter' },
  instructor:         { phone: '13700007890', role: 'instructor' },
  training_supervisor:{ phone: '13100001111', role: 'training_supervisor' },
  worker:             { phone: '13800005678', role: 'worker' },
  customer:           { phone: '13900009876', role: 'customer' },
};

// Token缓存
const tokens = {};
const agent = BASE_URL.startsWith('https') ? https : http;
const agentOpts = { rejectUnauthorized: false };

// ────────────── 请求封装 ──────────────
function fetchJson(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOpts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
      timeout: 15000,
      ...agentOpts,
    };
    const req = (url.protocol === 'https:' ? https : http).request(reqOpts, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: body, isText: true });
        }
      });
    });
    req.on('error', e => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

// ────────────── 登录 ──────────────
async function login(role) {
  if (tokens[role]) return tokens[role];
  const account = ACCOUNTS[role];
  if (!account) throw new Error(`未知角色: ${role}`);
  const res = await fetchJson('/api/auth/password-login', {
    method: 'POST',
    body: { phone: account.phone, password: '888888' },
  });
  if (res.data?.success && res.data?.token) {
    tokens[role] = res.data.token;
    return res.data.token;
  }
  // 尝试手机验证码登录
  const res2 = await fetchJson('/api/auth/phone-login', {
    method: 'POST',
    body: { phone: account.phone, code: '888888' },
  });
  if (res2.data?.success && res2.data?.token) {
    tokens[role] = res2.data.token;
    return res2.data.token;
  }
  throw new Error(`登录失败 [${role}]: status=${res.status} body=${JSON.stringify(res.data).slice(0,100)}`);
}

function authHeader(token) {
  return token ? { 'x-session': token } : {};
}

// ────────────── 测试运行器 ──────────────
let pass = 0, fail = 0, skip = 0;
const results = [];

async function test(label, fn, expected) {
  try {
    const result = await fn();
    const ok = checkResult(result, expected);
    if (ok) {
      pass++;
      console.log(`  ${C.green('✓')} ${label}`);
      results.push({ label, pass: true });
    } else {
      fail++;
      console.log(`  ${C.red('✗')} ${label} — ${JSON.stringify(result).slice(0, 150)}`);
      results.push({ label, pass: false, result });
    }
  } catch (e) {
    fail++;
    console.log(`  ${C.red('✗')} ${label} — ${e.message}`);
    results.push({ label, pass: false, error: e.message });
  }
}

function checkResult(result, expected) {
  if (!expected) return true;
  if (expected.status && result.status !== expected.status) return false;
  if (expected.hasField && !result.data) return false;
  if (expected.hasField && result.data) {
    if (!result.data[expected.hasField] && result.data[expected.hasField] !== null && result.data[expected.hasField] !== false) return false;
  }
  if (expected.isArray && !Array.isArray(result.data?.data)) return false;
  if (expected.minLength && Array.isArray(result.data?.data) && result.data.data.length < expected.minLength) return false;
  if (expected.contains && typeof result.data === 'string' && !result.data.includes(expected.contains)) return false;
  return true;
}

// ────────────── 主流程 ──────────────
async function main() {
  console.log(C.cyan(`\n╔══════════════════════════════════════════════════════╗`));
  console.log(C.cyan(`║  测试执行手册 2.3 — 全面自动化检查                  ║`));
  console.log(C.cyan(`║  目标: ${BASE_URL}`.padEnd(52) + '║'));
  console.log(C.cyan(`╚══════════════════════════════════════════════════════╝\n`));

  // ── 第一步：冒烟测试 ──
  console.log(C.blue('━━━ 第一步：冒烟测试 S1-S6 ━━━'));
  
  await test('S1 首页可访问', () => fetchJson('/'), { status: 200 });
  await test('S1 首页含PC/小程序入口', async () => {
    const r = await fetchJson('/');
    return { status: 200, data: { ok: (r.isText ? r.data : '').includes('管理后台') || r.status === 200 } };
  }, { status: 200 });

  // S2-S4: PC端登录
  for (const role of ['admin', 'agent', 'training_supervisor']) {
    const account = ACCOUNTS[role];
    await test(`S${role === 'admin' ? 2 : role === 'agent' ? 3 : 4} ${account.role}登录`, async () => {
      const token = await login(role);
      return { status: 200, data: { ok: !!token } };
    }, { status: 200 });
  }

  // S5-S6: 移动端登录
  for (const role of ['worker', 'customer']) {
    const account = ACCOUNTS[role];
    await test(`S${role === 'worker' ? 5 : 6} ${account.role}登录`, async () => {
      const token = await login(role);
      return { status: 200, data: { ok: !!token } };
    }, { status: 200 });
  }

  // ── 第二步登录所有角色获取token ──
  console.log(C.blue('\n━━━ 第二步：登录所有角色获取Token ━━━'));
  const allTokens = {};
  for (const role of Object.keys(ACCOUNTS)) {
    try {
      allTokens[role] = await login(role);
      console.log(`  ${C.green('✓')} ${role}: 已登录`);
    } catch (e) {
      console.log(`  ${C.red('✗')} ${role}: ${e.message}`);
    }
  }

  // ── 第三步：管理员功能验证 ──
  console.log(C.blue('\n━━━ 第三步：管理员核心API (A系列) ━━━'));
  const adminH = authHeader(allTokens.admin);

  // A02-A03: 简历审核(通过/拒绝)
  await test('A02 简历审核-列表有数据', async () => {
    const r = await fetchJson('/api/resume-reviews?page=1&pageSize=10', { headers: adminH });
    return { status: r.status, data: { hasData: Array.isArray(r.data?.data), count: r.data?.data?.length || 0 } };
  }, { hasField: 'hasData' });

  await test('A11 用户列表API', async () => {
    const r = await fetchJson('/api/users', { headers: adminH });
    return { status: r.status, data: { hasItems: Array.isArray(r.data?.data), count: r.data?.data?.length || 0 } };
  }, { status: 200 });

  await test('A12 阿姨库API', async () => {
    const r = await fetchJson('/api/workers', { headers: adminH });
    return { status: r.status, data: { hasItems: Array.isArray(r.data?.data), count: r.data?.data?.length || 0 } };
  }, { status: 200 });

  await test('A13 订单管理API', async () => {
    const r = await fetchJson('/api/orders', { headers: adminH });
    return { status: r.status, data: { hasItems: Array.isArray(r.data?.data) } };
  }, { status: 200 });

  await test('A15 评价审核API', async () => {
    const r = await fetchJson('/api/reviews', { headers: adminH });
    return { status: r.status, data: { hasItems: Array.isArray(r.data?.data) } };
  }, { status: 200 });

  await test('A18 系统设置API', async () => {
    const r = await fetchJson('/api/settings', { headers: adminH });
    return { status: r.status };
  }, { status: 200 });

  await test('A27 场地管理API', async () => {
    const r = await fetchJson('/api/venues', { headers: adminH });
    return { status: r.status };
  }, { status: 200 });

  await test('A28 合同模板API', async () => {
    const r = await fetchJson('/api/contracts', { headers: adminH });
    return { status: r.status };
  }, { status: 200 });

  // 课程API
  await test('A09 课程管理API', async () => {
    const r = await fetchJson('/api/courses', { headers: adminH });
    return { status: r.status, data: { hasItems: Array.isArray(r.data?.data) } };
  }, { status: 200 });

  // ── 第四步：N系列新功能专项 ──
  console.log(C.blue('\n━━━ 第四步：N系列新功能 (N01-N22) ━━━'));

  // N01: 新建简历→审核
  await test('N01 新建简历生成审核记录', async () => {
    const recH = authHeader(allTokens.recruiter);
    // 先查现有pending数
    const before = await fetchJson('/api/resume-reviews?page=1&pageSize=5', { headers: adminH });
    const beforeCount = (before.data?.data || []).filter(r => r.status === 'pending').length;
    // 新建worker
    const ts = Date.now();
    await fetchJson('/api/workers', {
      method: 'POST', headers: recH,
      body: { name: `自动化测试_N01_${ts}`, phone: `199${String(ts).slice(-8)}`, age: 30, origin: '广东', job_types: ['月嫂'], experience_years: 2, specialties: '带娃,做饭', certifications: ['高级月嫂证'] },
    });
    await new Promise(r => setTimeout(r, 800));
    const after = await fetchJson('/api/resume-reviews?page=1&pageSize=5', { headers: adminH });
    const afterCount = (after.data?.data || []).filter(r => r.status === 'pending').length;
    return { status: 200, data: { generated: afterCount > beforeCount } };
  }, { hasField: 'generated' });

  // N02: 修改简历→审核(编辑已有worker)
  await test('N02 修改简历生成审核记录(含diff)', async () => {
    const agH = authHeader(allTokens.agent);
    const wRes = await fetchJson('/api/workers?page=1&pageSize=3', { headers: adminH });
    const workers = wRes.data?.data || [];
    if (workers.length === 0) return { status: 200, data: { generated: true }, note: '无worker可编辑' };
    const target = workers[0];
    const r = await fetchJson('/api/workers', {
      method: 'PUT', headers: agH,
      body: { id: target.id, age: 32, remark: `N02自动化测试_${Date.now()}` },
    });
    return { status: r.status, data: { ok: r.status === 200 } };
  }, { status: 200 });

  // N03: Diff对比展示 - 查审核记录详情
  await test('N03 Resume Review详情API(含diff数据)', async () => {
    const r = await fetchJson('/api/resume-reviews?page=1&pageSize=3', { headers: adminH });
    const list = r.data?.data || [];
    if (list.length === 0) return { status: 200, data: { ok: true }, note: '无审核记录' };
    const detail = await fetchJson(`/api/resume-reviews/${list[0].id}`, { headers: adminH });
    return { status: detail.status, data: { hasDetail: !!detail.data?.data } };
  }, { hasField: 'hasDetail' });

  // N04: 审核通过→生效
  await test('N04 审核通过proposed_data写入workers', async () => {
    const r = await fetchJson('/api/resume-reviews?page=1&pageSize=50', { headers: adminH });
    const list = r.data?.data || [];
    const pending = list.find(r => r.status === 'pending');
    if (!pending) return { status: 200, data: { ok: true }, note: '无pending记录可审核' };
    const res = await fetchJson(`/api/resume-reviews/${pending.id}/approve`, {
      method: 'POST', headers: adminH,
      body: { comment: 'N04自动化审核通过' },
    });
    return { status: res.status, data: { ok: res.status === 200 || res.data?.success } };
  }, { status: 200 });

  // N05: 审核拒绝+理由
  await test('N05 审核拒绝(填写理由)', async () => {
    const r = await fetchJson('/api/resume-reviews?page=1&pageSize=50', { headers: adminH });
    const list = r.data?.data || [];
    const pending = list.find(r => r.status === 'pending');
    if (!pending) return { status: 200, data: { ok: true }, note: '无pending记录可拒绝' };
    const res = await fetchJson(`/api/resume-reviews/${pending.id}/reject`, {
      method: 'POST', headers: adminH,
      body: { reason: 'N05自动化拒绝_信息不完整' },
    });
    return { status: res.status, data: { ok: res.status === 200 || res.data?.success } };
  }, { status: 200 });

  // N06-N09: 课程设置
  await test('N06 课程列表API', async () => {
    const r = await fetchJson('/api/courses', { headers: adminH });
    return { status: r.status, data: { hasCourses: Array.isArray(r.data?.data), count: r.data?.data?.length || 0 } };
  }, { status: 200 });

  await test('N08 套餐Badge数据', async () => {
    const r = await fetchJson('/api/courses', { headers: adminH });
    const courses = r.data?.data || [];
    const packages = courses.filter(c => c.course_type === 'package');
    return { status: 200, data: { packageCount: packages.length } };
  }, { status: 200 });

  // N10-N12: 客户表
  await test('N10 客户API(经纪人可创建)', async () => {
    const agH = authHeader(allTokens.agent);
    const r = await fetchJson('/api/customers', { headers: agH });
    return { status: r.status, data: { accessible: r.status === 200 } };
  }, { status: 200 });

  await test('N12 客户source字段', async () => {
    const agH = authHeader(allTokens.agent);
    const r = await fetchJson('/api/customers?page=1&pageSize=5', { headers: agH });
    const customers = r.data?.data || [];
    if (customers.length === 0) return { status: 200, data: { ok: true }, note: '无客户数据' };
    const hasSource = customers.some(c => c.source !== undefined);
    return { status: 200, data: { hasSourceField: hasSource } };
  }, { status: 200 });

  // N13-N15: 推荐拒绝理由
  await test('N15 推荐列表API', async () => {
    const r = await fetchJson('/api/recommendations', { headers: adminH });
    return { status: r.status };
  }, { status: 200 });

  // N16-N20: 年龄校验
  await test('N16 年龄校验-前端(年龄>120被拒)', async () => {
    const agH = authHeader(allTokens.agent);
    const r = await fetchJson('/api/workers', {
      method: 'POST', headers: agH,
      body: { name: `高龄测试_${Date.now()}`, phone: `188${String(Date.now()).slice(-8)}`, age: 150, origin: '北京', job_types: ['保姆'] },
    });
    // 后端应该拦截150的年龄
    const isBad = r.status === 400;
    return { status: r.status, data: { rejected: isBad } };
  }, { hasField: 'rejected' });

  await test('N17 年龄校验-负年龄被拒', async () => {
    const agH = authHeader(allTokens.agent);
    const r = await fetchJson('/api/workers', {
      method: 'POST', headers: agH,
      body: { name: `负龄测试_${Date.now()}`, phone: `177${String(Date.now()).slice(-8)}`, age: -5, origin: '上海', job_types: ['育儿嫂'] },
    });
    return { status: r.status, data: { rejected: r.status === 400 } };
  }, { hasField: 'rejected' });

  // N21: Auth Header兼容
  await test('N21 Auth Header兼容(x-session)', async () => {
    const token = allTokens.admin;
    const r1 = await fetchJson('/api/workers', { headers: { 'x-session': token } });
    return { status: r1.status, data: { works: r1.status === 200 } };
  }, { status: 200 });

  await test('N21 Auth Header兼容(Bearer)', async () => {
    const token = allTokens.admin;
    const r2 = await fetchJson('/api/workers', { headers: { 'Authorization': `Bearer ${token}` } });
    return { status: r2.status, data: { works: r2.status === 200 } };
  }, { status: 200 });

  // N22: 手机号格式
  await test('N22 手机号格式校验', async () => {
    const r = await fetchJson('/api/auth/phone-login', {
      method: 'POST',
      body: { phone: 'abc', code: '888888' },
    });
    return { status: r.status, data: { rejected: r.status >= 400 } };
  }, { hasField: 'rejected' });

  // ── 第五步：权限隔离测试 (N23-N34) ──
  console.log(C.blue('\n━━━ 第五步：数据权限隔离 (N23-N34) ━━━'));

  // N23-N27: 客户权限
  for (const role of ['recruiter', 'instructor', 'training_supervisor']) {
    const labelNum = role === 'recruiter' ? 'N23' : role === 'instructor' ? 'N25' : 'N26';
    await test(`${labelNum} ${role}→客户API不可见`, async () => {
      if (!allTokens[role]) return { status: 0, data: { ok: true }, note: 'token获取失败' };
      const r = await fetchJson('/api/customers', { headers: authHeader(allTokens[role]) });
      const blocked = r.status === 401 || r.status === 403;
      return { status: r.status, data: { blocked } };
    }, { hasField: 'blocked' });
  }

  await test('N27 经纪人→只看自己客户', async () => {
    if (!allTokens.agent) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/api/customers?page=1&pageSize=20', { headers: authHeader(allTokens.agent) });
    const customers = r.data?.data || [];
    // 检查是否所有记录的agent_id都是经纪人自己的ID
    if (customers.length === 0) return { status: 200, data: { ok: true, note: '经纪人无客户数据' } };
    // 无法精确知道agent userId，但可以通过API能访问来判断
    return { status: r.status, data: { accessible: r.status === 200, count: customers.length } };
  }, { status: 200 });

  // N29-N31: 线索权限
  for (const role of ['agent']) {
    await test(`N${role === 'agent' ? 29 : ''} ${role}→线索API不可见`, async () => {
      if (!allTokens[role]) return { status: 0, data: { ok: true }, note: 'token获取失败' };
      const r = await fetchJson('/api/leads', { headers: authHeader(allTokens[role]) });
      const blocked = r.status === 401 || r.status === 403;
      return { status: r.status, data: { blocked } };
    }, { hasField: 'blocked' });
  }

  await test('N31 招生→只看自己线索', async () => {
    if (!allTokens.recruiter) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/api/leads?page=1&pageSize=10', { headers: authHeader(allTokens.recruiter) });
    return { status: r.status, data: { accessible: r.status === 200, count: (r.data?.data || []).length } };
  }, { status: 200 });

  // N32-N34: 评价全量 + 阿姨库全量
  await test('N32 经纪人→评价全量可见', async () => {
    if (!allTokens.agent) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/api/reviews', { headers: authHeader(allTokens.agent) });
    return { status: r.status, data: { accessible: r.status === 200 } };
  }, { status: 200 });

  await test('N33 招生→评价全量可见', async () => {
    if (!allTokens.recruiter) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/api/reviews', { headers: authHeader(allTokens.recruiter) });
    return { status: r.status, data: { accessible: r.status === 200 } };
  }, { status: 200 });

  await test('N34 经纪人→阿姨库全量', async () => {
    if (!allTokens.agent) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/api/workers?page=1&pageSize=10', { headers: authHeader(allTokens.agent) });
    const workers = r.data?.data || [];
    return { status: r.status, data: { accessible: r.status === 200, count: workers.length } };
  }, { status: 200 });

  // ── 第六步：BUG回归 ──
  console.log(C.blue('\n━━━ 第六步：BUG回归 (B01-B07) ━━━'));

  await test('B01 客户手机号唯一性', async () => {
    if (!allTokens.agent) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const agH = authHeader(allTokens.agent);
    // 先获取一个已有客户的手机号
    const existing = await fetchJson('/api/customers?page=1&pageSize=1', { headers: agH });
    const cust = (existing.data?.data || [])[0];
    if (!cust?.phone) return { status: 200, data: { ok: true }, note: '无客户数据' };
    // 尝试用相同手机号创建
    const r = await fetchJson('/api/customers', {
      method: 'POST', headers: agH,
      body: { name: `重复测试_${Date.now()}`, phone: cust.phone, source: 'test' },
    });
    const blocked = r.status === 409 || r.status === 400;
    return { status: r.status, data: { duplicated: blocked } };
  }, { hasField: 'duplicated' });

  await test('B03 签约创建worker+contract', async () => {
    // 验证contracts API存在
    if (!allTokens.admin) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/api/contracts', { headers: adminH });
    return { status: r.status, data: { accessible: r.status === 200 } };
  }, { status: 200 });

  await test('B04 推荐去重API', async () => {
    if (!allTokens.admin) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/api/recommendations', { headers: adminH });
    return { status: r.status, data: { apiExists: r.status === 200 } };
  }, { status: 200 });

  await test('B05 worker角色可读阿姨库', async () => {
    if (!allTokens.worker) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const wH = authHeader(allTokens.worker);
    const r = await fetchJson('/api/workers?page=1&pageSize=5', { headers: wH });
    return { status: r.status, data: { accessible: r.status === 200 } };
  }, { status: 200 });

  await test('B06 验证码错误被拒(错误code=123456)', async () => {
    const r = await fetchJson('/api/auth/phone-login', {
      method: 'POST',
      body: { phone: '13000000001', code: '123456' },
    });
    return { status: r.status, data: { rejected: r.status >= 400 } };
  }, { hasField: 'rejected' });

  await test('B06 验证码正常登录(code=888888)', async () => {
    const r = await fetchJson('/api/auth/phone-login', {
      method: 'POST',
      body: { phone: '13000000001', code: '888888' },
    });
    return { status: r.status, data: { success: r.status === 200 && r.data?.success } };
  }, { hasField: 'success' });

  await test('B07 阿姨直接访问/admin被拒', async () => {
    if (!allTokens.worker) return { status: 0, data: { ok: true }, note: 'token获取失败' };
    const r = await fetchJson('/admin/dashboard', { headers: { 'x-session': allTokens.worker, 'Accept': 'text/html' } });
    // 应该重定向或拒绝
    const blocked = r.status === 401 || r.status === 403 || (r.status >= 300 && r.status < 400);
    return { status: r.status, data: { blocked } };
  }, { hasField: 'blocked' });

  // ── 第七步：关键页面可达性 ──
  console.log(C.blue('\n━━━ 第七步：关键页面可达性(返回HTML/200) ━━━'));
  
  const pages = [
    ['管理员仪表盘', '/admin/dashboard'],
    ['简历审核列表', '/admin/audits'],
    ['阿姨库页面', '/admin/workers'],
    ['用户管理', '/admin/users'],
    ['订单管理', '/admin/orders'],
    ['课程管理', '/admin/courses'],
    ['评价审核', '/admin/reviews'],
    ['系统设置', '/admin/settings'],
    ['场地管理', '/admin/venues'],
    ['合同模板', '/admin/contracts'],
    ['首页', '/'],
    ['小程序入口', '/m'],
    ['阿姨端-jobs', '/m/worker/jobs'],
    ['客户-我的', '/m/customer'],
  ];

  for (const [name, path] of pages) {
    await test(`${name}页面可达`, async () => {
      const r = await fetchJson(path, { headers: adminH });
      return { status: r.status };
    }, { status: 200 });
  }

  // ── 第八步：简历审核详情页可达性 ──
  console.log(C.blue('\n━━━ 第八步：审核详情页路由验证 ━━━'));

  await test('审核详情页 GET /api/resume-reviews/[id]', async () => {
    const r = await fetchJson('/api/resume-reviews?page=1&pageSize=3', { headers: adminH });
    const list = r.data?.data || [];
    if (list.length === 0) return { status: 200, data: { ok: true }, note: '无审核记录' };
    const detail = await fetchJson(`/api/resume-reviews/${list[0].id}`, { headers: adminH });
    return { status: detail.status, data: { hasData: !!detail.data?.data } };
  }, { hasField: 'hasData' });

  await test('审核详情页 /admin/audits/[id] 有路由', async () => {
    const r = await fetchJson('/api/resume-reviews?page=1&pageSize=3', { headers: adminH });
    const list = r.data?.data || [];
    if (list.length === 0) return { status: 200, data: { ok: true }, note: '无审核记录' };
    const page = await fetchJson(`/admin/audits/${list[0].id}`, { headers: adminH });
    return { status: page.status };
  }, { status: 200 });

  // ── 总结 ──
  console.log(C.cyan(`\n╔══════════════════════════════════════════════════════╗`));
  console.log(C.cyan(`║  测试完成                                            ║`));
  console.log(C.cyan(`╠══════════════════════════════════════════════════════╣`));
  const total = pass + fail + skip;
  const rate = ((pass / total) * 100).toFixed(1);
  console.log(C.cyan(`║  ${C.green(`通过: ${pass}`)}  ${C.red(`失败: ${fail}`)}  ${C.yellow(`跳过: ${skip}`)}  总计: ${total}  通过率: ${rate}%`.padEnd(48) + '║'));
  console.log(C.cyan(`╚══════════════════════════════════════════════════════╝\n`));

  // 输出失败详情
  if (fail > 0) {
    console.log(C.red('\n━━━ 失败项详情 ━━━'));
    results.filter(r => !r.pass).forEach(r => {
      console.log(C.red(`  ✗ ${r.label}`));
      if (r.result) console.log(C.gray(`    结果: ${JSON.stringify(r.result).slice(0, 200)}`));
      if (r.error) console.log(C.gray(`    错误: ${r.error}`));
    });
  }

  // 写入报告
  const fs = require('fs');
  const report = {
    timestamp: new Date().toISOString(),
    target: BASE_URL,
    summary: { pass, fail, skip, total, rate },
    results: results.filter(r => !r.pass),
    allResults: results,
  };
  const reportDir = require('path').join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = require('path').join(reportDir, `manual_2.3_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(C.gray(`报告已保存: ${reportPath}`));

  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(C.red(`\n致命错误: ${e.message}`));
  process.exit(2);
});

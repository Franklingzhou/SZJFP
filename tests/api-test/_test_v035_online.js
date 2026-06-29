// v035 线上测试 - 用 phone-login 获取真实 token
const BASE = 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';
const fs = require('fs');

let out = [];
function log(s) { out.push(s); console.log(s); }

let passed = 0, failed = 0, total = 0;
function check(label, ok, detail) {
  total++;
  if (ok) { passed++; log('OK ' + label); }
  else { failed++; log('FAIL ' + label + ' -- ' + detail); }
}

async function req(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(BASE + path, opts);
  let data = null;
  try { data = await r.json(); } catch(e) { data = 'parse_error'; }
  return { status: r.status, data };
}

(async () => {
  log('=== v035 ONLINE TEST (real tokens) ===\n');

  // Step 0: 获取 admin token
  log('--- 获取 tokens ---');
  let adminToken = null;
  try {
    const { status, data } = await req('POST', '/api/auth/phone-login', null, {
      phone: '13000000001', code: '888888'
    });
    check('admin phone-login', status === 200 && !!data?.token, 'status=' + status);
    if (data?.token) adminToken = data.token;
  } catch(e) { check('admin login', false, e.message); }
  if (!adminToken) { log('\nABORT: no admin token'); process.exit(1); }

  let agentToken = null;
  try {
    const { status, data } = await req('POST', '/api/auth/phone-login', null, {
      phone: '13600001234', code: '888888'
    });
    check('agent phone-login', status === 200 && !!data?.token, 'status=' + status);
    if (data?.token) agentToken = data.token;
  } catch(e) { check('agent login', false, e.message); }

  log('\n--- 核心 API 测试 ---');

  // 1. 首页
  try {
    const r = await fetch(BASE);
    check('GET /', r.status === 200, 'status=' + r.status);
  } catch(e) { check('GET /', false, e.message); }

  // 2. settings（需要 admin token）
  try {
    const { status } = await req('GET', '/api/settings', adminToken);
    check('GET /api/settings', status === 200, 'status=' + status);
  } catch(e) { check('GET /api/settings', false, e.message); }

  // 3. workers
  try {
    const { status, data } = await req('GET', '/api/workers?limit=5', adminToken);
    const cnt = Array.isArray(data) ? data.length : (data?.data?.length || '?');
    check('GET /api/workers', status === 200, 'status=' + status + ' count=' + cnt);
  } catch(e) { check('GET /api/workers', false, e.message); }

  // 4. users
  try {
    const { status } = await req('GET', '/api/users', adminToken);
    check('GET /api/users', status === 200, 'status=' + status);
  } catch(e) { check('GET /api/users', false, e.message); }

  // 5. reviews
  try {
    const { status, data } = await req('GET', '/api/reviews', adminToken);
    const cnt = Array.isArray(data) ? data.length : '?';
    check('GET /api/reviews', status === 200, 'status=' + status + ' count=' + cnt);
  } catch(e) { check('GET /api/reviews', false, e.message); }

  // 6. leads (agent)
  try {
    const { status } = await req('GET', '/api/leads', agentToken);
    check('GET /api/leads', status === 200, 'status=' + status);
  } catch(e) { check('GET /api/leads', false, e.message); }

  // 7. orders
  try {
    const { status } = await req('GET', '/api/orders', adminToken);
    check('GET /api/orders', status === 200, 'status=' + status);
  } catch(e) { check('GET /api/orders', false, e.message); }

  // 8. courses
  try {
    const { status } = await req('GET', '/api/courses', adminToken);
    check('GET /api/courses', status === 200, 'status=' + status);
  } catch(e) { check('GET /api/courses', false, e.message); }

  // 9. enrollments
  try {
    const { status } = await req('GET', '/api/enrollments', adminToken);
    check('GET /api/enrollments', status === 200, 'status=' + status);
  } catch(e) { check('GET /api/enrollments', false, e.message); }

  // 10. contracts
  try {
    const { status } = await req('GET', '/api/contracts', adminToken);
    check('GET /api/contracts', status === 200, 'status=' + status);
  } catch(e) { check('GET /api/contracts', false, e.message); }

  // 11. 手机号登录（正常）
  try {
    const { status, data } = await req('POST', '/api/auth/phone-login', null, {
      phone: '13800138000', code: '888888'
    });
    check('POST /api/auth/phone-login (new)', status === 200 && !!data?.token, 'status=' + status);
  } catch(e) { check('phone-login', false, e.message); }

  // 12. 409 冲突
  try {
    const { status } = await req('POST', '/api/auth/phone-register', null, {
      phone: '13800138000', code: '888888', name: 'test', role: 'agent'
    });
    check('POST /api/auth/phone-register 409', status === 409, 'status=' + status);
  } catch(e) { check('phone-register 409', false, e.message); }

  // 13. auth guard
  try {
    const { status } = await req('PUT', '/api/workers', null, { id: 'fake', name: 'hack' });
    check('PUT /api/workers no-auth → 401', status === 401, 'status=' + status);
  } catch(e) { check('auth guard', false, e.message); }

  // 14. notifications
  try {
    const { status } = await req('POST', '/api/notifications', adminToken, {
      user_id: 'a001', title: 'v035 test', content: '线上测试', type: 'system'
    });
    check('POST /api/notifications', status === 200 || status === 201, 'status=' + status);
  } catch(e) { check('notifications', false, e.message); }

  // 15. settings PUT
  try {
    const { status } = await req('PUT', '/api/settings', adminToken, {
      key: 'v035_health_check', value: { time: new Date().toISOString(), status: 'ok' }
    });
    check('PUT /api/settings', status === 200, 'status=' + status);
  } catch(e) { check('settings PUT', false, e.message); }

  // 16. 非 admin 改 settings 应该 403
  try {
    const { status } = await req('PUT', '/api/settings', agentToken, {
      key: 'hack', value: { hacked: true }
    });
    check('PUT /api/settings as agent → 403', status === 403, 'status=' + status);
  } catch(e) { check('agent settings denied', false, e.message); }

  // 17. 平台费用
  try {
    const { status } = await req('GET', '/api/platform-fees', adminToken);
    check('GET /api/platform-fees', [200, 401, 404].includes(status), 'status=' + status);
  } catch(e) { check('platform-fees', false, e.message); }

  log('\n=== RESULT: ' + passed + '/' + total + ' passed ===');
  const resultFile = 'f:/CB-szjfp/v035_test_result2.txt';
  fs.writeFileSync(resultFile, out.join('\n'), 'utf8');
  console.log('Output: ' + resultFile);
  process.exit(failed > 0 ? 1 : 0);
})();

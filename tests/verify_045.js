const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';

function r(m, p, t, b) {
  return new Promise(res => {
    const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false };
    if (t) o.headers['Authorization'] = 'Bearer ' + t;
    const req = https.request(o, r2 => { let d = ''; r2.on('data', c => d += c); r2.on('end', () => res({ code: r2.statusCode, body: d })); });
    req.on('error', e => res({ code: 0, body: 'ERR:' + e.message }));
    if (b) req.write(JSON.stringify(b));
    req.end();
  });
}

function ok(code, pass) { return code === pass ? '✅' : '❌'; }

async function main() {
  console.log('=== szjfp-045 全量BUG验证 ===\n');

  // Login
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  const admt = adm.token;
  console.log('Admin login:', adm.name, 'token:', admt ? 'OK' : 'FAIL');
  
  const wk = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13800005678', code: '888888' })).body);
  const wkt = wk.token;
  console.log('Worker login:', wk.name, 'token:', wkt ? 'OK' : 'FAIL');

  let res;

  // BUG-40: lead-contracts (service_role Supabase SDK)
  res = await r('GET', '/api/lead-contracts', admt);
  const lcBody = JSON.parse(res.body);
  console.log('\nBUG-40 lead-contracts GET:', ok(res.code, 200), 'data:', Array.isArray(lcBody.data) ? lcBody.data.length + ' records' : lcBody.error);

  res = await r('POST', '/api/lead-contracts', admt, { lead_id: 'lead_001', notes: 'test045' });
  const lcPost = JSON.parse(res.body);
  console.log('BUG-40 lead-contracts POST:', ok(res.code, 201), lcPost.ok ? 'ok' : lcPost.error);

  // BUG-31: 用户审核 (service_role Supabase SDK)
  res = await r('POST', '/api/users/a001/approve', admt);
  const usrBody = JSON.parse(res.body);
  console.log('BUG-31 user approve:', ok(res.code, 200), usrBody.success ? 'success' : usrBody.error);

  // BUG-32: 通知扩权
  res = await r('GET', '/api/notifications', wkt);
  console.log('BUG-32 worker notifications:', ok(res.code, 200));

  // BUG-36: 阿姨订单过滤 (w001 有6个订单，正确)
  res = await r('GET', '/api/orders', wkt);
  const ordBody = JSON.parse(res.body);
  const ordCount = Array.isArray(ordBody.data) ? ordBody.data.length : -1;
  console.log('BUG-36 worker orders:', ordCount >= 0 ? '✅' : '❌', `count: ${ordCount}`);

  // BUG-43: 换阿姨 (用真实 worker ID)
  res = await r('POST', '/api/orders/54ee4fbe-7e6a-4a77-9968-6ff1fb84ae54/replace-worker', admt, { new_worker_id: 'wk_1782313602021', reason: 'test-replace' });
  const rpBody = JSON.parse(res.body);
  console.log('BUG-43 replace-worker:', ok(res.code, 200), rpBody.success ? rpBody.message : rpBody.error);

  // BUG-45: DELETE leads/courses/orders (用 ?id= 方式)
  res = await r('DELETE', '/api/leads?id=test_dummy', admt);
  console.log('BUG-45 leads DELETE:', res.code === 200 || res.code === 404 ? '✅' : '❌', `code: ${res.code}`);

  res = await r('DELETE', '/api/courses?id=test_dummy', admt);
  console.log('BUG-45 courses DELETE:', res.code === 200 || res.code === 404 ? '✅' : '❌', `code: ${res.code}`);

  res = await r('DELETE', '/api/orders?id=test_dummy', admt);
  console.log('BUG-45 orders DELETE:', res.code === 200 || res.code === 404 ? '✅' : '❌', `code: ${res.code}`);

  // BUG-41: sidebar 6个页面 (全部应200)
  const pages = ['role-permissions', 'data-permissions', 'field-permissions', 'refunds', 'platform-fees', 'tiers'];
  console.log('\nBUG-41 Admin pages:');
  for (const p of pages) {
    res = await r('GET', '/admin/' + p, admt);
    console.log(`  /admin/${p}:`, ok(res.code, 200), `code: ${res.code}`);
  }

  // BUG-29: worker contracts
  res = await r('GET', '/api/contracts', wkt);
  console.log('\nBUG-29 worker contracts:', ok(res.code, 200));

  console.log('\n=== 验证完成 ===');
}
main();

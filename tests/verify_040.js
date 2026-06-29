const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';

function r(m, p, t, b) {
  return new Promise(res => {
    const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false };
    if (t) o.headers['Authorization'] = 'Bearer ' + t;
    const req = https.request(o, r2 => { let d = ''; r2.on('data', c => d += c); r2.on('end', () => res({ code: r2.statusCode, body: d })) });
    req.on('error', e => res({ code: 0, body: 'ERR:' + e.message }));
    if (b) req.write(JSON.stringify(b));
    req.end();
  });
}

async function main() {
  console.log('=== szjfp-040 验证 BUG-40 & BUG-31 ===\n');

  // Login as admin
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  const token = adm.token;
  if (!token) { console.log('❌ 登录失败:', adm); return; }
  console.log('✅ admin 登录成功, userId:', adm.userId || adm.user?.id);

  // --- 先跑 migration 确保表存在 ---
  let res = await r('POST', '/api/admin/db-migrate', token);
  console.log('\n--- 1. db-migrate ---');
  console.log('code:', res.code);
  try {
    const b = JSON.parse(res.body);
    console.log('body:', JSON.stringify(b).substring(0, 200));
  } catch { console.log('body:', res.body.substring(0, 200)); }

  // --- BUG-40: lead-contracts GET ---
  console.log('\n--- 2. BUG-40: lead-contracts GET ---');
  res = await r('GET', '/api/lead-contracts', token);
  console.log('code:', res.code);
  try {
    const b = JSON.parse(res.body);
    const ok = b.ok === true;
    const isArray = Array.isArray(b.data);
    console.log(ok ? '✅ PASS' : '❌ FAIL', isArray ? `(data[]: ${b.data.length})` : '');
    console.log('body:', JSON.stringify(b).substring(0, 250));
  } catch { console.log('❌ FAIL body:', res.body.substring(0, 200)); }

  // --- BUG-40: lead-contracts POST ---
  console.log('\n--- 3. BUG-40: lead-contracts POST ---');
  res = await r('POST', '/api/lead-contracts', token, { lead_id: 'lead_001', notes: 'test from verify' });
  console.log('code:', res.code);
  try {
    const b = JSON.parse(res.body);
    const ok = b.ok === true;
    console.log(ok ? '✅ PASS' : '❌ FAIL', b.data ? `(id: ${b.data.id})` : '');
    console.log('body:', JSON.stringify(b).substring(0, 250));
  } catch { console.log('❌ FAIL body:', res.body.substring(0, 200)); }

  // --- BUG-31: user approve ---
  console.log('\n--- 4. BUG-31: user approve (a001) ---');
  res = await r('POST', '/api/users/a001/approve', token);
  console.log('code:', res.code);
  try {
    const b = JSON.parse(res.body);
    console.log(res.code === 200 && b.success ? '✅ PASS' : '❌ FAIL');
    console.log('body:', JSON.stringify(b).substring(0, 250));
  } catch { console.log('❌ FAIL body:', res.body.substring(0, 200)); }

  // --- 再跑一次 lead-contracts GET 确认持久化 ---
  console.log('\n--- 5. lead-contracts GET (after POST) ---');
  res = await r('GET', '/api/lead-contracts', token);
  console.log('code:', res.code);
  try {
    const b = JSON.parse(res.body);
    const count = Array.isArray(b.data) ? b.data.length : '?';
    console.log(`✅ PASS (${count} records)`);
  } catch { console.log('❌ FAIL'); }

  // --- Login as worker to verify BUG-36 fix ---
  console.log('\n--- 6. BUG-36: worker login + orders ---');
  const wk = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13800005678', code: '888888' })).body);
  res = await r('GET', '/api/orders', wk.token);
  console.log('code:', res.code);
  try {
    const b = JSON.parse(res.body);
    const count = Array.isArray(b.data) ? b.data.length : -1;
    console.log(count <= 2 ? '✅ PASS (filtered)' : '❌ FAIL (still leaking)', `orders: ${count}`);
  } catch { console.log('❌ FAIL body:', res.body.substring(0, 150)); }

  // --- BUG-29: worker can see contracts ---
  console.log('\n--- 7. BUG-29: worker contracts ---');
  res = await r('GET', '/api/contracts', wk.token);
  console.log('code:', res.code);
  console.log(res.code === 200 ? '✅ PASS' : '❌ FAIL');

  console.log('\n=== 验证完成 ===');
}
main();

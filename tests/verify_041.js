const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t, b) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, r2 => { let d = ''; r2.on('data', c => d += c); r2.on('end', () => res({ code: r2.statusCode, body: d })) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); if (b) req.write(JSON.stringify(b)); req.end(); }) }

async function main() {
  console.log('=== szjfp-041 IPv4 pg 验证 ===\n');
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  const token = adm.token;

  // BUG-40: lead-contracts
  let res = await r('GET', '/api/lead-contracts', token);
  console.log('BUG-40 lead-contracts GET:', res.code, res.body.substring(0, 150));

  // BUG-31: user approve
  res = await r('POST', '/api/users/a001/approve', token);
  console.log('BUG-31 user approve:', res.code, res.body.substring(0, 150));

  // BUG-36: verify
  const wk = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13800005678', code: '888888' })).body);
  res = await r('GET', '/api/orders', wk.token);
  const b = JSON.parse(res.body);
  const count = Array.isArray(b.data) ? b.data.length : -1;
  console.log('BUG-36 orders:', res.code, 'count:', count, count <= 5 ? '✅' : '❌');

  // db-migrate
  res = await r('POST', '/api/admin/db-migrate', token);
  console.log('db-migrate:', res.code, res.body.substring(0, 60));
}
main();

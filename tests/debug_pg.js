const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t, b) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, res2 => { let d = ''; res2.on('data', c => d += c); res2.on('end', () => res({ code: res2.statusCode, body: d }) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); if (b) req.write(JSON.stringify(b)); req.end() }) }

async function main() {
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  
  // Check migrate full body
  let res = await r('POST', '/api/admin/db-migrate', adm.token);
  console.log('migrate code:', res.code, 'body:', res.body.substring(0, 300));

  // Check lead_contracts
  res = await r('GET', '/api/lead-contracts', adm.token);
  console.log('lead_contracts code:', res.code, 'body:', res.body.substring(0, 300));

  // Check user approve  
  res = await r('POST', '/api/users/a001/approve', adm.token);
  console.log('user_approve code:', res.code, 'body:', res.body.substring(0, 300));

  // Check if there are existing pg-native endpoints that work
  res = await r('GET', '/api/notifications', adm.token);
  console.log('notifications code:', res.code, 'body:', res.body.substring(0, 200));
}
main();

const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t, b) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, r2 => { let d = ''; r2.on('data', c => d += c); r2.on('end', () => res({ code: r2.statusCode, body: d })) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); if (b) req.write(JSON.stringify(b)); req.end(); }) }

async function main() {
  console.log('=== szjfp-043 IPv4 DNS 验证 ===\n');
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  const admt = adm.token;

  let res;

  // BUG-40: lead-contracts (pg via dns.resolve4)
  res = await r('GET', '/api/lead-contracts', admt);
  console.log('BUG-40 lead-contracts:', res.code, res.body.substring(0, 200));

  // BUG-31: user approve
  res = await r('POST', '/api/users/a001/approve', admt);
  console.log('BUG-31 user approve:', res.code, res.body.substring(0, 200));
}
main();

const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t, b) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, res2 => { let d = ''; res2.on('data', c => d += c); res2.on('end', () => res({ code: res2.statusCode, body: d.substring(0, 500) })) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); if (b) req.write(JSON.stringify(b)); req.end() }) }

async function main() {
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  
  // Try hitting db-migrate API
  let res = await r('POST', '/api/admin/db-migrate', adm.token);
  console.log('db-migrate API:', res.code, res.body.substring(0, 300));
  
  // Try lead_contracts again (after possible db-migrate call)
  res = await r('GET', '/api/lead-contracts', adm.token);
  console.log('BUG-40 lead_contracts:', res.code, res.body.substring(0, 200));

  // Test BUG-13 reject with "reason" field
  res = await r('GET', '/api/recommendations?status=pending&limit=1', adm.token);
  let m = res.body.match(/"id":"([^"]+)"/);
  if (m) {
    res = await r('PATCH', '/api/recommendations/' + m[1], adm.token, { status: 'rejected', reason: 'test reject' });
    console.log('BUG-13 reject(reason):', res.code, res.body.substring(0, 150));
  }
  
  console.log('\nDone.');
}
main().catch(e => console.error(e));

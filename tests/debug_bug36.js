const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, r2 => { let d = ''; r2.on('data', c => d += c); r2.on('end', () => res({ code: r2.statusCode, body: d })) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); req.end(); }) }

async function main() {
  // Login as worker w001
  const wk = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13800005678', code: '888888' })).body);

  const res = await r('GET', '/api/orders', wk.token);
  const b = JSON.parse(res.body);
  const orders = b.data || [];

  console.log(`Total orders: ${orders.length}`);
  if (orders.length > 0) {
    console.log(`First order sample:`, JSON.stringify(orders[0]).substring(0, 300));
    // Check worker_id distribution
    const workerIds = orders.map(o => o.worker_id);
    const uniqueWorkers = [...new Set(workerIds)];
    console.log(`Unique worker_ids: ${uniqueWorkers.join(', ')}`);

    // Check for sensitive fields
    const hasPhone = orders.some(o => o.contact_phone);
    const hasName = orders.some(o => o.contact_name);
    console.log(`Has contact_phone: ${hasPhone}, Has contact_name: ${hasName}`);
  }
}
main();

const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t, b) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, r2 => { let d = ''; r2.on('data', c => d += c); r2.on('end', () => res({ code: r2.statusCode, body: d })) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); if (b) req.write(JSON.stringify(b)); req.end(); }) }

async function main() {
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  const admt = adm.token;

  // Check worker order count (BUG-36 detail)
  const wk = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13800005678', code: '888888' })).body);
  let res = await r('GET', '/api/orders', wk.token);
  const b = JSON.parse(res.body);
  const orders = b.data || [];
  if (orders.length > 0) {
    console.log('Worker orders worker_ids:', [...new Set(orders.map(o => o.worker_id))].join(','));
    console.log('Has contact_name:', orders.some(o => o.contact_name && o.contact_name !== '***'));
  }

  // BUG-43: find a real order
  res = await r('GET', '/api/orders', admt);
  const allOrders = JSON.parse(res.body).data || [];
  if (allOrders.length > 0) {
    console.log('\nSample order id:', allOrders[0].id);
    res = await r('POST', '/api/orders/' + allOrders[0].id + '/replace-worker', admt, { new_worker_id: 'w002', reason: 'test' });
    console.log('replace-worker with real id:', res.code, JSON.parse(res.body));
  }

  // BUG-45 DELETE: check real id
  res = await r('GET', '/api/leads', admt);
  const leads = JSON.parse(res.body).data || [];
  if (leads.length > 0) {
    console.log('\nSample lead id:', leads[0].id);
    res = await r('DELETE', '/api/leads', admt, { id: leads[0].id });
    console.log('DELETE lead:', res.code, JSON.parse(res.body));
  }

  // BUG-41 role-permissions 400
  res = await r('GET', '/admin/role-permissions', admt);
  console.log('\n/admin/role-permissions:', res.code, res.body.substring(0, 100));
}
main();

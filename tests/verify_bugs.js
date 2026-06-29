const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';

function req(method, path, token, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: BASE, port: 443, method, path,
      headers: { 'Content-Type': 'application/json' },
      rejectUnauthorized: false
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ code: res.statusCode, body: d.substring(0, 400) }));
    });
    r.on('error', e => resolve({ code: 0, body: 'ERROR: ' + e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function login(phone) {
  const r = await req('POST', '/api/auth/phone-login', null, { phone, code: '888888' });
  return JSON.parse(r.body);
}

async function main() {
  console.log('Logging in...');
  const adm = await login('13000000001');
  const wk = await login('13800005678');
  const cust = await login('13900009876');
  console.log('admin token:', adm.token ? 'OK' : 'FAIL');
  console.log('worker token:', wk.token ? 'OK' : 'FAIL');
  console.log('customer token:', cust.token ? 'OK' : 'FAIL');

  // === BUG-30: 简历审核 schema 错误 ===
  console.log('\n=== BUG-30: 简历审核 ===');
  let r = await req('GET', '/api/resume-reviews?status=pending&limit=1', adm.token);
  console.log('GET resume-reviews:', r.code);
  let reviews = null;
  try { reviews = JSON.parse(r.body); } catch(e) {}
  if (reviews && reviews.data && reviews.data.length > 0) {
    let rid = reviews.data[0].id;
    r = await req('POST', `/api/resume-reviews/${rid}/approve`, adm.token, { comment: 'test' });
    console.log('approve:', r.code, '|', r.body.substring(0, 200));
    // Find another pending
    r = await req('GET', '/api/resume-reviews?status=pending&limit=1', adm.token);
    try { reviews = JSON.parse(r.body); } catch(e) {}
    if (reviews && reviews.data && reviews.data.length > 0) {
      let rid2 = reviews.data[0].id;
      r = await req('POST', `/api/resume-reviews/${rid2}/reject`, adm.token, { reason: 'test reject' });
      console.log('reject:', r.code, '|', r.body.substring(0, 200));
    }
  }

  // === BUG-36: 阿姨端数据泄露 ===
  console.log('\n=== BUG-36: 阿姨数据泄露 ===');
  r = await req('GET', '/api/orders', wk.token);
  let orderCount = (r.body.match(/"id":"/g) || []).length;
  let hasContactName = r.body.includes('contact_name');
  console.log('Worker sees', orderCount, 'orders | has contact_name:', hasContactName, '| code:', r.code);
  r = await req('GET', '/api/orders', cust.token);
  orderCount = (r.body.match(/"id":"/g) || []).length;
  console.log('Customer sees', orderCount, 'orders | code:', r.code);

  // === BUG-29: 合同401 ===
  console.log('\n=== BUG-29: 合同401 ===');
  r = await req('GET', '/api/contracts', wk.token);
  console.log('Worker /api/contracts:', r.code, r.body.substring(0, 120));
  r = await req('GET', '/api/contracts', cust.token);
  console.log('Customer /api/contracts:', r.code, r.body.substring(0, 120));
  r = await req('GET', '/api/contracts', adm.token);
  console.log('Admin /api/contracts:', r.code, '(baseline)');

  // === BUG-44: 合同生命周期 ===
  console.log('\n=== BUG-44: 合同生命周期 ===');
  r = await req('POST', '/api/contracts', adm.token, { title: 'test contract', type: 'training', worker_id: 'w001' });
  console.log('POST /api/contracts:', r.code, r.body.substring(0, 200));

  // === BUG-37: 前端权限 ===
  console.log('\n=== BUG-37: 前端权限隔离 ===');
  r = await req('GET', '/admin/users', wk.token);
  console.log('Worker GET /admin/users:', r.code, '| html len:', r.body.length);
  r = await req('GET', '/admin/roles', wk.token);
  console.log('Worker GET /admin/roles:', r.code, '| html len:', r.body.length);

  // === BUG-38: 简历审核路径 ===
  console.log('\n=== BUG-38: 路径 ===');
  r = await req('GET', '/admin/resumes', adm.token);
  console.log('/admin/resumes:', r.code, '|', r.body.substring(0, 80));
  r = await req('GET', '/admin/audits', adm.token);
  console.log('/admin/audits:', r.code, '|', r.body.substring(0, 80));

  // === BUG-42: 课程审核 ===
  console.log('\n=== BUG-42: 课程审核 ===');
  r = await req('GET', '/api/courses?limit=1', adm.token);
  let courses = null;
  try { courses = JSON.parse(r.body); } catch(e) {}
  if (courses && courses.data && courses.data.length > 0) {
    let cid = courses.data[0].id;
    r = await req('POST', `/api/courses/${cid}/approve`, adm.token, {});
    console.log('course approve:', r.code, r.body.substring(0, 200));
  }

  console.log('\n=== DONE ===');
}
main().catch(e => console.error(e));

const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t, b) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, res2 => { let d = ''; res2.on('data', c => d += c); res2.on('end', () => res({ code: res2.statusCode, body: d.substring(0, 500) })) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); if (b) req.write(JSON.stringify(b)); req.end() }) }

async function main() {
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  const wk = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13800005678', code: '888888' })).body);
  const cust = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13900009876', code: '888888' })).body);

  console.log('=== 第四轮报告 BUG 修复验证 ===\n');

  // P0 #1: BUG-36 数据泄露
  let res = await r('GET', '/api/orders', wk.token);
  let n = (res.body.match(/"id":"/g) || []).length;
  console.log('P0 BUG-36 阿姨数据泄露:', n, 'orders', n <= 10 ? '✅' : '❌');
  res = await r('GET', '/api/orders', cust.token);
  n = (res.body.match(/"id":"/g) || []).length;
  console.log('P0 BUG-36 客户数据泄露:', n, 'orders', n <= 5 ? '✅' : '❌');

  // P0 #2: BUG-37 前端权限隔离
  res = await r('GET', '/admin/users', wk.token);
  const still200 = res.code === 200 && res.body.includes('<!DOCTYPE');
  console.log('P0 BUG-37 阿姨访问/admin:', still200 ? '❌ still 200' : '✅');

  // P0 #3: BUG-30 简历审核
  res = await r('GET', '/api/resume-reviews?status=pending&limit=1', adm.token);
  let m = res.body.match(/"id":"([^"]+)"/);
  if (m) {
    res = await r('POST', '/api/resume-reviews/' + m[1] + '/approve', adm.token, { comment: 'verify' });
    console.log('P0 BUG-30 简历审核:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');
  } else {
    console.log('P0 BUG-30 简历审核: ⚠️ no pending review');
  }

  // P0 #4: BUG-29 合同权限
  res = await r('GET', '/api/contracts', wk.token);
  console.log('P0 BUG-29 阿姨合同:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');
  res = await r('GET', '/api/contracts', cust.token);
  console.log('P0 BUG-29 客户合同:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // P0 #5: BUG-44 合同创建
  res = await r('POST', '/api/contracts', adm.token, { title: 'verify_test', type: 'training' });
  console.log('P0 BUG-44 合同创建:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // P0 #new: BUG-42 课程审核 (was P1, same as P0-level)
  res = await r('GET', '/api/courses?status=pending_approval&limit=1', adm.token);
  m = res.body.match(/"id":"([^"]+)"/);
  if (m) {
    res = await r('POST', '/api/courses/' + m[1] + '/approve', adm.token, { approved: true });
    console.log('P1 BUG-42 课程审核:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');
  }

  // P1 BUG-40: lead_contracts
  res = await r('GET', '/api/lead-contracts', adm.token);
  console.log('P1 BUG-40 lead_contracts:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // P1 BUG-13: 推荐拒绝
  res = await r('GET', '/api/recommendations?status=pending&limit=1', adm.token);
  m = res.body.match(/"id":"([^"]+)"/);
  if (m) {
    res = await r('PATCH', '/api/recommendations/' + m[1], adm.token, { status: 'rejected', reason: 'test reject' });
    console.log('P1 BUG-13 推荐拒绝:', res.code === 200 ? '✅' : '❌', '(' + res.code + '):', res.body.substring(0, 100));
  }

  // P1 BUG-31: 用户审核
  res = await r('POST', '/api/users/a001/approve', adm.token);
  console.log('P1 BUG-31 用户审核:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // P2 BUG-32: 通知API
  res = await r('GET', '/api/notifications', wk.token);
  console.log('P2 BUG-32 通知API:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // P2 BUG-43: 换阿姨
  res = await r('POST', '/api/orders/abc/change-worker', adm.token, { new_worker_id: 'w002' });
  console.log('P2 BUG-43 换阿姨:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // P2 BUG-45: Update/Delete
  res = await r('PATCH', '/api/courses/abc', adm.token, { name: 'test' });
  console.log('P2 BUG-45 PATCH:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // 超纲: BUG-38 侧边栏
  res = await r('GET', '/admin/resumes', adm.token);
  console.log('BUG-38 /admin/resumes:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  // 超纲: BUG-41 设置子菜单
  res = await r('GET', '/admin/settings/credit', adm.token);
  console.log('BUG-41 settings/credit:', res.code === 200 ? '✅' : '❌', '(' + res.code + ')');

  console.log('\n=== Done ===');
}
main().catch(e => console.error(e));

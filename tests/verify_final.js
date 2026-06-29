const https = require('https');
const BASE = 'szjfp-273464-5-1426505363.sh.run.tcloudbase.com';
function r(m, p, t, b) { return new Promise(res => { const o = { hostname: BASE, port: 443, method: m, path: p, headers: { 'Content-Type': 'application/json' }, rejectUnauthorized: false }; if (t) o.headers['Authorization'] = 'Bearer ' + t; const req = https.request(o, res2 => { let d = ''; res2.on('data', c => d += c); res2.on('end', () => res({ code: res2.statusCode, body: d.substring(0, 500) })) }); req.on('error', e => res({ code: 0, body: 'ERR:' + e.message })); if (b) req.write(JSON.stringify(b)); req.end() }) }

async function main() {
  const adm = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13000000001', code: '888888' })).body);
  const wk = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13800005678', code: '888888' })).body);
  const cust = JSON.parse((await r('POST', '/api/auth/phone-login', null, { phone: '13900009876', code: '888888' })).body);

  let res, m, n;
  const results = [];

  console.log('=== szjfp-038 全量验证 ===\n');

  // P0 BUG-36: 数据泄露
  res = await r('GET', '/api/orders', wk.token);
  n = (res.body.match(/"id":"/g) || []).length;
  results.push(['P0', 'BUG-36', '阿姨数据泄露', n <= 10 ? '✅' : '❌', n + '条']);

  // P0 BUG-30: 简历审核
  res = await r('GET', '/api/resume-reviews?status=pending&limit=1', adm.token);
  m = res.body.match(/"id":"([^"]+)"/);
  if (m) {
    res = await r('POST', '/api/resume-reviews/' + m[1] + '/approve', adm.token, { comment: 'verify' });
    results.push(['P0', 'BUG-30', '简历审核', res.code === 200 ? '✅' : '❌', res.code]);
  }

  // P0 BUG-29: 合同权限
  res = await r('GET', '/api/contracts', wk.token);
  results.push(['P0', 'BUG-29', '阿姨合同权限', res.code === 200 ? '✅' : '❌', res.code]);
  res = await r('GET', '/api/contracts', cust.token);
  results.push(['P0', 'BUG-29', '客户合同权限', res.code === 200 ? '✅' : '❌', res.code]);

  // P0 BUG-44: 合同创建
  res = await r('POST', '/api/contracts', adm.token, { title: 'test', type: 'training' });
  results.push(['P0', 'BUG-44', '合同创建', res.code === 200 ? '✅' : '❌', res.code]);

  // P1 BUG-42: 课程审核
  res = await r('GET', '/api/courses?status=pending_approval&limit=1', adm.token);
  m = res.body.match(/"id":"([^"]+)"/);
  if (m) {
    res = await r('POST', '/api/courses/' + m[1] + '/approve', adm.token, { approved: true });
    results.push(['P1', 'BUG-42', '课程审核', res.code === 200 ? '✅' : '❌', res.code]);
  }

  // P1 BUG-40: lead_contracts (pg直连)
  res = await r('GET', '/api/lead-contracts', adm.token);
  results.push(['P1', 'BUG-40', '线索合同API', res.body.includes('"ok":true') ? '✅' : '❌', res.body.substring(0,60)]);

  // P1 BUG-13: 推荐拒绝
  res = await r('GET', '/api/recommendations?status=pending&limit=1', adm.token);
  m = res.body.match(/"id":"([^"]+)"/);
  if (m) {
    res = await r('PATCH', '/api/recommendations/' + m[1], adm.token, { status: 'rejected', reason: 'test' });
    results.push(['P1', 'BUG-13', '推荐拒绝', res.code === 200 ? '✅' : '❌', res.body.substring(0,60)]);
  }

  // P1 BUG-31: 用户审核 NEW!
  res = await r('POST', '/api/users/a001/approve', adm.token);
  results.push(['P1', 'BUG-31', '用户审核API', res.code === 200 ? '✅' : '❌', res.code]);

  // BUG-38: /admin/resumes (now redirects)
  res = await r('GET', '/admin/resumes', adm.token);
  const redirectOk = res.code === 200 && !res.body.includes('404');
  results.push(['P1', 'BUG-38', '/admin/resumes', redirectOk ? '✅' : '❌', res.code]);

  // BUG-37: 前端权限 (HTTP 200 expected for SSR, real check in browser)
  res = await r('GET', '/admin/users', wk.token);
  results.push(['P0', 'BUG-37', '阿姨/admin(SSR)', '⚠️', '200-HTML(客户端检查)']);

  console.table(results);
  console.log('\n=== 总结 ===');
  const ok = results.filter(r => r[3] === '✅').length;
  const fail = results.filter(r => r[3] === '❌').length;
  const warn = results.filter(r => r[3] === '⚠️').length;
  console.log(`✅ ${ok}  ❌ ${fail}  ⚠️ ${warn}`);
}
main().catch(e => console.error(e));

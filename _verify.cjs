const https = require('https');
const BASE = 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';

function req(method, path, token, body) {
  return new Promise((resolve) => {
    const u = new URL(BASE + path);
    const opts = {
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'Content-Type': 'application/json' },
      rejectUnauthorized: false,
    };
    if (token) opts.headers.Authorization = `Bearer ${token}`;
    if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
    const r = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ code: res.statusCode, body: d.slice(0, 400) }));
    });
    r.on('error', e => resolve({ code: 0, body: e.message }));
    if (body) r.write(body);
    r.end();
  });
}
const get = (p, t) => req('GET', p, t);
const post = (p, t, b) => req('POST', p, t, JSON.stringify(b));

async function login(phone) {
  const r = await post('/api/auth/phone-login', null, { phone, code: '888888' });
  try { return JSON.parse(r.body); } catch { return {}; }
}

async function main() {
  let ok = 0, fail = 0;
  const issues = [];

  // P1 #1: /api/workers/me  
  const auntie = await login('13800005678');
  console.log('阿姨 token:', auntie.token ? 'got' : 'FAIL');
  const r1 = await get('/api/workers/me', auntie.token);
  console.log(`#1 /api/workers/me -> ${r1.code} ${r1.body}`);
  r1.code === 200 ? ok++ : (fail++, issues.push('#1=' + r1.code));

  // #1b 用 profile 的 worker_id
  if (auntie.user?.worker_id) {
    const r1b = await get(`/api/workers/${auntie.user.worker_id}`, auntie.token);
    console.log(`#1b /api/workers/${auntie.user.worker_id} -> ${r1b.code}`);
  }

  // P1 #2: /api/applications vs /api/worker-applications
  const r2 = await get('/api/applications', auntie.token);
  console.log(`#2 /api/applications(错名) -> ${r2.code}`);
  const r2b = await get('/api/worker-applications', auntie.token);
  console.log(`#2b /api/worker-applications(正确) -> ${r2b.code} ${r2b.body}`);
  r2b.code === 200 ? ok++ : (fail++, issues.push('#2b=' + r2b.code));

  // P1 #3: 通知 cron
  const r3 = await get('/api/cron/contract-expiry');
  console.log(`#3 cron/contract-expiry -> ${r3.code} ${r3.body}`);
  r3.code === 200 ? ok++ : (fail++, issues.push('#3=' + r3.code));

  // 通知列表
  const admin = await login('13000000001');
  const r4 = await get('/api/notifications?type=contract_expiry', admin.token);
  console.log(`#4 notifications -> ${r4.code} ${r4.body}`);

  // W06: POST /api/workers — 测试团队报409
  const wop = await login('13200005678');
  if (wop.token) {
    const wBody = {
      name: '测试阿姨' + Date.now(),
      phone: '199' + String(Date.now()).slice(-8),
      role_tag: '月嫂',
      status: 'available',
    };
    const rw = await post('/api/workers', wop.token, wBody);
    console.log(`W06 POST /api/workers -> ${rw.code} ${rw.body}`);
    rw.code === 201 ? ok++ : (fail++, issues.push('W06=' + rw.code));
  }

  // P2: 阿姨运营评价
  const r5 = await get('/api/reviews?reviewer_role=worker_operator', admin.token);
  console.log(`#5 reviews(worker_operator) -> ${r5.code} ${r5.body}`);

  // P2: 退款记录
  const r6 = await get('/api/refunds', admin.token);
  console.log(`#6 refunds -> ${r6.code} ${r6.body}`);

  console.log(`\n  ok=${ok} fail=${fail}`);
  if (issues.length) console.log('  问题:', issues.join(', '));
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });

// v041 权限验证 — 用真实 userId 构造 token
const BASE = 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';

function makeToken(userId) {
  return Buffer.from(`${userId}:${Date.now()}`).toString('base64url');
}

const tests = [
  { label: 'orders + customer (v041新增→200)', url: '/api/orders',      userId: 'u_1781846711521_l7ndkk', role: 'customer', expect: 200 },
  { label: 'orders + worker (无权限→403)',     url: '/api/orders',      userId: 'u_wk_1781786112421',      role: 'worker',   expect: 403 },
  { label: 'enrollments + worker (v041新增→200)',url:'/api/enrollments', userId: 'u_wk_1781786112421',      role: 'worker',   expect: 200 },
  { label: 'enrollments + agent (检查)',        url: '/api/enrollments', userId: 'a001',                    role: 'agent',    expect: 403 },
  { label: 'workers + customer (原有→200)',     url: '/api/workers',     userId: 'u_1781846711521_l7ndkk', role: 'customer', expect: 200 },
];

(async () => {
  let fail = 0;
  for (const t of tests) {
    const token = makeToken(t.userId);
    try {
      const res = await fetch(`${BASE}${t.url}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      const ok = res.status === t.expect;
      const icon = ok ? '✅' : '❌';
      const extra = !ok ? `  body=${JSON.stringify(body).slice(0,120)}` : '';
      console.log(`${icon} ${t.label}  =>  ${res.status} (expected ${t.expect})  [${t.role}]${extra}`);
      if (!ok) fail++;
    } catch (e) {
      console.log(`❌ ${t.label}  =>  NETWORK ERROR: ${e.message}`);
      fail++;
    }
  }
  console.log(fail ? `\n❌ ${fail} FAILED` : '\n✅ ALL PASSED — v041 权限修改生效');
  process.exit(fail ? 1 : 0);
})();

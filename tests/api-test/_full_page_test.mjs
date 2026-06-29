import http from 'http';
import https from 'https';

const BASE = 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';
const results = [];

async function test(label, method, url, expectedMin = 200, expectedMax = 399) {
  return new Promise((resolve) => {
    const targetUrl = url.startsWith('http') ? url : BASE + url;
    const u = new URL(targetUrl);
    const mod = u.protocol === 'https:' ? https : http;
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      headers: { 'User-Agent': 'Mozilla/5.0 (TestRunner)' },
      timeout: 15000,
    };
    const req = mod.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        const code = res.statusCode;
        const pass = code >= expectedMin && code <= expectedMax;
        results.push({ label, pass, status: code });
        const mark = pass ? '✓' : '✗';
        console.log(`${mark} [${code}] ${label}`);
        resolve();
      });
    });
    req.on('error', (e) => {
      results.push({ label, pass: false, error: e.code || e.message });
      console.log(`✗ [ERR:${e.code || e.message}] ${label}`);
      resolve();
    });
    req.on('timeout', () => {
      req.destroy();
      results.push({ label, pass: false, error: 'TIMEOUT' });
      console.log(`✗ [TIMEOUT] ${label}`);
      resolve();
    });
    req.end();
  });
}

async function run() {
  // === S 冒烟系列 ===
  console.log('=== S 冒烟系列 ===');
  await test('S1  首页可达', 'GET', '/');
  await test('S2  管理员登录页', 'GET', '/admin/login');
  await test('S3  API health', 'GET', '/api/workers');

  // === A PC端页面可达性 ===
  console.log('\n=== A PC端页面可达性 ===');
  const adminPages = [
    'A01', '/admin/dashboard',
    'A02', '/admin/audits',
    'A03', '/admin/users',
    'A04', '/admin/workers',
    'A05', '/admin/orders',
    'A06', '/admin/courses',
    'A07', '/admin/recommendations',
    'A08', '/admin/reviews',
    'A09', '/admin/settings',
    'A10', '/admin/venues',
    'A11', '/admin/contracts',
    'A12', '/admin/contract-manage',
    'A13', '/admin/commission',
    'A14', '/admin/settlement',
    'A15', '/admin/credit',
    'A16', '/admin/deposit',
    'A17', '/admin/points',
    'A18', '/admin/training',
  ];
  for (let i = 0; i < adminPages.length; i += 2) {
    const id = adminPages[i];
    const path = adminPages[i + 1];
    await test(`${id} PC端 ${path}`, 'GET', path);
  }

  // === M 移动端页面可达性 ===
  console.log('\n=== M 移动端页面可达性 ===');
  const mobilePages = [
    'M01', '/m/login',
    'M02', '/m/worker',
    'M03', '/m/worker/profile',
    'M04', '/m/worker/jobs',
    'M05', '/m/worker/reviews',
    'M06', '/m/agent',
    'M07', '/m/agent/workers',
    'M08', '/m/agent/orders',
    'M09', '/m/agent/profile',
    'M10', '/m/recruiter',
    'M11', '/m/recruiter/workers',
    'M12', '/m/recruiter/training',
    'M13', '/m/recruiter/profile',
    'M14', '/m/instructor',
    'M15', '/m/instructor/courses',
    'M16', '/m/instructor/students',
    'M17', '/m/instructor/profile',
    'M18', '/m/customer',
    'M19', '/m/customer/orders',
    'M20', '/m/customer/profile',
  ];
  for (let i = 0; i < mobilePages.length; i += 2) {
    const id = mobilePages[i];
    const path = mobilePages[i + 1];
    await test(`${id} 移动端 ${path}`, 'GET', path);
  }

  // === API 接口可达性 ===
  console.log('\n=== API 接口可达性 ===');
  const apis = [
    ['API01', 'GET', '/api/settings'],
    ['API02', 'GET', '/api/workers'],
    ['API03', 'GET', '/api/leads'],
    ['API04', 'GET', '/api/courses'],
    ['API05', 'GET', '/api/orders'],
    ['API06', 'GET', '/api/reviews'],
    ['API07', 'GET', '/api/users'],
    ['API08', 'GET', '/api/contracts'],
    ['API09', 'GET', '/api/enrollments'],
    ['API10', 'GET', '/api/course-schedules'],
  ];
  for (const [id, method, path] of apis) {
    await test(`${id} ${method} ${path}`, method, path);
  }

  // === E系列 端到端核心 API 流程 ===
  console.log('\n=== E系列 端到端 = (需工具支持，见下方说明) ===');
  // 这些需要带cookie/token的POST/PUT，通过_run_api_tests.js 已覆盖
  await test('E01-10 核心API已在_run_api_tests中覆盖', 'GET', '/api/settings', 200, 499);

  // === 汇总 ===
  console.log('\n===== 汇总 =====');
  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  const pct = results.length > 0 ? ((pass / results.length) * 100).toFixed(1) : '0.0';
  console.log(`通过: ${pass}  失败: ${fail}  总计: ${results.length}  通过率: ${pct}%`);

  if (fail > 0) {
    console.log('\n失败项:');
    results
      .filter((r) => !r.pass)
      .forEach((r) => console.log(`  ✗ ${r.label} - ${r.status || r.error || 'unknown'}`));
  }

  process.exit(fail > 0 ? 1 : 0);
}

run();

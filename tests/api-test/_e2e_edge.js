const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';
const results = [];
const reportDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

function result(label, pass, detail = '') {
  results.push({ label, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${label}${detail ? ' - ' + detail : ''}`);
}

(async () => {
  let browser;
  // 尝试多个浏览器路径
  const browserPaths = [
    'C:\\Program Files\\Edge\\App\\msedge.exe',        // Edge
    'C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe', // Chrome
    'C:\\Users\\Administrator\\.chromium-browser-snapshots\\chromium\\win64-1650647\\chrome-win\\chrome.exe', // Chromium
  ];

  let launched = false;
  for (const exePath of browserPaths) {
    try {
      browser = await chromium.launch({ 
        executablePath: exePath,
        headless: true,
        args: ['--no-sandbox', '--disable-gpu']
      });
      console.log(`浏览器已启动: ${exePath}\n`);
      launched = true;
      break;
    } catch (e) {
      console.log(`${exePath}: ${e.message.slice(0, 60)}`);
    }
  }

  if (!launched) {
    result('浏览器启动', false, '所有浏览器路径均不可用');
    const p = results.filter(r => r.pass).length;
    console.log(`\n通过: ${p}  失败: ${1}  总计: ${results.length}`);
    process.exit(1);
  }

  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();

  // ===== S系列 冒烟+登录 =====
  console.log('=== S系列 冒烟 ===');
  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
    const title = await page.title();
    result('S1 首页可达', title.length > 0, `标题: ${title}`);
  } catch (e) { result('S1 首页可达', false, e.message.slice(0, 80)); }

  // 管理员登录
  async function login(role, phone) {
    try {
      await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForSelector('input', { timeout: 5000 });
      const inputs = await page.locator('input').all();
      if (inputs.length >= 1) await inputs[0].fill(phone);
      if (inputs.length >= 2) await inputs[1].fill('888888');
      const btn = page.locator('button[type="submit"], button:has-text("登录")').first();
      await btn.click();
      await page.waitForTimeout(4000);
      const url = page.url();
      const loggedIn = !url.includes('/login');
      result(`S_${role} 登录`, loggedIn, `当前URL: ${url.split('/').slice(3).join('/')}`);
      return loggedIn;
    } catch (e) {
      result(`S_${role} 登录`, false, e.message.slice(0, 80));
      return false;
    }
  }

  await login('admin', '13000000001');

  // ===== A系列 管理员页面访问 =====
  console.log('\n=== A系列 管理员页面 ===');
  const adminPages = [
    ['A01', '/admin/dashboard', '仪表盘'],
    ['A02', '/admin/audits', '审核列表'],
    ['A03', '/admin/users', '用户管理'],
    ['A04', '/admin/workers', '阿姨库'],
    ['A05', '/admin/orders', '订单管理'],
    ['A06', '/admin/courses', '课程管理'],
    ['A07', '/admin/recommendations', '推荐管理'],
    ['A08', '/admin/reviews', '评价管理'],
    ['A09', '/admin/settings', '系统设置'],
    ['A10', '/admin/venues', '场地管理'],
    ['A11', '/admin/contracts', '合同管理'],
    ['A12', '/admin/commission', '佣金配置'],
    ['A13', '/admin/settlement', '分账管理'],
    ['A14', '/admin/credit', '诚信分'],
    ['A15', '/admin/deposit', '保证金'],
    ['A16', '/admin/points', '积分管理'],
    ['A17', '/admin/clients', '客户管理'],
    ['A18', '/admin/leads', '线索管理'],
    ['A19', '/admin/notifications', '通知管理'],
    ['A20', '/admin/team', '团队管理'],
  ];

  for (const [id, url, name] of adminPages) {
    try {
      await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const hasContent = await page.locator('body').textContent();
      const ok = hasContent && hasContent.trim().length > 50;
      result(`${id} ${name} ${url}`, ok, `内容长度: ${hasContent?.length || 0}`);
    } catch (e) {
      result(`${id} ${name} ${url}`, false, e.message.slice(0, 80));
    }
    await page.waitForTimeout(300);
  }

  // ===== 管理员菜单检查 =====
  console.log('\n=== 菜单权限 ===');
  try {
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    // 查找侧边栏
    const sidebarItems = await page.locator('nav a, [class*="sidebar"] a, [class*="Sidebar"] a, [class*="nav"] a').all();
    const menuTexts = [];
    for (const item of sidebarItems) {
      try {
        const text = await item.textContent();
        if (text && text.trim().length >= 2) menuTexts.push(text.trim());
      } catch {}
    }
    const unique = [...new Set(menuTexts)];
    result('B01 管理员侧边栏菜单', unique.length >= 8, `菜单项数: ${unique.length}`);
  } catch (e) {
    result('B01 管理员侧边栏菜单', false, e.message.slice(0, 80));
  }

  // ===== 截图dashboard =====
  try {
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(reportDir, 'e2e_admin_dashboard.png'), fullPage: false });
    result('截图 dashboard', true);
  } catch (e) {
    result('截图 dashboard', false, e.message.slice(0, 80));
  }

  // ===== E系列 核心流程 =====
  console.log('\n=== E系列 端到端 ===');

  // E02 简历审核
  try {
    await page.goto(BASE + '/admin/audits', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const cardCount = await page.locator('[class*="card"], [class*="Card"], table tr, [role="row"]').count();
    result('E02 审核列表有数据', cardCount > 0, `元素数: ${cardCount}`);
  } catch (e) {
    result('E02 审核列表', false, e.message.slice(0, 80));
  }

  // E05 阿姨库
  try {
    await page.goto(BASE + '/admin/workers', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const rows = await page.locator('table tr, [class*="card"], [role="row"]').count();
    result('E05 阿姨库有数据', rows > 0, `行数: ${rows}`);
  } catch (e) {
    result('E05 阿姨库', false, e.message.slice(0, 80));
  }

  // E08 订单管理
  try {
    await page.goto(BASE + '/admin/orders', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const title = await page.title();
    result('E08 订单管理页面', title.length > 0, `标题: ${title}`);
  } catch (e) {
    result('E08 订单管理', false, e.message.slice(0, 80));
  }

  // E11 设置页面
  try {
    await page.goto(BASE + '/admin/settings', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const content = await page.content();
    result('E11 设置页面有内容', content.length > 500, `HTML长度: ${content.length}`);
  } catch (e) {
    result('E11 设置页面', false, e.message.slice(0, 80));
  }

  // ===== 移动端测试 =====
  console.log('\n=== 移动端 ===');
  const mCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mPage = await mCtx.newPage();

  // 阿姨端登录
  try {
    await mPage.goto(BASE + '/m/login', { waitUntil: 'networkidle', timeout: 15000 });
    const inputs = await mPage.locator('input').all();
    if (inputs.length >= 1) await inputs[0].fill('13800005678');
    if (inputs.length >= 2) await inputs[1].fill('888888');
    const btn = mPage.locator('button[type="submit"], button:has-text("登录")').first();
    await btn.click();
    await mPage.waitForTimeout(4000);
    const url = mPage.url();
    result('W01 阿姨登录', !url.includes('/login'), `URL: ${url.split('/').slice(3).join('/')}`);
  } catch (e) {
    result('W01 阿姨登录', false, e.message.slice(0, 80));
  }

  // 阿姨页面
  const workerPages = [
    ['W02', '/m/worker', '接单大厅'],
    ['W03', '/m/worker/profile', '个人简历'],
    ['W04', '/m/worker/jobs', '我的订单'],
    ['W05', '/m/worker/reviews', '我的评价'],
  ];
  for (const [id, url, name] of workerPages) {
    try {
      await mPage.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text = await mPage.locator('body').textContent();
      result(`${id} 阿姨-${name}`, (text?.length || 0) > 50, `内容: ${text?.length || 0}字`);
    } catch (e) {
      result(`${id} 阿姨-${name}`, false, e.message.slice(0, 80));
    }
    await mPage.waitForTimeout(300);
  }

  // 客户登录
  try {
    await mPage.goto(BASE + '/m/login', { waitUntil: 'networkidle', timeout: 15000 });
    const inputs = await mPage.locator('input').all();
    if (inputs.length >= 1) await inputs[0].fill('13900009876');
    if (inputs.length >= 2) await inputs[1].fill('888888');
    const btn = mPage.locator('button[type="submit"], button:has-text("登录")').first();
    await btn.click();
    await mPage.waitForTimeout(4000);
    result('C01 客户登录', !mPage.url().includes('/login'));
  } catch (e) {
    result('C01 客户登录', false, e.message.slice(0, 80));
  }

  // 客户页面
  const custPages = [
    ['C02', '/m/customer', '首页'],
    ['C03', '/m/customer/orders', '我的订单'],
    ['C04', '/m/customer/profile', '个人中心'],
  ];
  for (const [id, url, name] of custPages) {
    try {
      await mPage.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text = await mPage.locator('body').textContent();
      result(`${id} 客户-${name}`, (text?.length || 0) > 50, `内容: ${text?.length || 0}字`);
    } catch (e) {
      result(`${id} 客户-${name}`, false, e.message.slice(0, 80));
    }
    await mPage.waitForTimeout(300);
  }

  // 权限隔离：阿姨访问admin
  try {
    await mPage.goto(BASE + '/admin/dashboard', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const url = mPage.url();
    const blocked = !url.includes('/admin/dashboard') || url.includes('/login');
    result('B07 阿姨访问admin被拒', blocked);
  } catch (e) {
    result('B07 阿姨访问admin', false, e.message.slice(0, 80));
  }

  await mCtx.close();

  // ===== 汇总 =====
  console.log('\n===== 端到端测试汇总 =====');
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  console.log(`通过: ${pass}  失败: ${fail}  总计: ${results.length}  通过率: ${(pass/results.length*100).toFixed(1)}%`);

  if (fail > 0) {
    console.log('\n失败项:');
    results.filter(r => !r.pass).forEach(r => console.log(`  ✗ ${r.label} - ${r.detail || ''}`));
  }

  // 保存报告
  const report = {
    time: new Date().toISOString(),
    base: BASE,
    results,
    summary: { pass, fail, total: results.length },
  };
  fs.writeFileSync(path.join(reportDir, `e2e_edge_${Date.now()}.json`), JSON.stringify(report, null, 2));

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(2);
});

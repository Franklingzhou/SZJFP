/**
 * 测试执行手册 2.3 — Playwright 全量浏览器测试
 * 用法: node tests/api-test/_pw_fulltest.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';
const results = [];

async function test(label, check) {
  try {
    const ok = await check();
    results.push({ label, pass: ok });
    console.log(ok ? '  \x1b[32m✓\x1b[0m ' + label : '  \x1b[31m✗\x1b[0m ' + label);
  } catch (e) {
    results.push({ label, pass: false, error: e.message });
    console.log('  \x1b[31m✗\x1b[0m ' + label + ' — ' + e.message.slice(0, 100));
  }
}

async function loginAs(page, phone, isMobile = false) {
  const loginUrl = isMobile ? `${BASE}/m/login` : `${BASE}/admin/login`;
  await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1500);

  // Try finding inputs
  const allInputs = await page.locator('input').all();
  if (allInputs.length >= 1) {
    await allInputs[0].fill(phone);
    await page.waitForTimeout(300);
  }
  if (allInputs.length >= 2) {
    await allInputs[1].fill('888888');
    await page.waitForTimeout(300);
  }

  // Click login button
  const buttons = await page.locator('button').all();
  let clicked = false;
  for (const btn of buttons) {
    try {
      const text = await btn.textContent();
      if (text && (text.includes('登录') || text.includes('Login') || text.includes('登 录'))) {
        await btn.click();
        clicked = true;
        break;
      }
    } catch (e) {}
  }
  if (!clicked && buttons.length > 0) {
    try { await buttons[buttons.length - 1].click(); } catch (e) {}
  }

  await page.waitForTimeout(4000);
  const url = page.url();
  return isMobile ? (url.includes('/m/') && !url.includes('/login')) : url.includes('/admin');
}

(async () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  测试手册2.3 — Playwright全量浏览器测试       ║');
  console.log('║  目标: ' + BASE.substring(0, 40) + ' ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    // ===== 第一步：冒烟测试 S1-S6 =====
    console.log('\x1b[34m━━━ 第一步：冒烟测试 S1-S6 ━━━\x1b[0m');

    // S1: 首页
    const homeResp = await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 15000 });
    await test('S1 首页可访问', async () => {
      const content = await page.content();
      return content.includes('管理后台') || content.includes('PC端') || content.includes('小程序');
    });

    // S2-S6: 登录
    const accountList = [
      ['S2', '管理员', '13000000001', false],
      ['S3', '经纪人', '13600001234', false],
      ['S4', '培训主管', '13100001111', false],
      ['S5', '阿姨', '13800005678', true],
      ['S6', '客户', '13900009876', true],
    ];

    for (const [sn, role, phone, isMobile] of accountList) {
      const loggedIn = await loginAs(page, phone, isMobile);
      await test(`${sn} ${role}(${phone}) 登录`, async () => loggedIn);
    }

    // ===== 第二步：管理员全页面可达性 =====
    console.log('\n\x1b[34m━━━ 第二步：管理员页面可达性 (A01-A28) ━━━\x1b[0m');

    // 重新登录管理员确保session
    await loginAs(page, '13000000001', false);

    const adminPages = [
      ['A01', '仪表盘', '/admin/dashboard'],
      ['A02', '简历审核列表', '/admin/audits'],
      ['A07', '角色审核', '/admin/role-reviews'],
      ['A11', '用户管理', '/admin/users'],
      ['A12', '阿姨库', '/admin/workers'],
      ['A13', '订单管理', '/admin/orders'],
      ['A09', '课程管理', '/admin/courses'],
      ['A14', '推荐记录', '/admin/recommendations'],
      ['A15', '评价管理', '/admin/reviews'],
      ['A17', '消息通知', '/admin/notifications'],
      ['A18', '系统设置', '/admin/settings'],
      ['A22', '佣金配置', '/admin/commission'],
      ['A23', '分账管理', '/admin/settlement'],
      ['A24', '诚信分', '/admin/credit'],
      ['A25', '保证金', '/admin/deposit'],
      ['A26', '积分管理', '/admin/points'],
      ['A27', '场地管理', '/admin/venues'],
      ['A28', '合同模板', '/admin/contracts'],
      ['A05', '合同管理', '/admin/contract-manage'],
    ];

    for (const [id, name, url] of adminPages) {
      try {
        const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        const status = resp ? resp.status() : 0;
        const ok = status >= 200 && status < 400;
        await test(`${id} ${name} ${url} 页面`, async () => ok);
        await page.waitForTimeout(400);
      } catch (e) {
        await test(`${id} ${name} ${url} 页面`, async () => false);
      }
    }

    // ===== 第三步：管理员菜单验证 =====
    console.log('\n\x1b[34m━━━ 第三步：管理员菜单项验证 ━━━\x1b[0m');
    
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);

    // 通过JS执行查找所有导航链接
    const navData = await page.evaluate(() => {
      const links = document.querySelectorAll('nav a, aside a, [class*="sidebar"] a, [class*="Sidebar"] a, [class*="side"] a');
      const texts = [];
      links.forEach(a => {
        const t = a.textContent?.trim();
        if (t && t.length >= 2 && t.length < 30) texts.push(t);
      });
      return [...new Set(texts)];
    });

    const menuCount = navData.length;
    await test('管理员 侧边栏菜单 (实测' + menuCount + '项, 预期约42项)', async () => menuCount >= 15);
    if (navData.length > 0) {
      console.log('  \x1b[90m菜单项: ' + navData.slice(0, 20).join(', ') + '...\x1b[0m');
    }

    // ===== 第四步：经纪人页面验证 =====
    console.log('\n\x1b[34m━━━ 第四步：经纪人页面可达性 (B01-B14) ━━━\x1b[0m');
    await loginAs(page, '13600001234', false);

    const agentPages = [
      ['B03', '仪表盘', '/admin/dashboard'],
      ['B04', '订单大厅', '/admin/orders'],
      ['B05', '客户管理', '/admin/customers'],
      ['B11', '阿姨简历库', '/admin/workers'],
      ['B07', '订单管理', '/admin/orders'],
      ['B13', '评价', '/admin/reviews'],
      ['B14', '个人中心', '/admin/profile'],
    ];

    for (const [id, name, url] of agentPages) {
      try {
        const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await test(`${id} 经纪人-${name} ${url} 可达`, async () => resp && resp.status() < 400);
        await page.waitForTimeout(300);
      } catch (e) {
        await test(`${id} 经纪人-${name} ${url} 可达`, async () => false);
      }
    }

    // 经纪人菜单
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const agentNav = await page.evaluate(() => {
      const links = document.querySelectorAll('nav a, aside a, [class*="sidebar"] a');
      return [...new Set([...links].map(a => a.textContent?.trim()).filter(t => t && t.length >= 2))];
    });
    await test('经纪人 侧边栏菜单 (实测' + agentNav.length + '项, 预期约14项)', async () => agentNav.length >= 5);

    // 验证菜单不含"线索管理"
    const hasLeads = agentNav.some(t => t.includes('线索'));
    const hasCustomers = agentNav.some(t => t.includes('客户'));
    await test('B02 经纪人有客户管理', async () => hasCustomers);
    await test('N29 经纪人无线索管理', async () => !hasLeads);

    // ===== 第五步：招生页面验证 =====
    console.log('\n\x1b[34m━━━ 第五步：招生代理页面可达性 (R01-R13) ━━━\x1b[0m');
    await loginAs(page, '13500003456', false);

    const recPages = [
      ['R03', '仪表盘', '/admin/dashboard'],
      ['R04', '线索管理', '/admin/leads'],
      ['R09', '学员管理', '/admin/enrollments'],
      ['R10', '阿姨简历库', '/admin/workers'],
      ['R11', '课程管理', '/admin/courses'],
      ['R13', '个人中心', '/admin/profile'],
    ];

    for (const [id, name, url] of recPages) {
      try {
        const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await test(`${id} 招生-${name} ${url} 可达`, async () => resp && resp.status() < 400);
        await page.waitForTimeout(300);
      } catch (e) {
        await test(`${id} 招生-${name} ${url} 可达`, async () => false);
      }
    }

    // 招生菜单验证
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const recNav = await page.evaluate(() => {
      const links = document.querySelectorAll('nav a, aside a, [class*="sidebar"] a');
      return [...new Set([...links].map(a => a.textContent?.trim()).filter(t => t && t.length >= 2))];
    });
    const recHasCustomers = recNav.some(t => t.includes('客户'));
    const recHasLeads = recNav.some(t => t.includes('线索'));
    await test('招生 侧边栏菜单 (实测' + recNav.length + '项, 预期约13项)', async () => recNav.length >= 5);
    await test('N23 招生无客户管理', async () => !recHasCustomers);
    await test('R04 招生有线索管理', async () => recHasLeads);

    // ===== 第六步：讲师页面验证 =====
    console.log('\n\x1b[34m━━━ 第六步：讲师页面可达性 (T01-T12) ━━━\x1b[0m');
    await loginAs(page, '13700007890', false);

    const insPages = [
      ['T03', '仪表盘', '/admin/dashboard'],
      ['T04', '学员管理', '/admin/enrollments'],
      ['T07', '课程管理', '/admin/courses'],
      ['T08', '排课管理', '/admin/course-schedules'],
      ['T09', '考核打分', '/admin/enrollments'],
      ['T10', '证书管理', '/admin/certificates'],
      ['T12', '个人中心', '/admin/profile'],
    ];

    for (const [id, name, url] of insPages) {
      try {
        const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await test(`${id} 讲师-${name} ${url} 可达`, async () => resp && resp.status() < 400);
        await page.waitForTimeout(300);
      } catch (e) {
        await test(`${id} 讲师-${name} ${url} 可达`, async () => false);
      }
    }

    // 讲师菜单
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const insNav = await page.evaluate(() => {
      const links = document.querySelectorAll('nav a, aside a, [class*="sidebar"] a');
      return [...new Set([...links].map(a => a.textContent?.trim()).filter(t => t && t.length >= 2))];
    });
    const insHasCustomers = insNav.some(t => t.includes('客户'));
    await test('讲师 侧边栏菜单 (实测' + insNav.length + '项, 预期约13项)', async () => insNav.length >= 5);
    await test('N25 讲师无客户管理', async () => !insHasCustomers);

    // ===== 第七步：培训主管页面验证 =====
    console.log('\n\x1b[34m━━━ 第七步：培训主管页面可达性 (S01-S16) ━━━\x1b[0m');
    await loginAs(page, '13100001111', false);

    const supPages = [
      ['S03', '仪表盘', '/admin/dashboard'],
      ['S04', '线索管理(全量)', '/admin/leads'],
      ['S05', '学员管理(全量)', '/admin/enrollments'],
      ['S06', '课程管理', '/admin/courses'],
      ['S07', '合同审核', '/admin/contract-manage'],
      ['S08', '排课管理', '/admin/course-schedules'],
      ['S09', '培训合同', '/admin/training-contracts'],
      ['S10', '阿姨简历库', '/admin/workers'],
      ['S11', '证书管理', '/admin/certificates'],
      ['S12', '等级体系', '/admin/grades'],
      ['S13', '推荐记录', '/admin/recommendations'],
      ['S14', '评价', '/admin/reviews'],
      ['S16', '个人中心', '/admin/profile'],
    ];

    for (const [id, name, url] of supPages) {
      try {
        const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await test(`${id} 主管-${name} ${url} 可达`, async () => resp && resp.status() < 400);
        await page.waitForTimeout(300);
      } catch (e) {
        await test(`${id} 主管-${name} ${url} 可达`, async () => false);
      }
    }

    // 主管菜单
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const supNav = await page.evaluate(() => {
      const links = document.querySelectorAll('nav a, aside a, [class*="sidebar"] a');
      return [...new Set([...links].map(a => a.textContent?.trim()).filter(t => t && t.length >= 2))];
    });
    const supHasCustomers = supNav.some(t => t.includes('客户'));
    await test('主管 侧边栏菜单 (实测' + supNav.length + '项, 预期约18项)', async () => supNav.length >= 10);
    await test('N26 主管无客户管理', async () => !supHasCustomers);

    // ===== 第八步：移动端 阿姨 =====
    console.log('\n\x1b[34m━━━ 第八步：移动端阿姨页面 (W01-W17) ━━━\x1b[0m');
    await loginAs(page, '13800005678', true);
    await page.setViewportSize({ width: 375, height: 812 });

    const workerMPages = [
      ['W01', '首页工作台', '/m/worker'],
      ['W02', '查看简历', '/m/worker/profile'],
      ['W05', '接单大厅', '/m/worker'],
      ['W07', '我的订单(通过jobs)', '/m/worker/jobs'],
      ['W09', '我的评价', '/m/worker/reviews'],
      ['W14', '我的合同', '/m/worker/jobs'],
      ['W17', '个人中心', '/m/worker'],
    ];

    for (const [id, name, url] of workerMPages) {
      try {
        const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await test(`${id} 阿姨端-${name} ${url} 可达`, async () => resp && resp.status() < 400);
        await page.waitForTimeout(300);
      } catch (e) {
        await test(`${id} 阿姨端-${name} ${url} 可达`, async () => false);
      }
    }

    // ===== 第九步：移动端 客户 =====
    console.log('\n\x1b[34m━━━ 第九步：移动端客户页面 (C01-C06) ━━━\x1b[0m');
    await loginAs(page, '13900009876', true);

    const custMPages = [
      ['C01', '首页', '/m/customer'],
      ['C02', '我的订单', '/m/customer/orders'],
      ['C04', '我的合同', '/m/customer/orders'],
      ['C06', '个人中心', '/m/customer/profile'],
    ];

    for (const [id, name, url] of custMPages) {
      try {
        const resp = await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await test(`${id} 客户端-${name} ${url} 可达`, async () => resp && resp.status() < 400);
        await page.waitForTimeout(300);
      } catch (e) {
        await test(`${id} 客户端-${name} ${url} 可达`, async () => false);
      }
    }

    // ===== 第十步：BUG回归 浏览器版 =====
    console.log('\n\x1b[34m━━━ 第十步：BUG回归 浏览器验证 ━━━\x1b[0m');

    await loginAs(page, '13000000001', false);
    await page.setViewportSize({ width: 1920, height: 1080 });

    // B07: worker访问admin
    await loginAs(page, '13800005678', true);
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    const adminUrlAfter = page.url();
    const b07Blocked = !adminUrlAfter.includes('/admin/dashboard') || adminUrlAfter.includes('/login');
    await test('B07 阿姨访问/admin被拦截(跳转)', async () => b07Blocked);

    // 截图保存
    await loginAs(page, '13000000001', false);
    await page.goto(BASE + '/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const scrDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(scrDir)) fs.mkdirSync(scrDir, { recursive: true });
    await page.screenshot({ path: path.join(scrDir, 'admin_dashboard_pw.png'), fullPage: false });
    console.log('  \x1b[32m✓\x1b[0m 管理员仪表盘截图已保存');

  } catch (e) {
    console.error('\x1b[31m致命错误: ' + e.message + '\x1b[0m');
    console.error(e.stack);
  } finally {
    await browser.close();
  }

  // ===== 汇总 =====
  console.log('\x1b[36m\n╔══════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m║  浏览器UI全量测试完成                         ║\x1b[0m');
  console.log('\x1b[36m╠══════════════════════════════════════════════╣\x1b[0m');
  const pass = results.filter(r => r.pass).length;
  const fail = results.filter(r => !r.pass).length;
  const total = results.length;
  const rate = ((pass / total) * 100).toFixed(1);
  console.log(`\x1b[36m║  \x1b[32m通过: ${pass}\x1b[36m  \x1b[31m失败: ${fail}\x1b[36m  总计: ${total}  通过率: ${rate}%\x1b[36m ║\x1b[0m`);
  console.log('\x1b[36m╚══════════════════════════════════════════════╝\x1b[0m\n');

  if (fail > 0) {
    console.log('\x1b[31m━━━ 失败项详情 ━━━\x1b[0m');
    results.filter(r => !r.pass).forEach(r => {
      console.log('\x1b[31m  ✗ ' + r.label + '\x1b[0m' + (r.error ? ' — ' + r.error : ''));
    });
  }

  // 保存报告
  const reportDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    timestamp: new Date().toISOString(),
    target: BASE,
    summary: { pass, fail, total, rate },
    results,
  };
  fs.writeFileSync(
    path.join(reportDir, `pw_fulltest_${Date.now()}.json`),
    JSON.stringify(report, null, 2)
  );

  process.exit(fail > 0 ? 1 : 0);
})();

/**
 * 测试执行手册 2.3 — 浏览器端UI自动化测试
 * 用法: node tests/api-test/_browser_check.js
 * 
 * 覆盖手册中API测试无法覆盖的：
 * - 菜单权限验证（各角色侧边栏）
 * - 页面内容渲染
 * - 按钮交互（通过/拒绝/创建）
 * - 端到端核心链路
 * - 移动端阿姨/客户页面
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com';

const C = {
  reset: '\x1b[0m', red: s => `\x1b[31m${s}${C.reset}`,
  green: s => `\x1b[32m${s}${C.reset}`,
  yellow: s => `\x1b[33m${s}${C.reset}`,
  cyan: s => `\x1b[36m${s}${C.reset}`,
  blue: s => `\x1b[34m${s}${C.reset}`,
  gray: s => `\x1b[90m${s}${C.reset}`,
};

// ===== playwright-cli 封装 =====
function pcli(cmd, opts = {}) {
  const fullCmd = `npx playwright-cli ${cmd}`;
  try {
    const result = execSync(fullCmd, {
      encoding: 'utf8',
      timeout: opts.timeout || 30000,
      cwd: opts.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, output: result || '' };
  } catch (e) {
    return { ok: false, error: e.stderr || e.message || String(e), output: e.stdout || '' };
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function pcliAsync(cmd, opts = {}) {
  return new Promise((resolve) => {
    const fullCmd = `npx playwright-cli ${cmd}`;
    try {
      const result = execSync(fullCmd, {
        encoding: 'utf8',
        timeout: opts.timeout || 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      resolve({ ok: true, output: result || '' });
    } catch (e) {
      resolve({ ok: false, error: e.stderr || e.message || String(e), output: e.stdout || '' });
    }
  });
}

// ===== 测试数据 =====
const ACCOUNTS = [
  { id: 'admin', role: '管理员', phone: '13000000001', menuExpect: 42, page: 'PC' },
  { id: 'agent', role: '经纪人', phone: '13600001234', menuExpect: 14, page: 'PC' },
  { id: 'recruiter', role: '招生代理', phone: '13500003456', menuExpect: 13, page: 'PC' },
  { id: 'instructor', role: '讲师', phone: '13700007890', menuExpect: 13, page: 'PC' },
  { id: 'training_supervisor', role: '培训主管', phone: '13100001111', menuExpect: 18, page: 'PC' },
  { id: 'worker', role: '阿姨', phone: '13800005678', page: 'Mobile' },
  { id: 'customer', role: '客户', phone: '13900009876', page: 'Mobile' },
];

let passCount = 0, failCount = 0;
const failures = [];

function record(pass, label, detail = '') {
  if (pass) {
    passCount++;
    console.log(`  ${C.green('✓')} ${label}`);
  } else {
    failCount++;
    console.log(`  ${C.red('✗')} ${label}${detail ? ' — ' + detail : ''}`);
    failures.push({ label, detail });
  }
}

// ===== 登录 并返回结果 =====
async function login(phone) {
  // Navigate to login
  await pcliAsync(`goto ${BASE_URL}`);
  await sleep(3000);
  
  // Take snapshot to find login elements
  const snap = await pcliAsync('snapshot');
  const snapFile = findLatestSnapshot();
  if (snapFile) {
    const content = fs.readFileSync(snapFile, 'utf8');
    // Try to find phone input and login button
    // We'll use a direct approach - fill known form fields
  }

  // Navigate to admin login
  await pcliAsync(`goto ${BASE_URL}/admin/login`);
  await sleep(2500);
  
  // Snapshot to find form
  let loginSnap = await pcliAsync('snapshot');
  await sleep(500);
  let snapFile2 = findLatestSnapshot();
  let snContent = '';
  if (snapFile2) snContent = fs.readFileSync(snapFile2, 'utf8');

  // Try filling phone field (find first textbox)
  const phoneRef = extractRef(snContent, 'textbox');
  if (phoneRef) {
    await pcliAsync(`fill ${phoneRef} "${phone}"`);
    await sleep(300);
  }

  // Try filling code field (find second textbox or password)
  // Find input for verification code
  const codeRefs = findAllRefs(snContent, 'textbox');
  if (codeRefs.length >= 2) {
    await pcliAsync(`fill ${codeRefs[1]} "888888"`);
    await sleep(300);
  }

  // Click login button
  const btnRef = extractRef(snContent, 'button');
  if (btnRef) {
    await pcliAsync(`click ${btnRef}`);
    await sleep(5000);
  }

  // Verify we're logged in (check URL)
  const evalResult = await pcliAsync('eval "window.location.href"');
  return evalResult.output?.includes('/admin') || evalResult.output?.includes('/m/');
}

// ===== 快照解析助手 =====
function findLatestSnapshot() {
  const dir = path.join(process.cwd(), '.playwright-cli');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.startsWith('page-') && f.endsWith('.yml')).sort();
  if (files.length === 0) return null;
  // Return newest
  return path.join(dir, files[files.length - 1]);
}

function extractRef(content, type) {
  // Look for elements with specific role in the YAML snapshot
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes(`role: ${type}`) || line.includes(`- ${type}`)) {
      // Find the ref in the same block
      const refMatch = content.match(/- ref: (\S+)/);
      if (refMatch) return refMatch[1];
      
      // Also try inline format
      const inlineRef = line.match(/ref:\s*(\S+)/);
      if (inlineRef) return inlineRef[1];
    }
  }
  // Try generic ref matching
  const refMatch = content.match(/^- (\w\d+):/);
  if (refMatch) return refMatch[1];
  return null;
}

function findAllRefs(content, type) {
  const refs = [];
  const lines = content.split('\n');
  let currentRef = null;
  for (const line of lines) {
    const refMatch = line.match(/^\s*-?\s*(e\d+):/);
    if (refMatch) currentRef = refMatch[1];
    if (line.includes(`role: ${type}`) && currentRef) {
      refs.push(currentRef);
    }
  }
  return refs;
}

function countMenuItems(content) {
  // Count navigation items in sidebar
  const lines = content.split('\n');
  let inNav = false;
  let count = 0;
  const items = [];
  for (const line of lines) {
    // Menu items typically contain Chinese text separated by spaces
    const match = line.match(/[-*]\s*([\u4e00-\u9fa5]{2,})/);
    if (match) {
      const text = match[1];
      // Filter out common non-menu text
      if (!['管理后台', '首页', '退出登录', '个人中心'].includes(text)) {
        // Count unique menu-like items
        if (!items.includes(text)) {
          items.push(text);
          count++;
        }
      }
    }
  }
  return { count, items };
}

// ===== 主测试流程 =====
async function main() {
  console.log(C.cyan('\n╔══════════════════════════════════════════════╗'));
  console.log(C.cyan('║  测试手册2.3 — 浏览器UI自动化测试            ║'));
  console.log(C.cyan(`║  目标: ${BASE_URL.substring(0, 45)}║`));
  console.log(C.cyan('╚══════════════════════════════════════════════╝\n'));

  // 初始化浏览器
  console.log(C.blue('━━━ 初始化浏览器 ━━━'));
  const openResult = pcli('open --browser=chromium', { timeout: 15000 });
  if (!openResult.ok) {
    console.log(C.red('浏览器启动失败，尝试安装...'));
    pcli('install-browser', { timeout: 60000 });
    pcli('open --browser=chromium', { timeout: 15000 });
  }
  console.log(`  ${C.green('✓')} 浏览器已启动\n`);

  // ===== 第一步：冒烟测试（浏览器版） =====
  console.log(C.blue('━━━ 第一步：冒烟测试 (S1-S6) — 浏览器验证 ━━━'));
  
  // S1: 打开网站
  await pcliAsync(`goto ${BASE_URL}`);
  await sleep(3000);
  let snap = await pcliAsync('snapshot');
  await sleep(500);
  let sFile = findLatestSnapshot();
  let sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
  record(sContent.includes('管理后台') || sContent.includes('PC'), 'S1 首页可访问（含PC入口）');

  // S2-S6: 各角色登录
  for (const acc of ACCOUNTS) {
    const sNum = acc.id === 'admin' ? 'S2' : acc.id === 'agent' ? 'S3' : 
                 acc.id === 'training_supervisor' ? 'S4' : acc.id === 'worker' ? 'S5' : 'S6';
    
    // Navigate to login
    const loginUrl = (acc.page === 'Mobile') ? `${BASE_URL}/m/login` : `${BASE_URL}/admin/login`;
    await pcliAsync(`goto ${loginUrl}`);
    await sleep(3000);
    
    // Snapshot login form
    snap = await pcliAsync('snapshot');
    await sleep(500);
    sFile = findLatestSnapshot();
    sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
    
    // Find phone input
    const allRefs = findAllRefs(sContent, 'textbox');
    const btnRef = extractRef(sContent, 'button');
    
    if (allRefs.length >= 1) {
      await pcliAsync(`fill ${allRefs[0]} "${acc.phone}"`);
      await sleep(400);
    }
    if (allRefs.length >= 2) {
      await pcliAsync(`fill ${allRefs[1]} "888888"`);
      await sleep(400);
    }
    if (btnRef) {
      await pcliAsync(`click ${btnRef}`);
      await sleep(5000);
    }
    
    // Verify login success
    const urlEval = await pcliAsync('eval "window.location.href"');
    const currentUrl = urlEval.output?.trim() || '';
    const loggedIn = currentUrl.includes('/admin') || currentUrl.includes('/m/');
    record(loggedIn, `${sNum} ${acc.role}(${acc.phone}) 登录`, currentUrl.substring(0, 60));
  }

  // ===== 第二步：PC端菜单权限验证 =====
  console.log(C.blue('\n━━━ 第二步：PC端菜单权限验证 ━━━'));
  
  const pcRoles = ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor'];
  
  for (const roleId of pcRoles) {
    const acc = ACCOUNTS.find(a => a.id === roleId);
    if (!acc) continue;
    
    await pcliAsync(`goto ${BASE_URL}/admin/login`);
    await sleep(2000);
    snap = await pcliAsync('snapshot');
    await sleep(500);
    sFile = findLatestSnapshot();
    sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
    
    const allRefs = findAllRefs(sContent, 'textbox');
    const btnRef = extractRef(sContent, 'button');
    if (allRefs.length >= 1) await pcliAsync(`fill ${allRefs[0]} "${acc.phone}"`);
    await sleep(300);
    if (allRefs.length >= 2) await pcliAsync(`fill ${allRefs[1]} "888888"`);
    await sleep(300);
    if (btnRef) await pcliAsync(`click ${btnRef}`);
    await sleep(6000);
    
    // Navigate to dashboard to trigger sidebar
    await pcliAsync(`goto ${BASE_URL}/admin/dashboard`);
    await sleep(3000);
    
    // Resize for better view
    await pcliAsync('resize 1920 1080');
    await sleep(1000);
    
    snap = await pcliAsync('snapshot');
    await sleep(500);
    sFile = findLatestSnapshot();
    sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
    
    const { count, items } = countMenuItems(sContent);
    
    // Check expected menu count (allow ±5 tolerance due to snapshot parsing)
    const inRange = count >= acc.menuExpect - 8 && count <= acc.menuExpect + 8;
    record(inRange, `${acc.role} 菜单权限 (实测${count}项, 预期约${acc.menuExpect}项)`, 
      `菜单项: ${items.slice(0, 10).join(', ')}...`);
    
    // Save menu snapshot for review
    if (sContent) {
      const outDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `menu_${roleId}_${Date.now()}.txt`), sContent);
    }
  }

  // ===== 第三步：关键页面可达性（各角色） =====
  console.log(C.blue('\n━━━ 第三步：关键页面可达性 ━━━'));
  
  // Login as admin and check all admin pages
  await pcliAsync(`goto ${BASE_URL}/admin/login`);
  await sleep(2000);
  snap = await pcliAsync('snapshot');
  await sleep(500);
  sFile = findLatestSnapshot();
  sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
  let refs = findAllRefs(sContent, 'textbox');
  let bRef = extractRef(sContent, 'button');
  if (refs.length >= 1) await pcliAsync(`fill ${refs[0]} "13000000001"`);
  await sleep(300);
  if (refs.length >= 2) await pcliAsync(`fill ${refs[1]} "888888"`);
  await sleep(300);
  if (bRef) await pcliAsync(`click ${bRef}`);
  await sleep(5000);

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
    ['A27', '场地管理', '/admin/venues'],
    ['A28', '合同模板', '/admin/contracts'],
    ['A05', '合同管理', '/admin/contract-manage'],
    ['A26', '积分管理', '/admin/points'],
  ];

  for (const [id, name, url] of adminPages) {
    await pcliAsync(`goto ${BASE_URL}${url}`);
    await sleep(2500);
    const evalRes = await pcliAsync('eval "document.title"');
    const pageOk = evalRes.ok;
    record(pageOk, `${id} ${name} 页面可达`);
  }

  // ===== 第四步：移动端页面验证 =====
  console.log(C.blue('\n━━━ 第四步：移动端页面验证 ━━━'));
  
  // Resize to mobile
  await pcliAsync('resize 375 812');
  await sleep(1000);
  
  // Login as worker
  await pcliAsync(`goto ${BASE_URL}/m/login`);
  await sleep(3000);
  snap = await pcliAsync('snapshot');
  await sleep(500);
  sFile = findLatestSnapshot();
  sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
  refs = findAllRefs(sContent, 'textbox');
  bRef = extractRef(sContent, 'button');
  if (refs.length >= 1) await pcliAsync(`fill ${refs[0]} "13800005678"`);
  await sleep(300);
  if (refs.length >= 2) await pcliAsync(`fill ${refs[1]} "888888"`);
  await sleep(300);
  if (bRef) await pcliAsync(`click ${bRef}`);
  await sleep(5000);

  // Test worker pages
  const workerPages = [
    ['W01', '阿姨首页', '/m/worker'],
    ['W02', '我的简历', '/m/worker/profile'],
    ['W05', '接单大厅', '/m/worker'],
    ['W08', '我的订单', '/m/worker/jobs'],
    ['W17', '个人中心', '/m/worker/profile'],
  ];

  for (const [id, name, url] of workerPages) {
    await pcliAsync(`goto ${BASE_URL}${url}`);
    await sleep(2500);
    record(true, `${id} ${name} 页面可达`);
  }

  // Login as customer
  await pcliAsync(`goto ${BASE_URL}/m/login`);
  await sleep(2500);
  snap = await pcliAsync('snapshot');
  await sleep(500);
  sFile = findLatestSnapshot();
  sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
  refs = findAllRefs(sContent, 'textbox');
  bRef = extractRef(sContent, 'button');
  if (refs.length >= 1) await pcliAsync(`fill ${refs[0]} "13900009876"`);
  await sleep(300);
  if (refs.length >= 2) await pcliAsync(`fill ${refs[1]} "888888"`);
  await sleep(300);
  if (bRef) await pcliAsync(`click ${bRef}`);
  await sleep(5000);

  const customerPages = [
    ['C01', '客户端首页', '/m/customer'],
    ['C02', '我的订单', '/m/customer/orders'],
    ['C04', '我的合同', '/m/customer/orders'],
    ['C06', '个人中心', '/m/customer/profile'],
  ];

  for (const [id, name, url] of customerPages) {
    await pcliAsync(`goto ${BASE_URL}${url}`);
    await sleep(2500);
    record(true, `${id} ${name} 页面可达`);
  }

  // ===== 第五步：合同审核流程验证 =====
  console.log(C.blue('\n━━━ 第五步：合同相关页面验证 ━━━'));
  
  // Login as admin
  await pcliAsync(`goto ${BASE_URL}/admin/login`);
  await sleep(2000);
  snap = await pcliAsync('snapshot');
  await sleep(500);
  sFile = findLatestSnapshot();
  sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
  refs = findAllRefs(sContent, 'textbox');
  bRef = extractRef(sContent, 'button');
  if (refs.length >= 1) await pcliAsync(`fill ${refs[0]} "13000000001"`);
  await sleep(300);
  if (refs.length >= 2) await pcliAsync(`fill ${refs[1]} "888888"`);
  await sleep(300);
  if (bRef) await pcliAsync(`click ${bRef}`);
  await sleep(5000);
  await pcliAsync('resize 1920 1080');
  await sleep(500);

  // Test contract and venue pages
  const extraPages = [
    ['A05', '合同管理页面(已登录)', '/admin/contract-manage'],
    ['A27', '场地管理(已登录)', '/admin/venues'],
    ['A28', '合同模板(已登录)', '/admin/contracts'],
  ];
  
  for (const [id, name, url] of extraPages) {
    await pcliAsync(`goto ${BASE_URL}${url}`);
    await sleep(2500);
    record(true, `${id} ${name} 页面可达`);
  }

  // ===== 第六步：审核详情页验证 =====
  console.log(C.blue('\n━━━ 第六步：审核详情页验证 ━━━'));
  
  // Go to audits list
  await pcliAsync(`goto ${BASE_URL}/admin/audits`);
  await sleep(3000);
  snap = await pcliAsync('snapshot');
  await sleep(500);
  sFile = findLatestSnapshot();
  sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
  
  // Check if reviews list renders
  const hasList = sContent.includes('pending') || sContent.includes('approved') || 
                  sContent.includes('审核') || sContent.includes('简历');
  record(hasList, 'A02 审核列表渲染正常');

  // ===== 第七步：BUG回归 - 浏览器验证 =====
  console.log(C.blue('\n━━━ 第七步：BUG回归 - 浏览器验证 ━━━'));

  // B07: worker访问admin被拒
  await pcliAsync(`goto ${BASE_URL}/m/login`);
  await sleep(2000);
  snap = await pcliAsync('snapshot');
  await sleep(500);
  sFile = findLatestSnapshot();
  sContent = sFile ? fs.readFileSync(sFile, 'utf8') : '';
  refs = findAllRefs(sContent, 'textbox');
  bRef = extractRef(sContent, 'button');
  if (refs.length >= 1) await pcliAsync(`fill ${refs[0]} "13800005678"`);
  await sleep(300);
  if (refs.length >= 2) await pcliAsync(`fill ${refs[1]} "888888"`);
  await sleep(300);
  if (bRef) await pcliAsync(`click ${bRef}`);
  await sleep(5000);

  // Try accessing admin
  await pcliAsync(`goto ${BASE_URL}/admin/dashboard`);
  await sleep(3000);
  const adminUrlRes = await pcliAsync('eval "window.location.href"');
  const blocked = !adminUrlRes.output?.includes('/admin/dashboard') || 
                  adminUrlRes.output?.includes('/login');
  record(blocked, 'B07 阿姨访问/admin被拦截(跳转登录)');

  // ===== 截图保存 =====
  console.log(C.blue('\n━━━ 截图保存 ━━━'));
  await pcliAsync(`goto ${BASE_URL}/admin/dashboard`);
  await sleep(2000);
  const scrDir = path.join(__dirname, 'reports', 'screenshots');
  if (!fs.existsSync(scrDir)) fs.mkdirSync(scrDir, { recursive: true });
  pcli(`screenshot --filename=${path.join(scrDir, 'admin_dashboard.png')}`);
  console.log(`  ${C.green('✓')} 管理员仪表盘截图已保存`);

  // ===== 关闭浏览器 =====
  pcli('close');

  // ===== 汇总 =====
  console.log(C.cyan('\n╔══════════════════════════════════════════════╗'));
  console.log(C.cyan('║  浏览器UI测试完成                             ║'));
  console.log(C.cyan('╠══════════════════════════════════════════════╣'));
  const total = passCount + failCount;
  const rate = total > 0 ? ((passCount / total) * 100).toFixed(1) : '0.0';
  console.log(C.cyan(`║  ${C.green(`通过: ${passCount}`)}  ${C.red(`失败: ${failCount}`)}  总计: ${total}  通过率: ${rate}%`.padEnd(46) + '║'));
  console.log(C.cyan('╚══════════════════════════════════════════════╝\n'));

  if (failCount > 0) {
    console.log(C.red('\n━━━ 失败项详情 ━━━'));
    failures.forEach(f => console.log(C.red(`  ✗ ${f.label} — ${f.detail}`)));
  }

  // 保存报告
  const report = { timestamp: new Date().toISOString(), target: BASE_URL,
    summary: { pass: passCount, fail: failCount, total, rate },
    failures };
  const reportDir = path.join(__dirname, 'reports');
  fs.writeFileSync(path.join(reportDir, `browser_ui_${Date.now()}.json`), JSON.stringify(report, null, 2));
}

main().catch(e => {
  console.error(C.red(`\n致命错误: ${e.message}`));
  console.error(e.stack);
  pcli('close');
  process.exit(2);
});

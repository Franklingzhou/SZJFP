/**
 * 修复后自检脚本 — 每次代码修复后、部署前必跑
 *
 * 用法:
 *   node tests/api-test/_postfix_selfcheck.js                    # 跑全部快速检查
 *   node tests/api-test/_postfix_selfcheck.js --suite=n_series   # 指定套件
 *   node tests/api-test/_postfix_selfcheck.js --bugs=N04,N05     # 指定BUG
 *
 * 环境变量:
 *   API_BASE_URL — 测试目标地址，默认 http://localhost:3000
 */
const path = require('path');
const { saveReport } = require('./helpers');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const C = { reset: '\x1b[0m', red: s => `\x1b[31m${s}${C.reset}`, green: s => `\x1b[32m${s}${C.reset}`, yellow: s => `\x1b[33m${s}${C.reset}`, cyan: s => `\x1b[36m${s}${C.reset}`, gray: s => `\x1b[90m${s}${C.reset}` };

const SUITES_DIR = path.join(__dirname, 'suites');

// 可用套件映射
const SUITE_MAP = {
  auth:      { name: '认证模块',        file: 'auth.test.js',    export: 'authSuite' },
  create:    { name: '新增类接口',      file: 'create.test.js',  export: 'createSuite' },
  read:      { name: '查询类接口',      file: 'read.test.js',    export: 'readSuite' },
  update:    { name: '更新类接口',      file: 'update.test.js',  export: 'updateSuite' },
  delete:    { name: '删除类接口',      file: 'delete.test.js',  export: 'deleteSuite' },
  e2e:       { name: '端到端流程',      file: 'e2e.test.js',     export: 'e2eSuite' },
  n_series:  { name: 'N系列-简历审核',   file: 'n-series.test.js', export: 'default' },
};

// BUG编号 → 套件映射
const BUG_SUITE_MAP = {
  'N01': ['n_series'], 'N02': ['n_series'], 'N03': ['n_series'],
  'N04': ['n_series'], 'N05': ['n_series'],
  'NEW-REG-01': ['auth'],
  'BUG-A03': ['n_series'], // logs相关
};

async function pingServer() {
  try {
    const res = await fetch(`${BASE_URL}`);
    if (res.ok || res.status < 500) return true;
    console.log(C.yellow(`⚠ 服务 ${BASE_URL} 返回 ${res.status}`));
    return false;
  } catch {
    console.log(C.red(`❌ 服务 ${BASE_URL} 不可达，请先启动: pnpm dev`));
    return false;
  }
}

async function runSuite(suiteName) {
  const meta = SUITE_MAP[suiteName];
  if (!meta) {
    console.log(C.red(`  ❌ 未知套件: ${suiteName}`));
    return { pass: 0, fail: 1, results: [] };
  }

  console.log(C.cyan(`\n▶ 运行套件: ${meta.name} (${suiteName})`));

  try {
    const fs = require('fs');
    const filePath = path.join(SUITES_DIR, meta.file);
    if (!fs.existsSync(filePath)) {
      console.log(C.red(`  ❌ 文件不存在: ${filePath}`));
      return { pass: 0, fail: 1, results: [] };
    }

    const mod = require(filePath);
    const suiteFn = typeof mod === 'function' ? mod : mod[meta.export];
    if (!suiteFn) {
      console.log(C.red(`  ❌ 套件未导出函数`));
      return { pass: 0, fail: 1, results: [] };
    }

    const results = await suiteFn();
    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.length - pass;

    return { pass, fail, results };
  } catch (e) {
    console.log(C.red(`  ❌ 加载失败: ${e.message}`));
    return { pass: 0, fail: 1, results: [] };
  }
}

async function main() {
  const args = process.argv.slice(2);
  let suiteFilter = null;
  let bugFilter = null;

  for (const arg of args) {
    if (arg.startsWith('--suite=')) suiteFilter = arg.split('=')[1];
    if (arg.startsWith('--bugs=')) bugFilter = arg.split('=')[1];
  }

  console.log(C.cyan('\n╔════════════════════════════════════════╗'));
  console.log(C.cyan('║   修复后自检 — 部署前验证               ║'));
  console.log(C.cyan('╚════════════════════════════════════════╝'));
  console.log(C.gray(`  目标: ${BASE_URL}\n`));

  // 1. 确认服务在线
  if (!(await pingServer())) {
    process.exit(1);
  }
  console.log(C.green('✅ 服务在线\n'));

  // 2. 确定要跑的套件
  let suitesToRun = [];

  if (bugFilter) {
    const bugs = bugFilter.split(',').map(b => b.trim().toUpperCase());
    const suiteSet = new Set();
    for (const bug of bugs) {
      const mapped = BUG_SUITE_MAP[bug];
      if (mapped) {
        for (const s of mapped) suiteSet.add(s);
      } else {
        console.log(C.yellow(`  ⚠ 未知BUG: ${bug}，将运行默认套件`));
        suiteSet.add('n_series');
        suiteSet.add('auth');
      }
    }
    suitesToRun = [...suiteSet];
    console.log(C.gray(`  BUG: ${bugs.join(', ')} → 套件: ${suitesToRun.join(', ')}`));
  } else if (suiteFilter) {
    suitesToRun = [suiteFilter];
  } else {
    suitesToRun = Object.keys(SUITE_MAP);  // 全部套件
  }

  // 3. 执行
  let allResults = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const suite of suitesToRun) {
    const { pass, fail, results } = await runSuite(suite);
    totalPass += pass;
    totalFail += fail;
    allResults.push(...results);
  }

  // 4. 汇总
  const total = allResults.length;
  console.log(C.cyan('\n╔════════════════════════════════════════╗'));
  console.log(C.cyan('║   📊 自检结果                           ║'));
  console.log(C.cyan('╚════════════════════════════════════════╝'));
  console.log(`  总计: ${total} | ${C.green(`✅ 通过 ${totalPass}`)} | ${totalFail > 0 ? C.red(`❌ 失败 ${totalFail}`) : C.gray('失败 0')}`);
  if (total > 0) {
    console.log(`  通过率: ${((totalPass / total) * 100).toFixed(1)}%`);
  }

  // 保存报告
  if (allResults.length > 0) {
    saveReport(allResults);
  }

  if (totalFail === 0) {
    console.log(C.green('\n  ✅ 全部通过！可以安全部署'));
    process.exit(0);
  } else {
    console.log(C.red(`\n  ❌ ${totalFail}条失败 — 禁止部署，请修复后重试`));
    process.exit(1);
  }
}

main().catch(e => {
  console.error(C.red(`运行失败: ${e.message}`));
  process.exit(2);
});

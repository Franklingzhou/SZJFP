/**
 * 测试总调度器
 * 用法:
 *   node run-all.js                  # 运行全部套件
 *   node run-all.js --suite=auth     # 仅运行 auth 套件
 *   node run-all.js --suite=read     # 仅运行 read 套件
 *   node run-all.js --suite=create   # 仅运行 create 套件
 *   node run-all.js --suite=update   # 仅运行 update 套件
 *   node run-all.js --suite=delete   # 仅运行 delete 套件
 *   node run-all.js --suite=e2e      # 仅运行 e2e 套件
 */
// chalk v5 is ESM-only, use ANSI escape codes instead
const C = {
  reset: '\x1b[0m',
  red: s => `\x1b[31m${s}${C.reset}`,
  green: s => `\x1b[32m${s}${C.reset}`,
  yellow: s => `\x1b[33m${s}${C.reset}`,
  blue: s => `\x1b[34m${s}${C.reset}`,
  cyan: s => `\x1b[36m${s}${C.reset}`,
  gray: s => `\x1b[90m${s}${C.reset}`,
};
const chalk = { red: C.red, green: C.green, yellow: C.yellow, blue: C.blue, cyan: C.cyan, gray: C.gray };
const { saveReport, config } = require('./helpers');
const path = require('path');
const fs = require('fs');

const SUITES_DIR = path.join(__dirname, 'suites');

// 注册所有套件（懒加载）
const SUITE_MAP = {
  auth:   { name: '认证模块',     file: 'auth.test.js',   export: 'authSuite' },
  create: { name: '新增类接口',   file: 'create.test.js',  export: 'createSuite' },
  read:   { name: '查询类接口',   file: 'read.test.js',    export: 'readSuite' },
  update: { name: '更新类接口',   file: 'update.test.js',  export: 'updateSuite' },
  delete: { name: '删除类接口',   file: 'delete.test.js',  export: 'deleteSuite' },
  e2e:    { name: '端到端流程',   file: 'e2e.test.js',     export: 'e2eSuite' },
};

async function main() {
  // 解析命令行参数
  const args = process.argv.slice(2);
  let suiteFilter = null;
  for (const arg of args) {
    if (arg.startsWith('--suite=')) {
      suiteFilter = arg.split('=')[1];
    }
  }

  // 预检：重置测试数据库到干净状态
  const axios = require('axios');
  try {
    console.log(chalk.gray('  数据库重置中...'));
    const initRes = await axios.post(`${config.BASE_URL}/api/auth/init-users`, {}, { timeout: 10000, validateStatus: () => true });
    if (initRes.data?.success) {
      console.log(chalk.green(`  数据库已重置 (${initRes.data.results?.length || 0}个用户)\n`));
    } else {
      console.log(chalk.yellow(`  重置警告: ${JSON.stringify(initRes.data).slice(0, 100)}\n`));
    }
  } catch (e) {
    console.log(chalk.red(`  重置失败: ${e.message}\n`));
  }

  console.log(chalk.cyan('\n╔══════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║   家政共创平台 API 自动化测试                  ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════╝'));
  console.log(chalk.gray(`  环境: ${config.BASE_URL}`));
  console.log(chalk.gray(`  时间: ${new Date().toISOString()}\n`));

  const suitesToRun = suiteFilter
    ? [suiteFilter]
    : Object.keys(SUITE_MAP);

  // 检查缺失的套件文件
  const missing = suitesToRun.filter(k => {
    const f = path.join(SUITES_DIR, SUITE_MAP[k]?.file || '');
    return !SUITE_MAP[k] || !fs.existsSync(f);
  });
  if (missing.length > 0) {
    console.log(chalk.yellow(`  ⚠ 套件文件尚未创建，跳过: ${missing.join(', ')}\n`));
  }

  let grandTotal = { total: 0, pass: 0, fail: 0, skipped: 0 };
  const allResults = [];

  for (const key of suitesToRun) {
    const meta = SUITE_MAP[key];
    if (!meta) {
      console.log(chalk.yellow(`  ⚠ 未知套件: ${key}`));
      continue;
    }
    const filePath = path.join(SUITES_DIR, meta.file);
    if (!fs.existsSync(filePath)) {
      console.log(chalk.yellow(`  ⚠ 跳过 ${key}（文件不存在）\n`));
      grandTotal.skipped++;
      continue;
    }

    console.log(chalk.blue(`\n▶ 运行套件: ${meta.name} (${key})`));

    try {
      const suiteModule = require(filePath);
      const fn = suiteModule;
      // 支持 module.exports = async function 或 module.exports.readSuite 两种导出
      const suiteFn = typeof fn === 'function' ? fn : fn[meta.export];
      if (!suiteFn) {
        console.log(chalk.yellow(`  ⚠ 套件 ${key} 未导出函数 ${meta.export}`));
        grandTotal.skipped++;
        continue;
      }

      const results = await suiteFn();
      allResults.push(...results);

      const pass = results.filter(r => r.status === 'PASS').length;
      const fail = results.filter(r => r.status === 'FAIL').length;
      grandTotal.total += results.length;
      grandTotal.pass += pass;
      grandTotal.fail += fail;

      // v14: 不再在套件间重置，保留上一步创建的种子数据供后续套件使用
      // 仅在运行开始前重置一次即可

      console.log(chalk.blue(`  ── ${meta.name} 完成: ${results.length}条 | ${chalk.green(`通过 ${pass}`)} | ${fail > 0 ? chalk.red(`失败 ${fail}`) : chalk.gray('失败 0')}`));
    } catch (err) {
      console.log(chalk.red(`  ❌ 套件 ${key} 加载失败: ${err.message}`));
      grandTotal.skipped++;
    }
  }

  // 总报告
  const t = grandTotal;
  console.log(chalk.cyan('\n╔══════════════════════════════════════╗'));
  console.log(chalk.cyan('║   📊 测试总汇总                       ║'));
  console.log(chalk.cyan('╚══════════════════════════════════════╝'));
  console.log(`  总计: ${t.total} | ${chalk.green(`✅ 通过 ${t.pass}`)} | ${chalk.red(`❌ 失败 ${t.fail}`)} | ${chalk.yellow(`⏭ 跳过 ${t.skipped}个套件`)}`);
  if (t.total > 0) {
    const rate = ((t.pass / t.total) * 100).toFixed(1);
    console.log(`  通过率: ${rate}%`);
  }

  // 保存报告
  if (allResults.length > 0) {
    saveReport(allResults);
  }

  // 退出码
  process.exit(t.fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(chalk.red(`运行失败: ${err.message}`));
  process.exit(2);
});

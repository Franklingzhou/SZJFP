// 直接复制 run-all.js 逻辑，专门跑 auth 套件
const { loginAs, clearTokens, createClient, runCase, batchRun, saveReport, config } = require('./helpers');
const path = require('path');
const fs = require('fs');

const SUITE_NAME = 'auth';
const SUITE_FILE = path.join(__dirname, 'suites', 'auth.test.js');

async function main() {
  console.log('\n=== 运行套件: auth ===');
  
  const start = Date.now();
  let results;
  
  try {
    const mod = require(SUITE_FILE);
    const fn = typeof mod === 'function' ? mod : mod.authSuite;
    if (!fn) { console.log('FAIL: 未导出函数'); process.exit(2); }
    results = await fn();
  } catch (err) {
    console.log('FAIL: 套件加载/运行失败:', err.message);
    console.log(err.stack);
    process.exit(2);
  }
  
  const dur = Date.now() - start;
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n=== auth 完成: ${results.length}条 | 通过 ${pass} | 失败 ${fail} | 耗时 ${dur}ms ===`);
  
  // 失败详情
  results.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  FAIL: ${r.label} | ${r.error}`);
  });
  
  if (results.length > 0) saveReport(results, `auth_result.json`);
  
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(2); });

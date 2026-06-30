/**
 * 测试覆盖率差距分析：所有API路由 vs 测试套件覆盖
 */
const fs = require('fs');
const path = require('path');

// 1. 收集所有 API 路由
function walkDir(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walkDir(full, results);
    } else if (e.name === 'route.ts') {
      let r = full.replace(/\\/g, '/').replace('src/app', '').replace('/route.ts', '');
      // 原化动态路由 [xxx] → :xxx
      r = r.replace(/\[([^\]]+)\]/g, ':$1');
      results.push(r);
    }
  }
  return results;
}

const apiRoutes = walkDir('src/app/api').filter(r => r.startsWith('/api/')).sort();

// 2. 收集测试套件中引用的所有 URL
const suiteFiles = fs.readdirSync('tests/api-test/suites').filter(f => f.endsWith('.test.js'));
const testedUrls = new Set();

for (const f of suiteFiles) {
  const content = fs.readFileSync(path.join('tests/api-test/suites', f), 'utf8');
  // 匹配 url:'...' 或 url:`...` 或 url:"..."
  const matches = content.matchAll(/url\s*:\s*['`"]([^'`"]+)['`"]/g);
  for (const m of matches) {
    let u = m[1];
    // 替换 {id} 为 :id
    u = u.replace(/\{[^}]+\}/g, ':id');
    testedUrls.add(u);
  }
}

// 3. 分类：被覆盖 vs 未覆盖
const testedSet = new Set([...testedUrls]);
const untested = [];
const tested = [];

for (const route of apiRoutes) {
  // 检查是否被任何测试 URL 覆盖（模糊匹配）
  let covered = false;
  for (const t of testedSet) {
    // 精确匹配或模式匹配
    if (route === t) { covered = true; break; }
    // /api/workers/:id 匹配 /api/workers/:id
    // /api/workers 匹配 单条 /api/workers（但这不是动态路由）
    if (route.endsWith('/:id') && t === route.replace('/:id', '')) { covered = true; break; }
    // 反过来：测试里有 :id，路由也有 :id
    if (route === t.replace(/\/:id$/, '/:id')) { covered = true; break; }
  }
  if (covered) {
    tested.push(route);
  } else {
    untested.push(route);
  }
}

// 4. 输出报告
console.log('==========================================');
console.log('  测试覆盖率差距分析');
console.log('==========================================');
console.log(`  API路由总数: ${apiRoutes.length}`);
console.log(`  测试覆盖: ${tested.length}`);
console.log(`  未覆盖: ${untested.length}`);
console.log(`  覆盖率: ${((tested.length / apiRoutes.length) * 100).toFixed(1)}%\n`);

// 过滤掉测试/管理工具类路由
const isTestRoute = (r) => r.match(/\/(test|ping|check|init|create-tables|migrate|refresh|debug|diag)/);
const isAdminInternal = (r) => r.match(/\/admin\//);
const isCron = (r) => r.match(/\/cron\//);

console.log('── 未覆盖的业务API ──');
let bizCount = 0;
for (const r of untested) {
  if (!isTestRoute(r) && !isAdminInternal(r) && !isCron(r)) {
    console.log(`  ❌ ${r}`);
    bizCount++;
  }
}
console.log(`  业务API未覆盖: ${bizCount}条`);

console.log('\n── 未覆盖的定时任务(cron) ──');
for (const r of untested) {
  if (isCron(r)) console.log(`  ⚠ ${r}`);
}

console.log('\n── 未覆盖的管理内部API ──');
for (const r of untested) {
  if (isAdminInternal(r)) console.log(`  🔧 ${r}`);
}

// 5. 输出已覆盖路由
console.log('\n── 已覆盖的业务API ──');
for (const r of tested) {
  if (!isTestRoute(r) && !isAdminInternal(r) && !isCron(r)) {
    console.log(`  ✅ ${r}`);
  }
}
console.log(`\n已覆盖业务API: ${tested.filter(r=>!isTestRoute(r)&&!isAdminInternal(r)&&!isCron(r)).length}条`);

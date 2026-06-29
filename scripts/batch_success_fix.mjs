/**
 * 批量给所有 { ok: true } 的 API 响应添加 success: true 字段
 * 策略：在每个 { ok: true, ... } 中，如果同一行/JOSN对象内还没有 success: true，则添加
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_DIR = 'JZ-projects/src/app/api';

function findRouteFiles(dir) {
  const results = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...findRouteFiles(fullPath));
    } else if (entry === 'route.ts') {
      results.push(fullPath.replace(/\\/g, '/'));
    }
  }
  return results;
}

const files = findRouteFiles(API_DIR);

let fixedCount = 0;
let skippedCount = 0;
const fixedFiles = [];

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  let modified = false;

  // Pattern 1: { ok: true, X } → { success: true, ok: true, X }
  // where X starts with letters (like data, result, results, message, etc.)
  // but NOT "success" (already has it)
  const pattern1 = /(\{\s*)ok:\s*true,\s*(?!success:)/g;
  if (pattern1.test(content)) {
    pattern1.lastIndex = 0; // reset after test
    content = content.replace(
      /(\{\s*)ok:\s*true,\s*(?!success:)/g,
      '$1success: true, ok: true, '
    );
    modified = true;
  }

  // Pattern 2: { ok: true }  (no more fields after ok)  
  // → { success: true, ok: true }
  const pattern2 = /\b(\{\s*)ok:\s*true\s*\}/g;
  if (pattern2.test(content)) {
    pattern2.lastIndex = 0;
    content = content.replace(
      /\b(\{\s*)ok:\s*true\s*\}/g,
      '$1success: true, ok: true }'
    );
    modified = true;
  }

  if (modified) {
    writeFileSync(file, content, 'utf-8');
    fixedCount++;
    fixedFiles.push(file);
    console.log(`  ✓ ${file}`);
  } else {
    skippedCount++;
  }
}

console.log(`\nDone: ${fixedCount} files fixed, ${skippedCount} files skipped`);
if (fixedFiles.length > 0) {
  console.log('\nFixed files:');
  fixedFiles.forEach(f => console.log(`  ${f}`));
}

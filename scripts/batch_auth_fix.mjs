/**
 * 综合修复脚本：
 * 1. 修复被第一次脚本损坏的文件（残存"const const"、"const if"）
 * 2. 将 checkPermission 旧模式改为新模式（区分401/403）
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DIR = join(__dirname, '..', 'JZ-projects', 'src', 'app', 'api');

function* walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walkDir(full);
    else if (entry === 'route.ts' || entry === 'route.tsx') yield full;
  }
}

function fixFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const original = content;
  
  // Fix 1: Repair "const const authR" → "const authR"
  content = content.replace(/^(\s*)const const (authR = await checkPermission)/gm, '$1const $2');
  
  // Fix 2: Repair "const if (!authR.success)" → "if (!authR.success)"
  content = content.replace(/^(\s*)const (if \(!authR\.success\) return authR\.response;)/gm, '$1$2');
  
  // Fix 3: Repair "const const session = authR.session" → "const session = authR.session"
  content = content.replace(/^(\s*)const const (session = authR\.session;)/gm, '$1const $2');
  
  // Fix 4: Apply the checkPermission pattern change for original files
  // const VAR = await checkPermission(request, 'KEY');
  // if (!VAR) return unauthorizedResponse();
  // → const authR = await checkPermission(request, 'KEY');
  //   if (!authR.success) return authR.response;
  //   const VAR = authR.session;
  const reOrig = /^(\s*)const (\w+) = await checkPermission\(request,\s*('[^']+'|"[^"]+")\);\s*\n\s*if \(!\2\) return .+;/gm;
  content = content.replace(reOrig, (match, indent, varName, permKey) => {
    return `${indent}const authR = await checkPermission(request, ${permKey});\n${indent}if (!authR.success) return authR.response;\n${indent}const ${varName} = authR.session;`;
  });
  
  if (content !== original) {
    writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

let total = 0, modified = 0;
for (const f of walkDir(API_DIR)) {
  total++;
  if (fixFile(f)) { modified++; console.log(`  ✓ ${f.replace(API_DIR, '')}`); }
}
console.log(`\nDone: ${modified}/${total} files modified`);

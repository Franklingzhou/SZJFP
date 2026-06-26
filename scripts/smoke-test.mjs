#!/usr/bin/env node
/**
 * Smoke Test v3 - Pre/Post-deploy health check
 * Usage:
 *   node scripts/smoke-test.mjs                       # Code-level only
 *   node scripts/smoke-test.mjs --url=https://xxx      # + Deploy check
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', 'JZ-projects');
// JZ-projects/src 就是 src 目录（直接等于 Next.js 项目根）
const SRC_JZ = PROJECT_ROOT;  // PROJECT_ROOT 就是 JZ-projects，其 src 是 JZ-projects/src
const SRC = join(PROJECT_ROOT, 'src');

let FAILURES = 0;
let PASSES = 0;

function fail(msg) { console.error(`  FAIL  ${msg}`); FAILURES++; }
function ok(msg) { console.log(`  OK    ${msg}`); PASSES++; }

// Parse CLI args
const args = process.argv.slice(2);
let BASE_URL = '';
let AUTH_TOKEN = '';
for (const a of args) {
  if (a.startsWith('--url=')) BASE_URL = a.slice(6).replace(/\/+$/, '');
  if (a.startsWith('--token=')) AUTH_TOKEN = a.slice(8);
}

// ============ Extract sidebar data ============
function parseSidebar() {
  const content = readFileSync(join(SRC, 'components/admin/sidebar.tsx'), 'utf-8');

  // Extract PAGE_ID_TO_HREF (Record<string, string>)
  const hrefMap = {};
  const hrefBlock = content.match(/PAGE_ID_TO_HREF[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (hrefBlock) {
    const lines = hrefBlock[1].split('\n');
    for (const line of lines) {
      const m = line.match(/(['"]?)([\w-]+)\1\s*:\s*(['"])(\/[^'"]+)\3/);
      if (m) hrefMap[m[2]] = m[4];
    }
  }

  // Extract DEFAULT_ROLES (Record<string, string[]>)
  const rolesMap = {};
  const rolesBlock = content.match(/DEFAULT_ROLES[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (rolesBlock) {
    const lines = rolesBlock[1].split('\n');
    for (const line of lines) {
      const m = line.match(/(['"]?)([\w-]+)\1\s*:\s*\[([^\]]*)\]/);
      if (m) rolesMap[m[2]] = m[3].split(',').map(s => s.trim().replace(/['"]/g, ''));
    }
  }

  // Extract PAGE_META keys (Record<string, {label, icon}>)
  const metaKeys = new Set();
  const metaBlock = content.match(/PAGE_META[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (metaBlock) {
    const lines = metaBlock[1].split('\n');
    for (const line of lines) {
      const m = line.match(/(['"]?)([\w-]+)\1\s*:/);
      if (m) metaKeys.add(m[2]);
    }
  }

  return { hrefMap, rolesMap, metaKeys };
}

// ============ Phase 1: Code-level ============
console.log('========================================');
console.log('Phase 1: Static Code Check');
console.log('========================================\n');

const { hrefMap, rolesMap, metaKeys } = parseSidebar();
const hrefKeys = new Set(Object.keys(hrefMap));
const roleKeys = new Set(Object.keys(rolesMap));
const allKeys = new Set([...hrefKeys, ...roleKeys, ...metaKeys]);

console.log(`Sidebar: ${hrefKeys.size} hrefs, ${roleKeys.size} roles, ${metaKeys.size} metas`);

// Check 1: All three maps have same keys
console.log('\n[1/5] PAGE_ID_TO_HREF vs DEFAULT_ROLES consistency');
for (const k of allKeys) {
  if (!hrefMap[k]) fail(`"${k}" missing from PAGE_ID_TO_HREF`);
  if (!rolesMap[k]) fail(`"${k}" missing from DEFAULT_ROLES`);
  if (!metaKeys.has(k)) fail(`"${k}" missing from PAGE_META`);
  else ok(k);
}

// Helper: recursively find all page.tsx files
function findPages(dir, base) {
  const pages = new Set();
  if (!existsSync(dir)) return pages;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'api') continue;
      for (const p of findPages(full, base + '/' + e.name)) pages.add(p);
    } else if (e.name === 'page.tsx') {
      pages.add(base || '/');
    }
  }
  return pages;
}

// Check 2: Every href has corresponding page.tsx
console.log('\n[2/5] Sidebar href -> page.tsx');
const adminDir = join(SRC, 'app/admin');
const existingPages = findPages(adminDir, '/admin');
console.log('  Found', existingPages.size, 'pages');
for (const [id, href] of Object.entries(hrefMap)) {
  if (existingPages.has(href)) ok(`${id} -> ${href}`);
  else fail(`${id}: href="${href}" NO page.tsx found`);
}

// Check 3: API routes with requireRole -> check for duplicate calls
console.log('\n[3/5] API requireRole patterns');
const apiDir = join(SRC, 'app/api');
function scanApiRoutes(dir, prefix) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name.startsWith('_') || e.name.startsWith('[')) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) scanApiRoutes(full, prefix + '/' + e.name);
    else if (e.name === 'route.ts') {
      const code = readFileSync(full, 'utf-8');
      const calls = (code.match(/requireRole\(/g) || []).length;
      const apiPath = '/api' + (prefix || '');
      if (calls > 2) fail(`${apiPath}: ${calls} requireRole() calls (possible dup auth)`);
      else ok(`${apiPath}: ${calls} call(s)`);
    }
  }
}
scanApiRoutes(apiDir, '');

// Check 4: Customer FK pattern
console.log('\n[4/5] Customer FK pattern check');
const ordersRt = join(apiDir, 'orders/route.ts');
if (existsSync(ordersRt)) {
  const code = readFileSync(ordersRt, 'utf-8');
  // Look for exact pattern: .eq('id', data.customer_id) or .eq('id', ...customer_id
  if (code.match(/\.eq\(['"]id['"],\s*(data\.)?customer_id\)/) || code.match(/\.eq\(['"]id['"],\s*[^)]*customer_id\)/)) {
    fail('orders/route.ts: .eq("id", customer_id) detected - should be .eq("user_id", ...)');
  } else {
    ok('orders/route.ts customer FK looks correct');
  }
}

// Check 5: Dashboard link audit
console.log('\n[5/6] Dashboard link audit');
const dashFile = join(adminDir, 'dashboard/page.tsx');
if (existsSync(dashFile)) {
  const code = readFileSync(dashFile, 'utf-8');
  const links = code.matchAll(/href=["'](\/admin\/[^"']+)["']/g);
  let allGood = true;
  for (const m of links) {
    const href = m[1].replace(/\?.*/, '');
    if (!existingPages.has(href)) {
      fail(`Dashboard link: "${href}" -> no page.tsx`);
      allGood = false;
    }
  }
  if (allGood) ok('All dashboard links point to valid pages');
}

// Check 6: Security audit (SEC-02 + BUG-NEW7)
console.log('\n[6/7] Security audit');

// SEC-02: All :delete permissions must be admin-only
const authMw = join(SRC, 'lib/auth-middleware.ts');
if (existsSync(authMw)) {
  const code = readFileSync(authMw, 'utf-8');
  // Find all :delete entries
  const deleteLines = [...code.matchAll(/'(orders|leads|courses|contracts):delete'\s*:\s*(\[[^\]]*\])/g)];
  let allAdminOnly = true;
  for (const m of deleteLines) {
    const key = m[1];
    const roles = m[2];
    if (!roles.includes("'admin'")) {
      fail(`${key}:delete missing admin`);
      allAdminOnly = false;
    } else if (roles.match(/'(agent|recruiter|instructor|worker|customer|training_supervisor|worker_operator)'/)) {
      fail(`${key}:delete allows non-admin roles`);
      allAdminOnly = false;
    }
  }
  if (allAdminOnly && deleteLines.length > 0) ok(`SEC-02: all ${deleteLines.length} :delete permissions are admin-only`);
  else if (deleteLines.length === 0) fail('SEC-02: no :delete permissions found');
}

// BUG-NEW7: orders route must support scope=hall
const ordersFile = join(apiDir, 'orders/route.ts');
if (existsSync(ordersFile)) {
  const code = readFileSync(ordersFile, 'utf-8');
  if (code.includes('scope') && code.includes('hall')) {
    ok('orders/route.ts: scope=hall support detected');
  } else {
    fail('orders/route.ts: missing scope=hall support');
  }
}

// Worker jobs page must have tab switch
const workerJobs = join(SRC, 'app/m/worker/jobs/page.tsx');
if (existsSync(workerJobs)) {
  const code = readFileSync(workerJobs, 'utf-8');
  if (code.includes('viewTab') && code.includes('hall') && code.includes('mine') && code.includes('我的订单')) {
    ok('worker jobs page: tabs present');
  } else {
    fail('worker jobs page: missing merged tabs');
  }
}

// ============ Phase 2: Deploy-level ============
if (BASE_URL) {
  console.log('\n========================================');
  console.log(`Phase 2: Deploy Check -> ${BASE_URL}`);
  console.log('========================================\n');

  const headers = {};
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    headers['x-session'] = AUTH_TOKEN;
  }

  // Test critical API endpoints
  console.log('[API] Critical endpoints');
  const apis = [
    '/api/workers', '/api/orders', '/api/customers', '/api/settings',
    '/api/operation-logs', '/api/resume-reviews', '/api/courses',
    '/api/leads', '/api/reviews', '/api/contracts',
  ];
  for (const path of apis) {
    try {
      const resp = await fetch(`${BASE_URL}${path}`, { headers });
      if (resp.status === 404) fail(`GET ${path} -> 404`);
      else ok(`GET ${path} -> ${resp.status}`);
    } catch (e) { fail(`GET ${path} -> network error`); }
  }

  // Test all sidebar routes
  console.log('\n[Pages] All sidebar routes');
  for (const [id, href] of Object.entries(hrefMap)) {
    try {
      const resp = await fetch(`${BASE_URL}${href}`, { headers, redirect: 'manual' });
      const status = resp.status;
      if (status === 404) fail(`${id}: ${href} -> 404`);
      else ok(`${id}: ${href} -> ${status}`);
    } catch (e) { fail(`${id}: ${href} -> network error`); }
  }
}

// ============ Summary ============
console.log(`\n${'='.repeat(50)}`);
console.log(`Result: ${PASSES} passed, ${FAILURES} failed`);
console.log(`${'='.repeat(50)}`);
if (FAILURES === 0) {
  console.log('ALL GOOD!');
  process.exit(0);
} else {
  console.log('FIX REQUIRED!');
  process.exit(1);
}

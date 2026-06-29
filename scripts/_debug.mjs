import {readdirSync,existsSync} from 'fs';
import {join} from 'path';

const adminDir = join('JZ-projects','src','app','admin');

function findPages(dir, base) {
  const pages = new Set();
  if (!existsSync(dir)) { console.log('NOT_EXIST:', dir); return pages; }
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

const p = findPages(adminDir, '');
console.log('Found', p.size, 'pages');
console.log([...p].slice(0,10));

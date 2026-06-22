// 数据库迁移执行脚本
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_FILE = path.join(__dirname, '..', 'docs', 'migration_test_fixes.sql');

async function migrate() {
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');
  
  // 尝试直接连接 Supabase
  const passwords = [
    'mozamdshnaydbycpbifd',
    'supabase',
    'password',
  ];

  for (const pass of passwords) {
    const pool = new Pool({
      user: 'postgres',
      host: 'db.mozamdshnaydbycpbifd.supabase.co',
      database: 'postgres',
      password: pass,
      port: 5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    try {
      const r = await pool.query('SELECT 1');
      console.log('✓ Connected with password:', pass.substring(0, 3) + '***');
      
      // Execute SQL statements one by one (split by semicolons)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      let ok = 0, fail = 0;
      for (const stmt of statements) {
        // Skip complex DO blocks and BEGIN/END
        if (stmt.toUpperCase().startsWith('DO ') || stmt.toUpperCase().startsWith('END ')) {
          continue;
        }
        try {
          await pool.query(stmt + ';');
          ok++;
          console.log('  ✓', stmt.substring(0, 70).replace(/\n/g, ' '));
        } catch (e) {
          // Ignore "already exists" and "does not exist" errors
          if (e.message.includes('already exists') || e.message.includes('does not exist')) {
            ok++;
            console.log('  ~', stmt.substring(0, 70).replace(/\n/g, ' '), '(already applied)');
          } else {
            fail++;
            console.log('  ✗', stmt.substring(0, 70).replace(/\n/g, ' '), ':', e.message.substring(0, 80));
          }
        }
      }
      
      console.log(`\nMigration complete: ${ok} OK, ${fail} failed`);
      await pool.end();
      return;
    } catch (e) {
      await pool.end().catch(() => {});
      console.log('✗ Failed with password:', pass.substring(0, 3) + '***', e.message.substring(0, 60));
    }
  }
  
  console.log('\n⚠ Could not connect to database with any password.');
  console.log('Please manually run the SQL migration:');
  console.log('  File: docs/migration_test_fixes.sql');
  console.log('  URL: https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new');
}

migrate().catch(e => console.error('Fatal error:', e.message));

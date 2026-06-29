// 直接连接 Supabase PG 执行 DDL 迁移
// 用法: node scripts/migrate_db.js
const { Client } = require('pg');

const SK = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';

// 尝试多种连接方式
const CONN_STRINGS = [
  // pooler (推荐)
  `postgresql://postgres.mozamdshnaydbycpbifd:${encodeURIComponent(SK)}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  // direct PG
  `postgresql://postgres:${encodeURIComponent(SK)}@db.mozamdshnaydbycpbifd.supabase.co:5432/postgres`,
];

const connStr = process.env.PGDATABASE_URL || CONN_STRINGS[0];

async function tryConnect(connStrs) {
  for (const cs of connStrs) {
    try {
      const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
      await client.connect();
      console.log('✅ PG connected via:', cs.substring(0, 60) + '...');
      return client;
    } catch (e) {
      console.log('  ⚠️ 连接失败:', cs.substring(0, 50) + '... →', e.message);
    }
  }
  return null;
}

async function main() {
  // 优先 PGDATABASE_URL，后跟 pooler, 再 direct
  const candidates = [connStr, ...CONN_STRINGS].filter((v, i, a) => a.indexOf(v) === i);
  const client = await tryConnect(candidates);
  if (!client) {
    console.error('❌ 所有连接方式均失败，请使用 Supabase Dashboard SQL Editor 手动执行');
    console.error('   SQL 文件: docs/migration_new60_new67.sql');
    process.exit(1);
  }

  const results = [];

  // NEW-60: instructor_id → NULL
  try {
    await client.query('ALTER TABLE courses ALTER COLUMN instructor_id DROP NOT NULL');
    results.push('✅ courses.instructor_id → NULL allowed');
  } catch (e) {
    const msg = e.message;
    if (msg.includes('already') || msg.includes('does not exist')) {
      results.push('⚠️ courses.instructor_id → already nullable or missing');
    } else {
      results.push(`❌ courses.instructor_id FAILED: ${msg}`);
    }
  }

  // NEW-67: operation_logs table
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS operation_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL,
        user_name VARCHAR(255),
        user_role VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        resource_id UUID,
        detail TEXT,
        ip VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    results.push('✅ operation_logs table → created');
  } catch (e) {
    const msg = e.message;
    if (msg.includes('already exists')) {
      results.push('⚠️ operation_logs → already exists');
    } else {
      results.push(`❌ operation_logs FAILED: ${msg}`);
    }
  }

  console.log('\n' + results.join('\n'));
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });

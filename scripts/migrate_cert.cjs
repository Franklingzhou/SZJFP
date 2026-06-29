// DB迁移：workers 表加 certificates JSONB 列
// 用法: set SUPABASE_SERVICE_ROLE_KEY=xxx && node scripts/migrate_cert.cjs

const { Pool } = require('pg');

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.KEY;
if (!key) { console.error('缺少 SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

// Try pooler connection first (works from cloud), then direct
const configs = [
  { host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 6543, user: 'postgres.mozamdshnaydbycpbifd' },
  { host: 'db.mozamdshnaydbycpbifd.supabase.co', port: 5432, user: 'postgres' },
];

async function tryMigrate(config) {
  const pool = new Pool({
    ...config,
    database: 'postgres',
    password: key,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    // Check if column exists
    const check = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
      ['workers', 'certificates']
    );
    if (check.rows.length > 0) {
      console.log('✅ certificates 列已存在');
      return true;
    }
    await pool.query(`ALTER TABLE workers ADD COLUMN certificates JSONB DEFAULT '[]'::jsonb`);
    console.log('✅ 迁移成功');
    return true;
  } catch (err) {
    return false;
  } finally {
    await pool.end();
  }
}

(async () => {
  for (const cfg of configs) {
    const ok = await tryMigrate(cfg);
    if (ok) return;
    console.log(`  连接 ${cfg.host}:${cfg.port} 失败，尝试下一个...`);
  }
  console.error('❌ 所有连接方式均失败。请手动执行:');
  console.error("ALTER TABLE workers ADD COLUMN IF NOT EXISTS certificates JSONB DEFAULT '[]'::jsonb");
  process.exit(1);
})();

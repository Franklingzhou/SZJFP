// DB迁移：workers 表加 certificates JSONB 列
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error('缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

const pool = new Pool({
  host: 'db.mozamdshnaydbycpbifd.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: serviceKey,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const check = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
      ['workers', 'certificates']
    );
    if (check.rows.length > 0) {
      console.log('✅ certificates 列已存在');
      return;
    }
    await pool.query(`ALTER TABLE workers ADD COLUMN certificates JSONB DEFAULT '[]'::jsonb`);
    console.log('✅ 迁移成功');
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
main();

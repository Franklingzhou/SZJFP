const { Pool } = require('pg');

const connStr = 'postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4@db.mozamdshnaydbycpbifd.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const res = await pool.query("ALTER TABLE courses ALTER COLUMN instructor_id DROP NOT NULL");
    console.log('OK:', res.command);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

main();

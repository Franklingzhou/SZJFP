/**
 * P0 修复：执行数据库迁移 SQL
 * 使用 pg 直连 Supabase PostgreSQL
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PGHOST = 'db.mozamdshnaydbycpbifd.supabase.co';
const PGPORT = 5432;
const PGDATABASE = 'postgres';
const PGUSER = 'postgres';
const PGPASSWORD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';

async function main() {
  const sqlPath = path.join(__dirname, 'migration_p0_fixes.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`[migration] Reading SQL from: ${sqlPath}`);
  console.log(`[migration] SQL length: ${sql.length} chars`);
  console.log(`[migration] Connecting to Supabase PG...`);

  const client = new Client({
    host: PGHOST,
    port: PGPORT,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('[migration] Connected!');

    // Execute SQL in one go
    const result = await client.query(sql);
    console.log('[migration] SQL executed successfully!');
    
    // Check last SELECT result
    if (result.length > 0 && result[result.length - 1].rows) {
      console.log('[migration] Result:', JSON.stringify(result[result.length - 1].rows));
    }

    // Verify key tables
    console.log('\n--- Verification ---');
    
    // Check resume_reviews columns
    const rrColumns = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'resume_reviews' 
      ORDER BY ordinal_position
    `);
    console.log('[resume_reviews columns]:', rrColumns.rows.map(r => r.column_name).join(', '));

    // Check contracts columns
    const cColumns = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'contracts' 
      ORDER BY ordinal_position
    `);
    console.log('[contracts columns]:', cColumns.rows.map(r => r.column_name).join(', '));

    // Check contracts with pending_approval
    const pendingCount = await client.query(
      `SELECT COUNT(*) as cnt FROM contracts WHERE status = 'pending_approval'`
    );
    console.log(`[contracts pending_approval count]: ${pendingCount.rows[0].cnt}`);

    console.log('\n[migration] Done!');
  } catch (err) {
    console.error('[migration] Error:', err.message);
    // Print full error for debugging
    if (err.position) {
      const pos = parseInt(err.position);
      console.error('Near SQL:', sql.substring(Math.max(0, pos - 50), pos + 50));
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

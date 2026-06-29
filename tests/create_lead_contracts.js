// Create lead_contracts table in Supabase via pg
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4@db.mozamdshnaydbycpbifd.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  
  // Create table
  await client.query(`
    CREATE TABLE IF NOT EXISTS lead_contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id VARCHAR(64),
      worker_id VARCHAR(64),
      order_id VARCHAR(64),
      notes TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_by VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  console.log('✅ lead_contracts table created');
  
  // Verify
  const { rows } = await client.query(`SELECT count(*) FROM lead_contracts`);
  console.log('Row count:', rows[0].count);
  
  await client.end();
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });

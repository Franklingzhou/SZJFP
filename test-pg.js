const { Pool } = require('pg');

async function test() {
  const supabaseUrl = 'https://mozamdshnaydbycpbifd.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiZmlmZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NDkxMTc2OTYsImV4cCI6MjA2NDY5MzY5Nn0.test';
  
  const url = new URL(supabaseUrl);
  const dbUrl = `postgres://postgres:${supabaseServiceKey}@${url.host}:5432/postgres`;

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time');
    console.log('SUCCESS:', res.rows[0]);
    client.release();
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await pool.end();
  }
}

test();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://mozamdshnaydbycpbifd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg3MjYsImV4cCI6MjA5NzEwNDcyNn0.vj-Ope8a_-0gFHMC9Mx_2B8T27DX8T8xdwk6W75O57o',
  { db: { timeout: 10000 }, auth: { autoRefreshToken: false, persistSession: false } }
);
s.from('users').select('id,phone,name,role,password_hash').limit(30)
  .then(r => {
    if (r.error) { console.log('ERR:', r.error.message); process.exit(1); }
    console.log('Total users:', r.data.length);
    console.log(JSON.stringify(r.data, null, 2));
  });

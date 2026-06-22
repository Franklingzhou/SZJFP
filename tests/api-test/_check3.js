const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://mozamdshnaydbycpbifd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg3MjYsImV4cCI6MjA5NzEwNDcyNn0.vj-Ope8a_-0gFHMC9Mx_2B8T27DX8T8xdwk6W75O57o',
  { db: { timeout: 10000 }, auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  const ids = ['admin001', 'wo001', 'c001'];
  for (const id of ids) {
    const { data, error } = await s.from('users').select('id,phone,password_hash,review_status,is_active').eq('id', id).single();
    if (error) { console.log(id, 'ERR:', error.message); }
    else { console.log(id, ':', JSON.stringify(data)); }
  }
}
check();

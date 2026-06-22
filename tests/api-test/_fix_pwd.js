const { createClient } = require('@supabase/supabase-js');
const s = createClient(
  'https://mozamdshnaydbycpbifd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg3MjYsImV4cCI6MjA5NzEwNDcyNn0.vj-Ope8a_-0gFHMC9Mx_2B8T27DX8T8xdwk6W75O57o',
  { db: { timeout: 10000 }, auth: { autoRefreshToken: false, persistSession: false } }
);

const seedIds = ['a001','r001','i001','c001','admin001','ts001','wo001','w001'];

async function fix() {
  for (const id of seedIds) {
    const { error } = await s.from('users').update({ password_hash: '888888' }).eq('id', id);
    if (error) { console.log('FAIL:', id, error.message); }
    else { console.log('OK:', id); }
  }
  console.log('Done!');
}

fix();

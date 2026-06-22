// 诊断脚本：测试 Supabase 是否可连接
const { createClient } = require('@supabase/supabase-js');

const url = 'https://mozamdshnaydbycpbifd.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg3MjYsImV4cCI6MjA5NzEwNDcyNn0.vj-Ope8a_-0gFHMC9Mx_2B8T27DX8T8xdwk6W75O57o';

async function main() {
  console.log('1. Creating Supabase client...');
  const supabase = createClient(url, anonKey, {
    db: { timeout: 10000 },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  
  console.log('2. Testing query: SELECT * FROM users WHERE phone = "13000001111"...');
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, review_status, is_active, password_hash')
    .eq('phone', '13000001111');
  
  if (error) {
    console.log('FAIL: Supabase query error:', error.message);
    process.exit(1);
  }
  
  console.log('3. Result:', JSON.stringify(data, null, 2));
  console.log('SUCCESS: Supabase connection works!');
}

main().catch(err => {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});

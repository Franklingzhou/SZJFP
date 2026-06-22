// 直接通过 Supabase 客户端查询 users 表
async function main() {
  // 使用与 API 相同的方式导入
  const { getSupabaseClient } = await import('../../src/storage/database/supabase-client.ts');
  const supabase = getSupabaseClient();
  
  // 查询所有 phone=13000000001 的用户
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone, role, password_hash, review_status, is_active')
    .eq('phone', '13000000001');
  
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  if (data) {
    data.forEach(u => {
      console.log(`  id=${u.id} name=${u.name} role=${u.role}`);
      console.log(`  password_hash=${u.password_hash}`);
      console.log(`  review_status=${u.review_status} is_active=${u.is_active}`);
      console.log('  ---');
    });
  }
  
  // 也查一下 admin001
  const { data: d2, error: e2 } = await supabase
    .from('users')
    .select('id, name, phone, role, password_hash')
    .eq('id', 'admin001');
  console.log('\nAdmin001 by id:', JSON.stringify(d2), 'err:', e2);
}

main().catch(e => console.error('FATAL:', e.message));

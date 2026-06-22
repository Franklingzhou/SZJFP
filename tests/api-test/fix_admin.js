// 修复：删除 phone=13000000001 的非 admin 重复记录
async function main() {
  const { getSupabaseClient } = await import('../../src/storage/database/supabase-client.ts');
  const supabase = getSupabaseClient();
  
  // 删除重复用户
  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('id', 'u_1782062748442_6rh9gi')
    .select();
  
  console.log('Delete result:', { data, error });
  
  // 验证
  const { data: d2 } = await supabase
    .from('users')
    .select('id, name, phone, role, password_hash')
    .eq('phone', '13000000001');
  console.log('\nRemaining users with phone 13000000001:', JSON.stringify(d2, null, 2));
}

main().catch(e => console.error('FATAL:', e.message));

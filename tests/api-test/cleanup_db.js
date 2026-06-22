async function main() {
  const { getSupabaseClient } = await import('../../src/storage/database/supabase-client.ts');
  const supabase = getSupabaseClient();
  
  // 1. 删除非测试用户以外的重复手机号记录
  const testPhones = ['13800005678','13600001234','13500003456','13700007890','13900009876','13000000001','13100001111','13200002222'];
  
  for (const phone of testPhones) {
    const { data } = await supabase.from('users').select('id,name,role').eq('phone', phone);
    if (data && data.length > 1) {
      // 删除非标准 ID 的记录
      const standardIds = ['w001','a001','r001','i001','c001','admin001','ts001','wo001'];
      const toDelete = data.filter(u => !standardIds.includes(u.id)).map(u => u.id);
      for (const id of toDelete) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        console.log(`Deleted extra user id=${id} phone=${phone}: ${error ? 'FAIL ' + error.message : 'OK'}`);
      }
    }
  }
  
  // 2. 验证清理结果
  console.log('\n=== Final user count per phone ===');
  for (const phone of testPhones) {
    const { data } = await supabase.from('users').select('id,name,role,password_hash').eq('phone', phone);
    console.log(`  ${phone}: ${data?.length || 0} users`);
    data?.forEach(u => console.log(`    - id=${u.id} role=${u.role} pwd=${u.password_hash?.slice(0,20)}`));
  }
}
main().catch(e => console.error(e));

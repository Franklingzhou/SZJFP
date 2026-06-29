/**
 * 探查当前 Supabase 数据库实际表结构和数据情况
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mozamdshnaydbycpbifd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg3MjYsImV4cCI6MjA5NzEwNDcyNn0.vj-Ope8a_-0gFHMC9Mx_2B8T27DX8T8xdwk6W75O57o'
);

async function probeTable(name) {
  // Try to select * with limit 1 to see what columns exist
  const { data, error, status } = await supabase
    .from(name)
    .select('*', { count: 'exact', head: false })
    .limit(1);
  
  if (error) {
    // Try just count
    const { count, error: e2 } = await supabase
      .from(name)
      .select('*', { count: 'exact', head: true });
    if (e2) {
      console.log(`  ❌ ${name}: ${e2.message}`);
    } else {
      console.log(`  ✅ ${name}: 共 ${count} 条记录 (无法获取详情)`);
    }
  } else {
    const cols = data?.length ? Object.keys(data[0]).join(', ') : '(空)';
    console.log(`  ✅ ${name}: ${Array.isArray(data) ? data.length : 0} 条, 字段: ${cols}`);
  }
}

async function probeTables() {
  const tables = [
    'resume_reviews',
    'platform_fees',
    'courses',
    'course_schedules',
    'enrollments',
    'workers',
    'orders',
    'contracts',
    'users',
    'order_signings',
  ];

  console.log('🔍 数据库表探查:\n');
  for (const t of tables) {
    await probeTable(t);
  }
}

probeTables().then(() => console.log('\n✅ 探查完成')).catch(e => console.error('❌', e));

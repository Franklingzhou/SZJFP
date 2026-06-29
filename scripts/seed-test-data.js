/**
 * 种子脚本：为 resume_reviews 和 platform_fees 表灌入测试数据
 * 用于支撑 U13-U15 测试
 */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mozamdshnaydbycpbifd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg3MjYsImV4cCI6MjA5NzEwNDcyNn0.vj-Ope8a_-0gFHMC9Mx_2B8T27DX8T8xdwk6W75O57o'
);

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function seed() {
  // 1. 获取现有 worker IDs
  const { data: workers } = await supabase.from('workers').select('id');
  const workerIds = (workers || []).map(w => w.id);
  console.log('Workers:', workerIds);

  // 2. 获取现有 order IDs
  const { data: orders } = await supabase.from('orders').select('id');
  const orderIds = (orders || []).map(o => o.id);
  console.log('Orders:', orderIds);

  // 3. 获取现有 user IDs
  const { data: users } = await supabase.from('users').select('id');
  const userIds = (users || []).map(u => u.id);
  console.log('Users:', userIds);

  if (workerIds.length === 0) {
    console.log('❌ 需要先创建 workers！请运行 init_all_tables.sql');
    return;
  }

  // 4. 插入 resume_reviews（最小必需字段）
  console.log('\n📝 插入 resume_reviews...');
  const rrIds = [];
  for (const [i, workerId] of workerIds.entries()) {
    const reviewId = uuid();
    const { data, error } = await supabase
      .from('resume_reviews')
      .insert({
        id: reviewId,
        worker_id: workerId,
        type: i === 0 ? 'create' : 'pause',
        review_type: i === 0 ? 'create_resume' : 'pause',
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.log(`  ❌ resume_review ${i}: ${error.message}`);
      // Try with only NOT NULL columns
      const { data: d2, error: e2 } = await supabase
        .from('resume_reviews')
        .insert({
          id: reviewId,
          worker_id: workerId,
          type: i === 0 ? 'create' : 'pause',
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select();
      if (e2) {
        console.log(`  ❌ retry failed: ${e2.message}`);
        // Try getting table info
        const { error: e3 } = await supabase.from('resume_reviews').select('id').limit(1);
        console.log(`  select error: ${e3?.message || 'none'}`);
      } else {
        console.log(`  ✅ resume_review ${i}: ${reviewId}`);
        rrIds.push(reviewId);
      }
    } else {
      console.log(`  ✅ resume_review ${i}: ${reviewId}`);
      rrIds.push(reviewId);
    }
  }

  // 5. 插入 platform_fees（最小必需字段）
  console.log('\n📝 插入 platform_fees...');
  if (orderIds.length > 0) {
    for (const [i, orderId] of orderIds.entries()) {
      const feeId = uuid();
      const { data, error } = await supabase
        .from('platform_fees')
        .insert({
          id: feeId,
          order_id: orderId,
          amount: (i + 1) * 100,
          fee_type: i === 0 ? 'platform' : 'service',
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.log(`  ❌ platform_fee ${i}: ${error.message}`);
        // Try with just NOT NULL minimal
        const { data: d2, error: e2 } = await supabase
          .from('platform_fees')
          .insert({
            id: feeId,
            order_id: orderId,
            amount: (i + 1) * 100,
            status: 'pending',
            created_at: new Date().toISOString(),
          })
          .select();
        if (e2) {
          console.log(`  ❌ retry failed: ${e2.message}`);
        } else {
          console.log(`  ✅ platform_fee ${i}: ${feeId}`);
        }
      } else {
        console.log(`  ✅ platform_fee ${i}: ${feeId}`);
      }
    }
  } else {
    console.log('  ⚠️ 无 orders，跳过');
  }

  // 6. 验证
  console.log('\n📊 验证结果:');
  const { data: rrVer } = await supabase.from('resume_reviews').select('id', { count: 'exact', head: true });
  const { data: pfVer } = await supabase.from('platform_fees').select('id', { count: 'exact', head: true });
  console.log(`  resume_reviews: ${rrVer ? '查到' : '失败'}`);
  console.log(`  platform_fees: ${pfVer ? '查到' : '失败'}`);
}

seed()
  .then(() => { console.log('\n✅ 种子数据灌入完成'); process.exit(0); })
  .catch(e => { console.error('❌', e); process.exit(1); });

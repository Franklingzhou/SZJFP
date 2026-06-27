import { NextResponse } from 'next/server';

// 初始化测试用户数据（仅开发环境使用）
// 将mock用户写入数据库，并绑定模拟openid
export async function POST() {
  if (process.env.COZE_PROJECT_ENV === 'PROD' && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '生产环境禁止初始化测试数据' }, { status: 403 });
  }
  // 允许云托管测试环境初始化（NODE_ENV !== 'production' 或是非COZE_PROD环境）

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 确保 course_package_items 表存在（DDL 需要 service_role，这里用 REST 间接尝试）
    try {
      await supabase.from('course_package_items').select('id').limit(1);
    } catch {
      // 表不存在，尝试创建
      try {
        await supabase.rpc('init_course_package_items');
      } catch {
        // RPC 也不可用，静默忽略（需要手动建表）
      }
    }

    const testUsers = [
      { id: 'w001', name: '王秀兰', phone: '13800005678', role: 'worker', wechat_openid: 'dev_wx_worker', review_status: 'approved', is_active: true, password_hash: '888888' },
      { id: 'a001', name: '张丽华', phone: '13600001234', role: 'agent', wechat_openid: 'dev_wx_agent', review_status: 'approved', is_active: true, password_hash: '888888' },
      { id: 'r001', name: '陈招生', phone: '13500003456', role: 'recruiter', wechat_openid: 'dev_wx_recruiter', review_status: 'approved', is_active: true, password_hash: '888888' },
      { id: 'i001', name: '李敏', phone: '13700007890', role: 'instructor', wechat_openid: 'dev_wx_instructor', review_status: 'approved', is_active: true, password_hash: '888888' },
      { id: 'c001', name: '刘女士', phone: '13900009876', role: 'customer', wechat_openid: 'dev_wx_customer', review_status: 'approved', is_active: true, password_hash: '888888' },
      { id: 'admin001', name: '管理员', phone: '13000000001', role: 'admin', wechat_openid: 'dev_wx_admin', review_status: 'approved', is_active: true, password_hash: '888888' },
      { id: 'ts001', name: '赵主管', phone: '13100001111', role: 'training_supervisor', wechat_openid: 'dev_wx_training_supervisor', review_status: 'approved', is_active: true, password_hash: '888888' },
      { id: 'wo001', name: '周运营', phone: '13200002222', role: 'worker_operator', wechat_openid: 'dev_wx_worker_operator', review_status: 'approved', is_active: true, password_hash: '888888' },
    ];

    const results = [];
    for (const user of testUsers) {
      const { error } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'id' });
      
      results.push({
        id: user.id,
        name: user.name,
        role: user.role,
        openid: user.wechat_openid,
        success: !error,
        error: error?.message,
      });
    }

    // v14: 同时播种worksers/courses/leads/orders，确保测试有可用ID
    const { data: existingWorkers } = await supabase.from('workers').select('id').limit(1);
    const { data: existingCourses } = await supabase.from('courses').select('id').limit(1);
    const { data: existingOrders } = await supabase.from('orders').select('id').limit(1);

    if (!existingWorkers?.length) {
      await supabase.from('workers').upsert([
        { id: 'worker001', user_id: 'w001', name: '王秀兰', phone: '13800005678', age: 35, gender: '女', status: 'available', service_type: '月嫂', created_at: new Date().toISOString(), creator_id: 'r001' },
        { id: 'worker002', user_id: null, name: '张阿姨', phone: '13800005679', age: 42, gender: '女', status: 'available', service_type: '育儿嫂', created_at: new Date().toISOString(), creator_id: 'r001' },
      ], { onConflict: 'id' });
    }

    if (!existingCourses?.length) {
      await supabase.from('courses').upsert([
        { id: 'c001', name: '母婴护理高级课程', instructor_id: 'i001', type: '技能提升', max_students: 30, hours: 40, price: 2999, status: 'published', created_at: new Date().toISOString() },
        { id: 'c002', name: '催乳师培训', instructor_id: 'i001', type: '技能提升', max_students: 20, hours: 30, price: 1999, status: 'published', created_at: new Date().toISOString() },
      ], { onConflict: 'id' });
    }

    if (!existingOrders?.length) {
      await supabase.from('orders').upsert([
        { id: 'order001', title: '月嫂服务订单', job_type: '月嫂', salary_min: 6000, salary_max: 10000, location: '深圳南山', agent_id: 'a001', status: 'open', created_at: new Date().toISOString() },
        { id: 'order002', title: '育儿嫂订单', job_type: '育儿嫂', salary_min: 5000, salary_max: 8000, location: '深圳福田', agent_id: 'a001', status: 'open', created_at: new Date().toISOString() },
      ], { onConflict: 'id' });
    }

    // 确保有leads数据
    const { data: existingLeads } = await supabase.from('leads').select('id').limit(1);
    if (!existingLeads?.length) {
      await supabase.from('leads').upsert([
        { id: 'lead001', name: '王小姐', phone: '13800001111', source: '线上推广', status: 'new', created_by: 'r001', created_at: new Date().toISOString() },
      ], { onConflict: 'id' });
    }

    // v15: 播种 resume_reviews 和 platform_fees 测试数据
    // 始终确保至少有3条pending状态的resume_reviews（用于测试U13）
    const { data: existingRR } = await supabase.from('resume_reviews').select('id').limit(1);
    if (!existingRR?.length) {
      const { data: fallbackWRR } = await supabase.from('workers').select('id').limit(5);
      const workerIds = (existingWorkers?.length ? existingWorkers : fallbackWRR ?? []).map((w: Record<string, unknown>) => w.id);
      for (const [i, wid] of workerIds.slice(0, 3).entries()) {
        await supabase.from('resume_reviews').insert({
          id: crypto.randomUUID(),
          worker_id: wid,
          type: i === 0 ? 'create' : 'pause',
          review_type: i === 0 ? 'create_resume' : 'pause',
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    } else {
      // 即使表非空，也确保至少有3条pending记录
      const { count: pendingCount } = await supabase.from('resume_reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending');
      if ((pendingCount || 0) < 3) {
        const { data: fallbackW2 } = await supabase.from('workers').select('id').limit(5);
        const workerIds = (existingWorkers?.length ? existingWorkers : fallbackW2 ?? []).map((w: Record<string, unknown>) => w.id);
        for (const [i, wid] of workerIds.slice(0, 3).entries()) {
          await supabase.from('resume_reviews').insert({
            id: crypto.randomUUID(),
            worker_id: wid,
            type: i === 0 ? 'create' : 'pause',
            review_type: i === 0 ? 'create_resume' : 'pause',
            status: 'pending',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    const { data: existingPF } = await supabase.from('platform_fees').select('id').limit(1);
    if (!existingPF?.length) {
      const { data: fallbackOrders } = await supabase.from('orders').select('id').limit(5);
      const orderIds = (existingOrders?.length ? existingOrders : fallbackOrders ?? []).map((o: Record<string, unknown>) => o.id);
      for (const [i, oid] of orderIds.slice(0, 2).entries()) {
        await supabase.from('platform_fees').insert({
          id: crypto.randomUUID(),
          order_id: oid,
          amount: (i + 1) * 100,
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '初始化失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

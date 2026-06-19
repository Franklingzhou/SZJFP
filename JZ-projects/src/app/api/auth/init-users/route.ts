import { NextResponse } from 'next/server';

// 初始化测试用户数据（仅开发环境使用）
// 将mock用户写入数据库，并绑定模拟openid
export async function POST() {
  if (process.env.COZE_PROJECT_ENV === 'PROD') {
    return NextResponse.json({ error: '生产环境禁止初始化测试数据' }, { status: 403 });
  }

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const testUsers = [
      { id: 'w001', name: '王秀兰', phone: '13800005678', role: 'worker', wechat_openid: 'dev_wx_worker', review_status: 'approved', is_active: true },
      { id: 'a001', name: '张丽华', phone: '13600001234', role: 'agent', wechat_openid: 'dev_wx_agent', review_status: 'approved', is_active: true },
      { id: 'r001', name: '陈招生', phone: '13500003456', role: 'recruiter', wechat_openid: 'dev_wx_recruiter', review_status: 'approved', is_active: true },
      { id: 'i001', name: '李敏', phone: '13700007890', role: 'instructor', wechat_openid: 'dev_wx_instructor', review_status: 'approved', is_active: true },
      { id: 'c001', name: '刘女士', phone: '13900009876', role: 'customer', wechat_openid: 'dev_wx_customer', review_status: 'approved', is_active: true },
      { id: 'admin001', name: '管理员', phone: '13000000001', role: 'admin', wechat_openid: 'dev_wx_admin', review_status: 'approved', is_active: true },
      { id: 'ts001', name: '赵主管', phone: '13100001111', role: 'training_supervisor', wechat_openid: 'dev_wx_training_supervisor', review_status: 'approved', is_active: true },
      { id: 'wo001', name: '周运营', phone: '13200002222', role: 'worker_operator', wechat_openid: 'dev_wx_worker_operator', review_status: 'approved', is_active: true },
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

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '初始化失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

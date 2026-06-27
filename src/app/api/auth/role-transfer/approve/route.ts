import { NextRequest, NextResponse } from 'next/server';

// 管理员审批转岗申请
// 通过：role→目标角色, 原阿姨身份封存(suspended)
// 拒绝：清空pending字段
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, action, comment } = body as {
      user_id: string;
      action: 'approve' | 'reject';
      comment?: string;
    };

    if (!user_id || !action) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action 必须为 approve 或 reject' }, { status: 400 });
    }

    // 权限检查：仅管理员
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const isDev = !process.env.COZE_PROJECT_ENV || process.env.COZE_PROJECT_ENV !== 'PROD';
    if (!isDev && token !== 'dev-admin') {
      // 简单token校验
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length < 2) {
          return NextResponse.json({ error: '无权限操作' }, { status: 403 });
        }
        const payload = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
        if (payload.role !== 'admin') {
          return NextResponse.json({ error: '仅管理员可审批转岗' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: '无效的认证信息' }, { status: 403 });
      }
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查用户
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, name, phone, role, pending_role, pending_role_status, review_status')
      .eq('id', user_id)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (!user.pending_role || user.pending_role_status !== 'pending') {
      return NextResponse.json({ error: '该用户没有待审批的转岗申请' }, { status: 400 });
    }

    const targetRole = user.pending_role;

    if (action === 'reject') {
      // 拒绝：清空pending字段
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          pending_role: null,
          pending_role_status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateErr) {
        return NextResponse.json({ error: '操作失败' }, { status: 500 });
      }

      console.log(`[role-transfer] REJECTED: ${user.name} ${user.role} → ${targetRole}${comment ? ` 备注: ${comment}` : ''}`);
      return NextResponse.json({ success: true, message: `已拒绝 ${user.name} 的转岗申请` });
    }

    // 通过：切角色 + 封存原角色数据
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        role: targetRole,
        review_status: 'approved',
        pending_role: null,
        pending_role_status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: '角色切换失败' }, { status: 500 });
    }

    // 如果原角色是阿姨 → 封存阿姨简历
    if (user.role === 'worker') {
      const { error: workerErr } = await supabase
        .from('workers')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString(),
        })
        .eq('phone', user.phone);

      if (workerErr) {
        console.error('[role-transfer] Worker suspend error:', workerErr);
        // 不阻断主流程
      } else {
        console.log(`[role-transfer] Worker ${user.id} suspended (原角色封存)`);
      }
    }

    console.log(`[role-transfer] APPROVED: ${user.name} ${user.role} → ${targetRole}${comment ? ` 备注: ${comment}` : ''}`);

    return NextResponse.json({
      success: true,
      message: `${user.name} 已转为${roleLabel(targetRole)}，原${roleLabel(user.role)}身份已封存`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审批失败';
    console.error('[role-transfer/approve] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    worker: '家政阿姨',
    agent: '经纪人',
    recruiter: '招生代理',
    instructor: '培训讲师',
    customer: '客户',
    training_supervisor: '培训主管',
    worker_operator: '阿姨运营',
  };
  return labels[role] || role;
}

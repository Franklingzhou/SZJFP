import { NextRequest, NextResponse } from 'next/server';

// 转岗申请：用户申请从当前角色切换到新角色
// 条件：
//   - 用户当前已审核通过
//   - 目标角色和当前角色不同
//   - 没有正在进行中的转岗申请
//
// 不限制从什么角色转到什么角色：
//   - 阿姨 → 招生、经纪人、讲师等
//   - 客户 → 经纪人、招生等
//   - 经纪人 ↔ 招生（内部互转）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, target_role, reason } = body as {
      phone: string;
      target_role: string;
      reason?: string;
    };

    if (!phone || !target_role) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 角色白名单
    const validRoles = ['worker', 'agent', 'recruiter', 'instructor', 'customer', 'training_supervisor', 'worker_operator'];
    if (!validRoles.includes(target_role)) {
      return NextResponse.json({ error: '无效的目标角色' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查当前用户
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, pending_role, pending_role_status')
      .eq('phone', phone)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json({ error: '未找到该手机号对应的用户' }, { status: 404 });
    }

    // 检查审核状态
    if (user.review_status !== 'approved') {
      return NextResponse.json({ error: '当前账号未通过审核，无法申请转岗' }, { status: 403 });
    }

    // 不能申请和当前一样的角色
    if (user.role === target_role) {
      return NextResponse.json({ error: '您已经是该角色，无需转岗' }, { status: 400 });
    }

    // 不能有进行中的申请
    if (user.pending_role && user.pending_role_status === 'pending') {
      return NextResponse.json(
        { error: `您已有一个转岗申请（申请转为${roleLabel(user.pending_role)}），请等待管理员审核` },
        { status: 400 }
      );
    }

    // 提交申请
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        pending_role: target_role,
        pending_role_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('[role-transfer] Update error:', updateErr);
      return NextResponse.json({ error: '提交转岗申请失败' }, { status: 500 });
    }

    console.log(`[role-transfer] User ${user.id} (${user.name}) applied: ${user.role} → ${target_role}${reason ? ` 原因: ${reason}` : ''}`);

    return NextResponse.json({
      success: true,
      message: `转岗申请已提交（${roleLabel(user.role)} → ${roleLabel(target_role)}），请等待管理员审核`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '提交转岗申请失败';
    console.error('[role-transfer] Error:', message);
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
    admin: '管理员',
  };
  return labels[role] || role;
}

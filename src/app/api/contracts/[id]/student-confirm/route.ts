import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';

// POST /api/contracts/[id]/student-confirm
// 学员自助确认签约（或主管/管理员代确认）
// 业务规则2.0: 替代支付步骤，学员登录后点击"确认参加培训"即可
// 主管(admin/training_supervisor)可以代学员确认
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 获取合同信息
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    // 只能确认 pending_student 状态的合同
    if (contract.status !== 'pending_student') {
      return NextResponse.json({
        error: `合同当前状态为"${contract.status}"，只有"待学员确认"的合同才能操作`,
      }, { status: 409 });
    }

    // 权限校验
    const allowedRoles = ['admin', 'training_supervisor', 'worker'];
    if (!allowedRoles.includes(session.role)) {
      return forbiddenResponse('仅学员、培训主管或管理员可操作');
    }

    // worker角色：必须验证手机号匹配（自己的合同）
    const isSupervisor = ['admin', 'training_supervisor'].includes(session.role);
    if (session.role === 'worker') {
      // 通过当前用户的 phone 匹配合同的 party_b_phone
      if (!session.phone || session.phone !== contract.party_b_phone) {
        return NextResponse.json({
          error: '该合同不属于您，无法确认。请确认登录账号是否正确。',
        }, { status: 403 });
      }
    }

    // 确认合同：pending_student → signed
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signed_at: now,
        student_confirmed_at: now,
        student_confirmed_by: session.userId,
        confirmed_by_supervisor: isSupervisor && session.role !== 'worker',
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[student-confirm] DB error:', error);
      return NextResponse.json({ error: '确认失败', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: isSupervisor ? '已代学员确认签约' : '已确认参加培训',
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认失败';
    console.error('[student-confirm] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

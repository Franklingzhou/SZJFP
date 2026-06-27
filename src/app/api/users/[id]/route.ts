import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-middleware';

// PATCH /api/users/[id] — 管理员审核用户
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 仅 admin 可访问
    const session = await requireRole(request, ['admin']);
    if (!session) {
      return NextResponse.json({ error: '无权限，仅管理员可审核用户' }, { status: 403 });
    }

    const body = await request.json();
    const { review_status, reject_reason } = body as { review_status: string; reject_reason?: string };

    // review_status 必填且只能是 approved 或 rejected
    if (!review_status || !['approved', 'rejected'].includes(review_status)) {
      return NextResponse.json(
        { error: 'review_status 必须为 approved 或 rejected' },
        { status: 400 }
      );
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询当前用户状态
    const { data: currentUser, error: queryError } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active')
      .eq('id', id)
      .single();

    if (queryError || !currentUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 禁止将已审核用户重新设为 pending
    if (review_status === 'pending' && currentUser.review_status !== 'pending') {
      return NextResponse.json(
        { error: '不能将已审核用户重新设为待审核状态' },
        { status: 400 }
      );
    }

    // 禁止重复审核（已经是目标状态）
    if (currentUser.review_status === review_status) {
      return NextResponse.json(
        { error: `用户已经是 ${review_status} 状态` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 构建更新数据
    const updates: Record<string, unknown> = {
      review_status,
      reviewed_by: session.userId,
      reviewed_at: now,
    };

    // 拒绝原因（仅rejected时存储）
    if (reject_reason) {
      updates.reject_reason = reject_reason;
    }

    // approved 时激活账号，rejected 时停用
    if (review_status === 'approved') {
      updates.is_active = true;
    } else if (review_status === 'rejected') {
      updates.is_active = false;
    }

    // 执行更新
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, name, phone, role, review_status, is_active, reviewed_by, reviewed_at')
      .single();

    if (updateError || !updatedUser) {
      console.error('[users/[id]] Update error:', updateError);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({
      message: review_status === 'approved' ? '审核通过' : '审核未通过',
      user: updatedUser,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '操作失败';
    console.error('[users/[id]] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

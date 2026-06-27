import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// PATCH /api/reviews/[id] — 管理员审核评价（审核通过/隐藏）
// action=approve → hidden=false, status='approved'（审核通过上线）
// action=hide    → hidden=true, status='hidden_by_admin'（管理员隐藏）
// 兼容旧接口：传 hidden boolean 直接 toggle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'reviews:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  // 仅admin可操作
  if (session.role !== 'admin') {
    return NextResponse.json({ error: '无权限，仅管理员可操作' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, hidden, hide_reason } = body as { action?: string; hidden?: boolean; hide_reason?: string };

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    let updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === 'approve') {
      // 审核通过：上线
      updates.hidden = false;
      updates.status = 'approved';
    } else if (action === 'hide') {
      // 管理员手动隐藏
      updates.hidden = true;
      updates.status = 'hidden_by_admin';
      if (hide_reason) updates.hide_reason = hide_reason;
    } else if (typeof hidden === 'boolean') {
      // 兼容旧接口：toggle hidden（恢复时回 approved，隐藏时设 hidden_by_admin）
      updates.hidden = hidden;
      updates.status = hidden ? 'hidden_by_admin' : 'approved';
    } else {
      return NextResponse.json({ error: '缺少 action 参数（approve/hide）或 hidden 布尔值' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[reviews PATCH] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '未找到该评价' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[reviews PATCH] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

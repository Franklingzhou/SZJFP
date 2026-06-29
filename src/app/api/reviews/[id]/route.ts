import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// PATCH /api/reviews/[id] — 管理员评价审核
// action=approve → hidden=false, status='approved'（审核通过上线）
// action=reject  → status='rejected'（拒绝打回，保持隐藏）
// action=hide    → hidden=true, status='hidden_by_admin'（管理员隐藏已上线评价）
// action=unhide  → hidden=false, status='approved'（取消隐藏，恢复上线）
// 兼容旧接口：传 hidden boolean 直接 toggle
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, hidden, hide_reason } = body as { action?: string; hidden?: boolean; hide_reason?: string };

    // 根据 action 选择权限 key
    let permissionKey = 'reviews:approve';
    if (action === 'hide' || action === 'unhide' || (typeof hidden === 'boolean' && hidden === true)) {
      permissionKey = 'reviews:hide';
    }

    const result = await checkPermissionDetailed(request, permissionKey);
    if (!result.ok) {
      if (result.reason === 'unauthorized') return unauthorizedResponse();
      return forbiddenResponse('无操作权限');
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (action === 'approve') {
      // 审核通过：上线
      updates.hidden = false;
      updates.status = 'approved';
    } else if (action === 'reject') {
      // 审核拒绝：打回，保持隐藏
      updates.status = 'rejected';
      if (hide_reason) updates.hide_reason = hide_reason;
    } else if (action === 'hide') {
      // 管理员手动隐藏已上线评价
      updates.hidden = true;
      updates.status = 'hidden_by_admin';
      if (hide_reason) updates.hide_reason = hide_reason;
    } else if (action === 'unhide') {
      // 取消隐藏，恢复上线
      updates.hidden = false;
      updates.status = 'approved';
    } else if (typeof hidden === 'boolean') {
      // 兼容旧接口：toggle hidden
      updates.hidden = hidden;
      updates.status = hidden ? 'hidden_by_admin' : 'approved';
      if (hidden && hide_reason) updates.hide_reason = hide_reason;
    } else {
      return NextResponse.json({
        error: '缺少 action 参数，支持：approve=通过, reject=拒绝, hide=隐藏, unhide=取消隐藏'
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // PGRST116 = PostgREST 单行查询未找到行 → 404
      if ((error as unknown as Record<string, unknown>).code === 'PGRST116') {
        return NextResponse.json({ error: '未找到该评价' }, { status: 404 });
      }
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

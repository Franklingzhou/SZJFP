import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/refunds/[id]/reject — 驳回退款申请（仅admin）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'refunds:approve');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reviewComment = (body as Record<string, unknown>).review_comment as string | undefined;

    // 1. 查退款申请
    const { data: refund, error: findErr } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !refund) {
      return NextResponse.json({ ok: false, error: '退款申请不存在' }, { status: 404 });
    }

    if (refund.status !== 'pending') {
      return NextResponse.json({ ok: false, error: '该退款申请已处理，无法重复操作' }, { status: 409 });
    }

    // 2. 更新退款状态为 rejected
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('refunds')
      .update({
        status: 'rejected',
        approver_id: session.userId,
        approved_at: now,
        review_comment: reviewComment || '申请已驳回',
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[refunds reject] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '驳回失败';
    console.error('[refunds reject] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/refunds/[id]/approve — 审批通过退款申请（仅admin）
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
      return NextResponse.json({ ok: false, error: '该退款申请已处理，无法重复审批' }, { status: 409 });
    }

    // 2. 更新退款状态为 approved
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('refunds')
      .update({
        status: 'approved',
        approver_id: session.userId,
        approved_at: now,
        review_comment: reviewComment || null,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[refunds approve] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 3. E10c: 联动更新关联合同/订单状态为 refunding
    const relatedType = (refund as Record<string, unknown>).related_type as string | undefined;
    const relatedId = (refund as Record<string, unknown>).related_id as string | undefined;

    if (relatedId && relatedType) {
      try {
        if (relatedType === 'contract' || relatedType === 'lead_contract') {
          await supabase
            .from('contracts')
            .update({ status: 'refunding', updated_at: now })
            .eq('id', relatedId);
          console.log('[refunds approve] Contract', relatedId, '→ refunding');
        } else if (relatedType === 'order') {
          await supabase
            .from('orders')
            .update({ status: 'refunding', updated_at: now })
            .eq('id', relatedId);
          console.log('[refunds approve] Order', relatedId, '→ refunding');
        }
      } catch (linkErr) {
        console.error('[refunds approve] link update error:', linkErr);
        // 联动失败不影响审批结果
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审批失败';
    console.error('[refunds approve] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/refunds/[id] — 查看退款详情（admin或发起人）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'refunds:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: '退款申请不存在' }, { status: 404 });
    }

    // 非admin只能看自己发起的
    if (session.role !== 'admin' && data.requester_id !== session.userId) {
      return forbiddenResponse('无权查看该退款申请');
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[refunds detail] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PATCH /api/refunds/[id] — 确认线下打款完成（仅admin）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'refunds:approve');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const remark = (body as Record<string, unknown>).remark as string | undefined;

    const { data: refund, error: findErr } = await supabase
      .from('refunds')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !refund) {
      return NextResponse.json({ ok: false, error: '退款申请不存在' }, { status: 404 });
    }

    if (refund.status !== 'approved') {
      return NextResponse.json({ ok: false, error: '只有已通过的退款申请才能确认完成' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('refunds')
      .update({
        status: 'completed',
        completed_at: now,
        remark: remark || refund.remark,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[refunds complete] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // E10c: 退款完成时联动更新关联合同/订单状态为 refunded
    const relatedType = (refund as Record<string, unknown>).related_type as string | undefined;
    const relatedId = (refund as Record<string, unknown>).related_id as string | undefined;

    if (relatedId && relatedType) {
      try {
        if (relatedType === 'contract' || relatedType === 'lead_contract') {
          await supabase
            .from('contracts')
            .update({ status: 'refunded', updated_at: now })
            .eq('id', relatedId);
          console.log('[refunds complete] Contract', relatedId, '→ refunded');
        } else if (relatedType === 'order') {
          await supabase
            .from('orders')
            .update({ status: 'refunded', updated_at: now })
            .eq('id', relatedId);
          console.log('[refunds complete] Order', relatedId, '→ refunded');
        }
      } catch (linkErr) {
        console.error('[refunds complete] link update error:', linkErr);
        // 联动失败不影响完成确认
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认完成失败';
    console.error('[refunds complete] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

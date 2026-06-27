import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/cancel — 取消订单
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'orders:cancel');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancel_reason: reason || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '订单不存在' }, { status: 404 });
    }

    // 级联拒绝该订单所有 pending/accepted 的推荐记录
    const rejectedAt = new Date().toISOString();
    const { error: recErr } = await supabase
      .from('recommendations')
      .update({
        status: 'rejected',
        rejection_reason: `订单 ${id} 已取消，自动拒绝推荐`,
        notes: `订单 ${id} 已取消（${reason || '未提供理由'}），自动拒绝推荐`,
        updated_at: rejectedAt,
      })
      .eq('order_id', id)
      .in('status', ['pending', 'accepted']);

    if (recErr) {
      console.error('[orders cancel] 级联拒绝推荐失败:', recErr.message);
      // 不影响主流程，继续返回成功
    }

    // 释放关联阿姨（确认为working状态→available）
    const { data: orderData } = await supabase
      .from('orders')
      .select('signed_worker_id')
      .eq('id', id)
      .maybeSingle();

    if (orderData?.signed_worker_id) {
      await supabase
        .from('workers')
        .update({ work_status: 'available', updated_at: rejectedAt })
        .eq('id', orderData.signed_worker_id)
        .eq('work_status', 'working');
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '取消订单失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/lost — 标记客户流失（订单级联动）
// 业务规则：经纪人端标记客户流失 → 订单取消 + 推荐拒绝 + 阿姨释放 + 客户→closed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'orders:cancel');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    const supabase = getSupabaseClient();

    // 1. 查询当前订单，校验状态
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, customer_id, signed_worker_id')
      .eq('id', id)
      .single();

    if (orderErr || !orderData) {
      return NextResponse.json({ ok: false, error: '订单不存在' }, { status: 404 });
    }

    // 已终止的订单不可标记流失
    if (orderData.status === 'completed' || orderData.status === 'cancelled') {
      return NextResponse.json({
        ok: false,
        error: `订单状态为"${orderData.status}"，无法标记客户流失`,
      }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const lossReason = reason ? `客户流失：${reason}` : '客户已流失';

    // 2. 更新订单状态 → cancelled
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancel_reason: lossReason,
        cancelled_at: nowIso,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('[orders/lost] DB update error:', updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    // 3. 级联拒绝该订单所有 pending/accepted 的推荐记录
    const { error: recErr } = await supabase
      .from('recommendations')
      .update({
        status: 'rejected',
        rejection_reason: `订单 ${id} 已标记客户流失，自动拒绝推荐`,
        updated_at: nowIso,
      })
      .eq('order_id', id)
      .in('status', ['pending', 'accepted']);

    if (recErr) {
      console.error('[orders/lost] 级联拒绝推荐失败:', recErr.message);
    }

    // 4. 释放关联阿姨（working → available）
    if (orderData.signed_worker_id) {
      const { error: workerErr } = await supabase
        .from('workers')
        .update({ work_status: 'available', updated_at: nowIso })
        .eq('id', orderData.signed_worker_id)
        .eq('work_status', 'working');

      if (workerErr) {
        console.error('[orders/lost] 释放阿姨失败:', workerErr.message);
      }
    }

    // 5. 级联更新客户状态 → closed（如果订单关联了客户）
    if (orderData.customer_id) {
      // orders.customer_id = users.id，需通过 customers.user_id 查找客户记录
      const { data: customerData, error: custLookupErr } = await supabase
        .from('customers')
        .select('id, status')
        .eq('user_id', orderData.customer_id)
        .maybeSingle();

      if (custLookupErr) {
        console.error('[orders/lost] 查找客户失败:', custLookupErr.message);
      } else if (customerData) {
        const { error: custUpdateErr } = await supabase
          .from('customers')
          .update({ status: 'closed', updated_at: nowIso })
          .eq('id', customerData.id);

        if (custUpdateErr) {
          console.error('[orders/lost] 更新客户状态失败:', custUpdateErr.message);
        } else {
          console.log(`[orders/lost] 客户 ${customerData.id} 状态已更新为 closed`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: updatedOrder,
      message: '客户流失标记成功，订单已取消',
      cascaded: {
        recommendations_rejected: true,
        worker_released: !!orderData.signed_worker_id,
        customer_closed: !!orderData.customer_id,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '标记客户流失失败';
    console.error('[orders/lost] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/signing/confirm — 确认签约
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'order-signings:confirm');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { signing_id } = body as { signing_id: string };

    if (!signing_id) {
      return NextResponse.json({ ok: false, error: '签约ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 确认签约
    const { data, error } = await supabase
      .from('order_signings')
      .update({
        status: 'confirmed',
        confirmed_by: session.userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', signing_id)
      .eq('order_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '签约记录不存在' }, { status: 404 });
    }

    // 更新订单状态为已签约
    await supabase
      .from('orders')
      .update({ status: 'signed', signed_worker_id: data.worker_id })
      .eq('id', id);

    // A6: 签约后阿姨状态 idle → working
    await supabase
      .from('workers')
      .update({ work_status: 'working', updated_at: new Date().toISOString() })
      .eq('id', data.worker_id);

    // A7: 签约1个后，同订单其他推荐自动rejected
    await supabase
      .from('recommendations')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('order_id', id)
      .neq('id', signing_id)
      .neq('status', 'signed');

    // E10t2: 签约自动生成三方分账佣金记录
    const { createCommissionForOrderSigning, createSettlementsFromCommission, createPlatformFeesForOrder } = await import('@/lib/commission-utils');
    const commissionRecord = await createCommissionForOrderSigning(supabase, data);

    if (commissionRecord) {
      // 查询订单金额（计算比例和平台费用）
      const { data: orderInfo } = await supabase
        .from('orders')
        .select('amount')
        .eq('id', id)
        .maybeSingle();
      const orderAmount = Number(orderInfo?.amount) || 0;

      // A27: 同步创建 settlements（供分账管理页）
      await createSettlementsFromCommission(supabase, commissionRecord, orderAmount);

      // A31: 自动创建双20%平台费
      await createPlatformFeesForOrder(supabase, id, orderAmount);

      // E10t2: 回填线索签约佣金占位记录（lead_xxx → 实际order_id + 金额）
      const workerId = (data as Record<string, unknown>).worker_id as string;
      if (workerId) {
        // 查找该阿姨的线索签约佣金占位记录
        const { data: placeholderComms } = await supabase
          .from('commission_records')
          .select('id, order_id')
          .eq('creator_id', session.userId)
          .like('order_id', 'lead_%')
          .order('created_at', { ascending: false })
          .limit(1);

        if (placeholderComms && placeholderComms.length > 0) {
          const placeholder = placeholderComms[0] as Record<string, unknown>;
          const placeCreatorAmount = commissionRecord.creator_amount > 0
            ? commissionRecord.creator_amount
            : orderAmount * 0.3;  // 默认招生佣金30%

          await supabase
            .from('commission_records')
            .update({
              order_id: id,
              total_amount: orderAmount,
              creator_amount: parseFloat(placeCreatorAmount.toFixed(2)),
              maintainer_id: commissionRecord.maintainer_id,
              maintainer_amount: commissionRecord.maintainer_amount,
              recommender_id: commissionRecord.recommender_id,
              recommender_amount: commissionRecord.recommender_amount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', placeholder.id);

          console.log('[signing/confirm] Commission placeholder', placeholder.id,
            'updated: lead_xxx →', id,
            'amount:', orderAmount);
        }
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认签约失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

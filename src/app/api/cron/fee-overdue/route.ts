import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/cron/fee-overdue — 费用逾期检查定时任务
// Vercel cron: 每天上午9点执行
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // 查询逾期未支付的平台费用
    const { data: overdueFees, error } = await supabase
      .from('platform_fees')
      .select('*')
      .eq('status', 'pending')
      .lt('due_date', now);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let notifiedCount = 0;

    // 自动标记逾期 + 发送催缴通知
    if (overdueFees && overdueFees.length > 0) {
      for (const fee of overdueFees) {
        await supabase
          .from('platform_fees')
          .update({ status: 'overdue', updated_at: now })
          .eq('id', fee.id);

        // 查询关联订单获取应付人信息
        if (fee.order_id) {
          const { data: orderData } = await supabase
            .from('orders')
            .select('customer_id, agent_id, worker_id')
            .eq('id', fee.order_id)
            .maybeSingle();

          const payerId = orderData?.customer_id || orderData?.agent_id || null;

          if (payerId) {
            const feeTypeLabel = fee.contract_type === 'training' ? '培训费（20%）' : '中介费（20%）';
            await supabase.from('notifications').insert({
              user_id: payerId,
              type: 'fee_reminder',
              title: '平台费催缴提醒（逾期）',
              content: `订单 ${fee.order_id} 的${feeTypeLabel}已逾期未支付（金额：¥${fee.amount}），请尽快完成缴费。`,
              related_id: fee.id,
              related_type: 'platform_fee',
              is_read: false,
              created_at: now,
            });
            notifiedCount++;
          }
        }
      }
    }

    // 查询3天内即将逾期的费用，发送预警通知
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: soonDueFees } = await supabase
      .from('platform_fees')
      .select('*')
      .eq('status', 'pending')
      .lte('due_date', in3Days)
      .gt('due_date', now);

    if (soonDueFees && soonDueFees.length > 0) {
      for (const fee of soonDueFees) {
        if (fee.order_id) {
          const { data: orderData } = await supabase
            .from('orders')
            .select('customer_id, agent_id')
            .eq('id', fee.order_id)
            .maybeSingle();

          const payerId = orderData?.customer_id || orderData?.agent_id || null;

          if (payerId) {
            const feeTypeLabel = fee.contract_type === 'training' ? '培训费（20%）' : '中介费（20%）';
            await supabase.from('notifications').insert({
              user_id: payerId,
              type: 'fee_reminder',
              title: '平台费即将逾期',
              content: `订单 ${fee.order_id} 的${feeTypeLabel}即将逾期（金额：¥${fee.amount}），请尽快完成缴费。`,
              related_id: fee.id,
              related_type: 'platform_fee',
              is_read: false,
              created_at: now,
            });
            notifiedCount++;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        overdue: overdueFees || [],
        overdueCount: overdueFees?.length || 0,
        notifiedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

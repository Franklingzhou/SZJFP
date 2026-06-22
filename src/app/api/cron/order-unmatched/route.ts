import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/cron/order-unmatched — 订单超时未匹配提醒
 *
 * 逻辑：订单创建超过 X 小时仍为 'pending' 状态，说明未分配阿姨，提醒相关经纪人
 * 阈值：从 system_settings.key='reminder_settings' 读取 order_unmatched_hours，默认 48
 *
 * Vercel cron: 建议每 6 小时执行一次
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    let notifiedCount = 0;

    let thresholdHours = 48;
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'reminder_settings')
        .maybeSingle();
      if (settingsData?.value) {
        const val = settingsData.value as Record<string, unknown>;
        if (typeof val.order_unmatched_hours === 'number') thresholdHours = val.order_unmatched_hours;
      }
    } catch { /* 使用默认值 */ }

    const threshold = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

    const { data: unmatchedOrders, error } = await supabase
      .from('orders')
      .select('id, title, service_type, job_type, agent_id, customer_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', threshold);

    if (error) {
      console.error('[order-unmatched] query error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (unmatchedOrders && unmatchedOrders.length > 0) {
      for (const order of unmatchedOrders) {
        // 优先通知经纪人，其次通知 admin
        const targetUserId = order.agent_id || 'admin';
        if (!targetUserId) continue;

        // 防重复
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'order_unmatched')
          .eq('related_id', order.id)
          .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingNotif && existingNotif.length > 0) continue;

        const hoursAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (60 * 60 * 1000));
        const orderLabel = order.title || order.service_type || order.job_type || '未命名订单';
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          type: 'order_unmatched',
          title: '订单超时未派单',
          content: `订单"${orderLabel}"已创建 ${hoursAgo} 小时仍未分配阿姨，请尽快匹配合适人选。`,
          related_id: order.id,
          related_type: 'order',
          is_read: false,
          created_at: now,
        });
        notifiedCount++;
      }
    }

    console.log('[order-unmatched] Notified:', notifiedCount, 'thresholdHours:', thresholdHours);
    return NextResponse.json({ ok: true, data: { notifiedCount, config: { order_unmatched_hours: thresholdHours } } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    console.error('[order-unmatched] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

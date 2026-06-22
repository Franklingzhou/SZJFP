import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/cron/worker-inactive — 阿姨长期未活跃提醒
 *
 * 逻辑：阿姨 X 天内无任何订单关联记录（无论状态），说明处于沉睡状态，提醒其关联经纪人/招生代理
 * 阈值：从 system_settings.key='reminder_settings' 读取 worker_inactive_days，默认 30
 *
 * Vercel cron: 建议每天执行一次
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    let notifiedCount = 0;

    let thresholdDays = 30;
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'reminder_settings')
        .maybeSingle();
      if (settingsData?.value) {
        const val = settingsData.value as Record<string, unknown>;
        if (typeof val.worker_inactive_days === 'number') thresholdDays = val.worker_inactive_days;
      }
    } catch { /* 使用默认值 */ }

    const threshold = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000).toISOString();

    // 查询所有可用/暂停状态的阿姨（排除黑名单）
    const { data: workers, error: wErr } = await supabase
      .from('workers')
      .select('id, name, phone, status, creator_id, created_at, updated_at')
      .in('status', ['available', 'paused'])
      .lt('updated_at', threshold);

    if (wErr) {
      console.error('[worker-inactive] worker query error:', wErr.message);
      return NextResponse.json({ ok: false, error: wErr.message }, { status: 500 });
    }

    if (workers && workers.length > 0) {
      for (const worker of workers) {
        // 检查近期是否有订单
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id')
          .or(`worker_id.eq.${worker.id},signed_worker_id.eq.${worker.id}`)
          .gt('created_at', threshold)
          .limit(1);

        if (recentOrders && recentOrders.length > 0) continue; // 有近期订单，跳过

        // 防重复
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'worker_inactive')
          .eq('related_id', worker.id)
          .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingNotif && existingNotif.length > 0) continue;

        const daysAgo = Math.floor((Date.now() - new Date(worker.updated_at).getTime()) / (24 * 60 * 60 * 1000));

        // 通知创建者（经纪人/招生代理）
        const targetUserId = worker.creator_id;
        if (targetUserId) {
          await supabase.from('notifications').insert({
            user_id: targetUserId,
            type: 'worker_inactive',
            title: '阿姨长期未活跃',
            content: `阿姨"${worker.name || '未命名'}"（手机：${worker.phone || '无'}）已 ${daysAgo} 天未接单或更新，建议联系了解近况，必要时重新激活。`,
            related_id: worker.id,
            related_type: 'worker',
            is_read: false,
            created_at: now,
          });
          notifiedCount++;
        }
      }
    }

    console.log('[worker-inactive] Notified:', notifiedCount, 'thresholdDays:', thresholdDays);
    return NextResponse.json({ ok: true, data: { notifiedCount, config: { worker_inactive_days: thresholdDays } } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    console.error('[worker-inactive] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

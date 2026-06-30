import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/cron/lead-unfollowed — 线索超时未跟进提醒
 *
 * 逻辑：线索创建超过 X 小时仍为 'new' 状态，说明无人跟进，发送提醒给对应的招生代理
 * 阈值：从 system_settings.key='reminder_settings' 读取 lead_unfollowed_hours，默认 24
 *
 * Vercel cron: 建议每 6 小时执行一次
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    let notifiedCount = 0;

    // 读取阈值配置
    let thresholdHours = 24;
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'reminder_settings')
        .maybeSingle();
      if (settingsData?.value) {
        const val = settingsData.value as Record<string, unknown>;
        if (typeof val.lead_unfollowed_hours === 'number') thresholdHours = val.lead_unfollowed_hours;
      }
    } catch { /* 使用默认值 */ }

    const threshold = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

    // 查询超时未跟进的线索，限制5条防止超时
    const { data: staleLeads, error } = await supabase
      .from('leads')
      .select('id, name, phone, recruiter_id, created_at')
      .eq('status', 'new')
      .lt('created_at', threshold)
      .limit(5);

    if (error) {
      console.error('[lead-unfollowed] query error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (staleLeads && staleLeads.length > 0) {
      for (const lead of staleLeads) {
        if (!lead.recruiter_id) continue;

        // 防重复：检查 24h 内是否已发过同类提醒
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', lead.recruiter_id)
          .eq('type', 'lead_unfollowed')
          .eq('related_id', lead.id)
          .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingNotif && existingNotif.length > 0) continue;

        const hoursAgo = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (60 * 60 * 1000));
        await supabase.from('notifications').insert({
          user_id: lead.recruiter_id,
          type: 'lead_unfollowed',
          title: '线索超时未跟进',
          content: `线索"${lead.name || '未命名'}"（手机：${lead.phone || '无'}）已创建 ${hoursAgo} 小时仍未跟进处理，请及时联系。`,
          related_id: lead.id,
          related_type: 'lead',
          is_read: false,
          created_at: now,
        });
        notifiedCount++;
      }
    }

    console.log('[lead-unfollowed] Notified:', notifiedCount, 'thresholdHours:', thresholdHours);
    return NextResponse.json({ ok: true, data: { notifiedCount, config: { lead_unfollowed_hours: thresholdHours } } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    console.error('[lead-unfollowed] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/cron/enrollment-reminder — 防遗忘机制定时任务
 * E05h: 超X天未报名的线索/阿姨自动发送提醒
 *
 * 逻辑：
 * 1. 已签约但超过7天仍未报名任何课程的阿姨 → 提醒招生/经纪人跟进
 * 2. 线索超过14天未转化 → 提醒招生跟进
 *
 * Vercel cron: 每天上午10点执行
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    let notifiedCount = 0;

    // 查询系统设置中的提醒天数阈值
    const { data: settingsData } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'enrollment_reminder')
      .maybeSingle();

    let remindDaysEnroll = 7;  // 默认7天
    let remindDaysLead = 14;   // 默认14天
    if (settingsData?.value) {
      const val = settingsData.value as Record<string, unknown>;
      if (typeof val.remind_days_enroll === 'number') remindDaysEnroll = val.remind_days_enroll;
      if (typeof val.remind_days_lead === 'number') remindDaysLead = val.remind_days_lead;
    }

    const enrollThreshold = new Date(Date.now() - remindDaysEnroll * 24 * 60 * 60 * 1000).toISOString();
    const leadThreshold = new Date(Date.now() - remindDaysLead * 24 * 60 * 60 * 1000).toISOString();

    const results: Record<string, number> = {};

    // 1. 检查已签约但超过X天未报名的阿姨
    const { data: noEnrollWorkers, error: wErr } = await supabase
      .from('workers')
      .select('id, name, phone, creator_id, creator_role, lead_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', enrollThreshold);

    if (!wErr && noEnrollWorkers && noEnrollWorkers.length > 0) {
      for (const worker of noEnrollWorkers) {
        // 检查是否已有报名记录
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('id')
          .eq('worker_id', worker.id)
          .limit(1);

        if (!enrollments || enrollments.length === 0) {
          // 发送催报提醒给 creator
          if (worker.creator_id) {
            const daysAgo = Math.floor((Date.now() - new Date(worker.created_at).getTime()) / (24 * 60 * 60 * 1000));
            await supabase.from('notifications').insert({
              user_id: worker.creator_id,
              type: 'enrollment_reminder',
              title: '阿姨超时未报名提醒',
              content: `阿姨"${worker.name || '未命名'}"(手机:${worker.phone || '无'})已签约${daysAgo}天，但尚未报名任何培训课程，请尽快跟进安排报名。`,
              related_id: worker.id,
              related_type: 'worker',
              is_read: false,
              created_at: now,
            });
            notifiedCount++;
          }
        }
      }
      results.unenrolledWorkers = noEnrollWorkers.length;
    }

    // 2. 检查线索超过14天未转化
    const { data: staleLeads, error: lErr } = await supabase
      .from('leads')
      .select('id, name, phone, recruiter_id, created_at')
      .eq('status', 'new')
      .lt('created_at', leadThreshold);

    if (!lErr && staleLeads && staleLeads.length > 0) {
      for (const lead of staleLeads) {
        if (lead.recruiter_id) {
          const daysAgo = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (24 * 60 * 60 * 1000));
          await supabase.from('notifications').insert({
            user_id: lead.recruiter_id,
            type: 'lead_reminder',
            title: '线索超时未跟进提醒',
            content: `线索"${lead.name || '未命名'}"(手机:${lead.phone || '无'})已创建${daysAgo}天，仍未签约转化，请及时跟进处理。`,
            related_id: lead.id,
            related_type: 'lead',
            is_read: false,
            created_at: now,
          });
          notifiedCount++;
        }
      }
      results.staleLeads = staleLeads.length;
    }

    console.log('[enrollment-reminder] Notified:', notifiedCount,
      'unenrolledWorkers:', results.unenrolledWorkers || 0,
      'staleLeads:', results.staleLeads || 0);

    return NextResponse.json({
      ok: true,
      data: {
        ...results,
        notifiedCount,
        config: { remindDaysEnroll, remindDaysLead },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    console.error('[enrollment-reminder] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

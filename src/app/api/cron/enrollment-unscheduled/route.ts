import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/cron/enrollment-unscheduled — 报名后未排课提醒
 *
 * 逻辑：学员报名超过 X 天后仍未排课（无 course_schedules 关联），提醒招生代理和相关讲师
 * 阈值：从 system_settings.key='reminder_settings' 读取 enrollment_unscheduled_days，默认 7
 *
 * Vercel cron: 建议每天上午 10 点执行一次
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    let notifiedCount = 0;

    let thresholdDays = 7;
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'reminder_settings')
        .maybeSingle();
      if (settingsData?.value) {
        const val = settingsData.value as Record<string, unknown>;
        if (typeof val.enrollment_unscheduled_days === 'number') thresholdDays = val.enrollment_unscheduled_days;
      }
    } catch { /* 使用默认值 */ }

    const threshold = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000).toISOString();

    // 查询超过阈值天数的有效报名
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('id, worker_id, course_id, status, created_at')
      .eq('status', 'confirmed')  // 已确认的报名
      .lt('created_at', threshold);

    if (error) {
      console.error('[enrollment-unscheduled] query error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (enrollments && enrollments.length > 0) {
      for (const enrollment of enrollments) {
        // 检查是否已有排课
        const { data: schedules } = await supabase
          .from('course_schedules')
          .select('id')
          .eq('course_id', enrollment.course_id)
          .limit(1);

        if (schedules && schedules.length > 0) continue; // 已有排课，跳过

        // 防重复
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'enrollment_unscheduled')
          .eq('related_id', enrollment.id)
          .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existingNotif && existingNotif.length > 0) continue;

        // 获取阿姨和课程信息
        const { data: workerData } = await supabase
          .from('workers')
          .select('name, creator_id')
          .eq('id', enrollment.worker_id)
          .maybeSingle();

        const { data: courseData } = await supabase
          .from('courses')
          .select('name')
          .eq('id', enrollment.course_id)
          .maybeSingle();

        const daysAgo = Math.floor((Date.now() - new Date(enrollment.created_at).getTime()) / (24 * 60 * 60 * 1000));
        const workerName = (workerData as Record<string, unknown> | null)?.name || '学员';
        const courseName = (courseData as Record<string, unknown> | null)?.name || '课程';
        const creatorId = (workerData as Record<string, unknown> | null)?.creator_id as string | undefined;

        // 通知创建者（招生代理）
        if (creatorId) {
          await supabase.from('notifications').insert({
            user_id: creatorId,
            type: 'enrollment_unscheduled',
            title: '报名后超时未排课',
            content: `学员"${workerName}"已报名"${courseName}" ${daysAgo} 天，但该课程尚未安排排课，请尽快协调讲师安排上课时间。`,
            related_id: enrollment.id,
            related_type: 'enrollment',
            is_read: false,
            created_at: now,
          });
          notifiedCount++;
        }
      }
    }

    console.log('[enrollment-unscheduled] Notified:', notifiedCount, 'thresholdDays:', thresholdDays);
    return NextResponse.json({ ok: true, data: { notifiedCount, config: { enrollment_unscheduled_days: thresholdDays } } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    console.error('[enrollment-unscheduled] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

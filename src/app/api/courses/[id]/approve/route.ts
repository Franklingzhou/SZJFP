import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sendNotification } from '@/lib/notification-helper';

// POST /api/courses/[id]/approve — 管理员审核课程
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'courses:approve');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { approved, reason } = body as { approved: boolean; reason?: string };

    const supabase = getSupabaseClient();

    const updatePayload: Record<string, unknown> = {
      status: approved ? 'approved' : 'rejected',
      approved_by: session.userId,
      approved_at: new Date().toISOString(),
    };
    if (reason) updatePayload.review_reason = reason;

    const { data, error } = await supabase
      .from('courses')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '课程不存在' }, { status: 404 });
    }

    // 通知讲师课程审核结果
    const courseData = data as Record<string, unknown>;
    if (courseData.instructor_id) {
      sendNotification({
        user_id: courseData.instructor_id as string,
        title: approved ? '课程审核通过' : '课程审核未通过',
        content: approved
          ? `你的课程 "${courseData.name || id}" 已审核通过`
          : `你的课程 "${courseData.name || id}" 审核未通过，原因：${reason || '无'}`,
        type: approved ? 'course_approved' : 'course_rejected',
      });
    }

    return NextResponse.json({ success: true, ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

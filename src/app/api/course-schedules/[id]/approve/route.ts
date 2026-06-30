import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sendNotification } from '@/lib/notification-helper';

// POST /api/course-schedules/[id]/approve — 主管审核排课
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'course_schedules:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

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
      .from('course_schedules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '排课记录不存在' }, { status: 404 });
    }

    // 通知讲师排课审核结果
    const schedData = data as Record<string, unknown>;
    if (schedData.instructor_id) {
      sendNotification({
        user_id: schedData.instructor_id as string,
        title: approved ? '排课审核通过' : '排课审核未通过',
        content: approved
          ? `你的排课 #${id} 已审核通过`
          : `你的排课 #${id} 审核未通过，原因：${reason || '无'}`,
        type: approved ? 'schedule_approved' : 'schedule_rejected',
      });
    }

    return NextResponse.json({ success: true, ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

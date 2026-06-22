import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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

    // v13: try with review_reason first, fallback if column missing
    const updatePayload: Record<string, unknown> = {
      status: approved ? 'approved' : 'rejected',
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    };
    if (reason) updatePayload.review_reason = reason;

    let { data, error } = await supabase
      .from('course_schedules')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    // fallback: review_reason column not in schema yet
    if (error && error.message?.includes('review_reason')) {
      delete updatePayload.review_reason;
      const retry = await supabase
        .from('course_schedules')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '排课记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

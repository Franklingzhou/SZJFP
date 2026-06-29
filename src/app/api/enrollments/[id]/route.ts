import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// 合法状态流转映射
const VALID_TRANSITIONS: Record<string, string[]> = {
  enrolled: ['attending', 'dropped'],
  attending: ['qualified', 'failed', 'dropped'],
  qualified: [],
  failed: [],
  dropped: [],
};

// PATCH /api/enrollments/[id] — 更新报名记录（状态流转、结课考核）2.0适配worker_id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'enrollments:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const { id } = await params;
    const body = await request.json();

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询当前记录
    const { data: current, error: fetchErr } = await supabase
      .from('enrollments')
      .select('id, status, course_id, worker_id')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr || !current) {
      return NextResponse.json({ error: '报名记录不存在' }, { status: 404 });
    }

    const allowedFields = ['status', 'score', 'grade_comment', 'completed_at'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 });
    }

    // 状态流转校验
    if (updates.status !== undefined) {
      const validStatuses = ['enrolled', 'attending', 'qualified', 'failed', 'dropped'];
      if (!validStatuses.includes(updates.status as string)) {
        return NextResponse.json({ error: `无效状态，可选: ${validStatuses.join('/')}` }, { status: 400 });
      }
      const allowed = VALID_TRANSITIONS[current.status] || [];
      if (!allowed.includes(updates.status as string)) {
        return NextResponse.json(
          { error: `状态不可从 ${current.status} 变为 ${updates.status}，允许: ${allowed.join('/') || '无'}` },
          { status: 400 }
        );
      }
    }

    // 结课考核：打分时需要权限校验
    const isGrading = updates.score !== undefined;
    if (isGrading) {
      if (session.role !== 'admin') {
        const { data: course } = await supabase
          .from('courses')
          .select('instructor_id')
          .eq('id', current.course_id)
          .maybeSingle();
        if (!course || course.instructor_id !== session.userId) {
          return NextResponse.json({ error: '只有管理员或课程讲师可以打分' }, { status: 403 });
        }
      }
      updates.graded_at = new Date().toISOString();
    }

    // 状态变为 terminal 状态时自动设 completed_at
    if (['qualified', 'failed', 'dropped'].includes(updates.status as string)) {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[enrollments PATCH] update error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    // 2.0: 结课通过时，同步更新worker培训记录
    if (updates.status === 'qualified' && data) {
      const { data: courseData } = await supabase
        .from('courses')
        .select('name, title')
        .eq('id', current.course_id)
        .maybeSingle();
      const courseName = courseData?.name || courseData?.title || '培训课程';
      // 更新worker状态为available（培训合格后可以接单）
      await supabase
        .from('workers')
        .update({
          status: 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.worker_id)
        .eq('status', 'pending');
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[enrollments PATCH] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

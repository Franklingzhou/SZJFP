import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/courses/[id]/assign — 分配讲师（培训主管/管理员）
// 业务规则：只有培训主管或管理员可以给课程分配讲师
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'courses:assign');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { instructor_id } = body as { instructor_id: string };

    if (!instructor_id) {
      return NextResponse.json({ ok: false, error: '缺少讲师ID (instructor_id)' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 1. 查询课程是否存在
    const { data: courseData, error: courseErr } = await supabase
      .from('courses')
      .select('id, name, instructor_id, status')
      .eq('id', id)
      .single();

    if (courseErr || !courseData) {
      return NextResponse.json({ ok: false, error: '课程不存在' }, { status: 404 });
    }

    // 状态校验：已拒绝的课程不可分配
    if (courseData.status === 'rejected') {
      return NextResponse.json({ ok: false, error: '已拒绝的课程不可分配讲师' }, { status: 400 });
    }

    // 2. 校验讲师用户是否存在且角色正确
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', instructor_id)
      .single();

    if (userErr || !userData) {
      return NextResponse.json({ ok: false, error: '讲师用户不存在' }, { status: 404 });
    }

    if (userData.role !== 'instructor') {
      return NextResponse.json({ ok: false, error: `用户角色为"${userData.role}"，非讲师` }, { status: 400 });
    }

    // 3. 更新课程 instructor_id
    const nowIso = new Date().toISOString();
    const { data: updatedCourse, error: updateErr } = await supabase
      .from('courses')
      .update({
        instructor_id,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('[courses/assign] DB update error:', updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    const wasReassigned = courseData.instructor_id && courseData.instructor_id !== instructor_id;

    return NextResponse.json({
      ok: true,
      data: updatedCourse,
      message: wasReassigned
        ? `已重新分配讲师（${userData.name}），原讲师已替换`
        : `已分配讲师：${userData.name}`,
      reassigned: wasReassigned,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '讲师分配失败';
    console.error('[courses/assign] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

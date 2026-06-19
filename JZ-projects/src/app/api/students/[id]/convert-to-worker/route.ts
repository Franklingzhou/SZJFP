import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/students/[id]/convert-to-worker — 学员转简历（写入workers表）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 查询报名记录
    const { data: enrollment, error: findError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !enrollment) {
      return NextResponse.json({ error: '报名记录不存在' }, { status: 404 });
    }

    // 检查是否已有worker记录（同student_id）
    const { data: existingWorker } = await supabase
      .from('workers')
      .select('id, name')
      .eq('id', enrollment.student_id)
      .maybeSingle();

    if (existingWorker) {
      return NextResponse.json({ error: '该学员已有简历记录', data: existingWorker }, { status: 409 });
    }

    // 获取学员基本信息
    const { data: userInfo } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', enrollment.student_id)
      .single();

    // 查询关联课程获取工种信息
    const { data: course } = await supabase
      .from('courses')
      .select('title, course_type')
      .eq('id', enrollment.course_id)
      .single();

    // 创建worker记录
    const workerId = enrollment.student_id;
    const { data, error } = await supabase
      .from('workers')
      .insert({
        id: workerId,
        user_id: enrollment.student_id,
        name: userInfo?.name || '未知',
        phone: userInfo?.phone || null,
        job_types: course?.title ? [course.title] : [],
        status: 'idle',
        creator_id: session.userId,
        creator_role: session.role,
        credit_score: 1000,
        points: 0,
        resume_review_status: 'pending',
        remark: `由学员报名记录转换（课程：${course?.title || '未知'}）`,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '转换失败', detail: error.message }, { status: 500 });
    }

    // A2: 线索跳过培训 → 线索状态设为converted
    const { data: studentData } = await supabase.from('students').select('lead_id').eq('id', id).maybeSingle();
    if (studentData?.lead_id) {
      await supabase.from('leads').update({ status: 'converted' }).eq('id', studentData.lead_id);
    }

    return NextResponse.json({ success: true, data, message: '学员已转为简历' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误', detail: String(err) }, { status: 500 });
  }
}

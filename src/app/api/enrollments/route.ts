
import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/enrollments — 获取学员报名记录
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'enrollments:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const courseId = request.nextUrl.searchParams.get('course_id');
    const studentId = request.nextUrl.searchParams.get('student_id');
    const status = request.nextUrl.searchParams.get('status');
    const withCourses = request.nextUrl.searchParams.get('with_courses') === 'true';

    // 查询报名记录（仅 enrollments 表实际列）
    let query = supabase
      .from('enrollments')
      .select('id, course_id, student_id, student_name, enrolled_by, score, passed, certificate, status, completed_at, grade, graded_at, created_at')
      .order('id', { ascending: false });

    if (courseId) query = query.eq('course_id', courseId);
    if (studentId) query = query.eq('student_id', studentId);
    if (status) query = query.eq('status', status);

    // 数据权限过滤：非admin只看自己相关的报名
    if (session.role !== 'admin') {
      if (session.role === 'instructor') {
        // 讲师只看自己课程的学生：先查自己的课程ID列表，再过滤
        const { data: myCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('instructor_id', session.userId);
        if (myCourses && myCourses.length > 0) {
          query = query.in('course_id', myCourses.map(c => c.id));
        } else {
          // 没有自己的课程，返回空
          return NextResponse.json({ data: [] });
        }
      } else if (session.role === 'recruiter') {
        // 招生只看自己招的学生
        query = query.eq('enrolled_by', session.userId);
      }
      // training_supervisor 看全量，不加过滤
    }

    const { data, error } = await query;

    if (error) {
      console.error('[enrollments GET] DB error:', error);
      const e = error as unknown as Record<string,unknown>;
      return NextResponse.json({
        error: '查询失败',
        detail: String(error),
        message: e?.message || '',
        code: e?.code || '',
        hint: e?.hint || '',
        details: e?.details || '',
      }, { status: 500 });
    }

    const enrollments = (data || []) as Record<string, unknown>[];

    // 如果需要课程信息，单独查询 courses 表再合并
    if (withCourses && enrollments.length > 0) {
      const courseIds = [...new Set(enrollments.map(e => e.course_id as string).filter(Boolean))];
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, name, type, price, description, location, status, course_type')
          .in('id', courseIds);
        const courseMap: Record<string, unknown> = {};
        (courses || []).forEach((c: Record<string, unknown>) => {
          courseMap[c.id as string] = c;
        });
        enrollments.forEach(e => {
          (e as Record<string, unknown>).course = courseMap[e.course_id as string] || null;
        });
      }
    }

    return NextResponse.json({ data: enrollments });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[enrollments GET] Error:', message);
    return NextResponse.json({ error: '查询失败', detail: String(error), message }, { status: 500 });
  }
}

// POST /api/enrollments — 创建报名
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'enrollments:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { course_id, student_id } = body as {
      course_id?: string;
      student_id?: string;
    };

    // course_id必填，student_id如果是阿姨角色则自动填充
    if (!course_id) {
      return NextResponse.json({ error: 'course_id为必填' }, { status: 400 });
    }
    
    // 自动从token填充学员ID（阿姨自助报名场景）
    const finalStudentId = student_id || session.userId;

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 校验课程存在
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id')
      .eq('id', course_id)
      .maybeSingle();
    if (courseErr || !course) {
      return NextResponse.json({ error: '课程不存在' }, { status: 400 });
    }

    // 防重复报名
    const { data: existing, error: existErr } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('student_id', finalStudentId)
      .maybeSingle();
    if (existErr) {
      console.error('[enrollments POST] check duplicate error:', existErr);
    }
    if (existing) {
      return NextResponse.json({ error: '该学员已报名此课程' }, { status: 409 });
    }

    const id = crypto.randomUUID();
    const insertData: Record<string, unknown> = {
      id,
      course_id,
      student_id: finalStudentId,
      status: 'enrolled',
    };

    const { data, error } = await supabase
      .from('enrollments')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[enrollments POST] insert error:', error);
      return NextResponse.json({ error: '创建报名失败' }, { status: 500 });
    }

    // A3: 报名课程后，学员状态 signed → training
    if (data && data.student_id) {
      // 查询学员记录
      const { data: studentData } = await supabase
        .from('students')
        .select('id, status')
        .eq('id', data.student_id)
        .maybeSingle();
      
      if (studentData && studentData.status === 'signed') {
        await supabase
          .from('students')
          .update({ status: 'training', updated_at: new Date().toISOString() })
          .eq('id', studentData.id);
      }

      // 同时更新线索状态（如果学员来自线索）
      const { data: leadData } = await supabase
        .from('leads')
        .select('id, status')
        .eq('student_id', data.student_id)
        .maybeSingle();
      
      if (leadData && leadData.status === 'signed') {
        await supabase
          .from('leads')
          .update({ status: 'training', updated_at: new Date().toISOString() })
          .eq('id', leadData.id);
      }
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[enrollments POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

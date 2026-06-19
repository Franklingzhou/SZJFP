import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// GET /api/students — 获取学员列表（enrollments）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'students:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const supabase = getSupabaseClient();
    const url = request.nextUrl;
    const status = url.searchParams.get('status');
    const course_id = url.searchParams.get('course_id');
    const student_id = url.searchParams.get('student_id');
    const keyword = url.searchParams.get('keyword');

    let query = supabase
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (course_id) query = query.eq('course_id', course_id);
    if (student_id) query = query.eq('student_id', student_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: '查询失败', detail: error.message }, { status: 500 });
    }

    // 如果有关键词搜索，需要关联查学员名
    let result = data || [];
    if (keyword && result.length > 0) {
      const studentIds = [...new Set(result.map((r: Record<string, unknown>) => r.student_id as string))];
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name')
        .in('id', studentIds);

      const workerMap = new Map((workers || []).map((w: Record<string, unknown>) => [w.id as string, w.name as string]));
      result = result.map((r: Record<string, unknown>) => ({
        ...r,
        student_name: r.student_name || workerMap.get(r.student_id as string) || '未知',
      })).filter((r: Record<string, unknown>) => {
        const name = (r.student_name || '') as string;
        return name.includes(keyword!);
      });
    }

    // 补充学员名和课程名
    if (result.length > 0) {
      const studentIds = [...new Set(result.map((r: Record<string, unknown>) => r.student_id as string))];
      const courseIds = [...new Set(result.map((r: Record<string, unknown>) => r.course_id as string))];

      const { data: workers } = await supabase.from('workers').select('id, name, phone').in('id', studentIds);
      const { data: courses } = await supabase.from('courses').select('id, title').in('id', courseIds);

      const workerMap = new Map((workers || []).map((w: Record<string, unknown>) => [w.id as string, w]));
      const courseMap = new Map((courses || []).map((c: Record<string, unknown>) => [c.id as string, c]));

      result = result.map((r: Record<string, unknown>) => ({
        ...r,
        student_name: r.student_name || workerMap.get(r.student_id as string)?.name || '未知',
        student_phone: workerMap.get(r.student_id as string)?.phone || '',
        course_title: courseMap.get(r.course_id as string)?.title || '未知课程',
      }));
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'students');
    if (visibility === 'own') {
      // 只能看自己录入/负责的学员
      result = result.filter((r: Record<string, unknown>) => 
        r.recruiter_id === session.userId || 
        r.instructor_id === session.userId
      );
    }
    // 'all' 权限返回全部数据，'hidden' 返回空数组

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误', detail: String(err) }, { status: 500 });
  }
}

// POST /api/students — 新建报名（enrollment）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'students:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { course_id, student_id } = body;

    if (!course_id || !student_id) {
      return NextResponse.json({ error: '课程ID和学员ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查重复报名
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '该学员已报名此课程' }, { status: 409 });
    }

    // 获取学员名
    const { data: worker } = await supabase
      .from('workers')
      .select('name')
      .eq('id', student_id)
      .single();

    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        id,
        course_id,
        student_id,
        status: 'enrolled',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '创建失败', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误', detail: String(err) }, { status: 500 });
  }
}

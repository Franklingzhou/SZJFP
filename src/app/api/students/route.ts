import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// GET /api/students — 获取学员列表（enrollments JOIN workers）2.0: student_id→worker_id
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
    const worker_id = url.searchParams.get('worker_id');
    const keyword = url.searchParams.get('keyword');

    let query = supabase
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (course_id) query = query.eq('course_id', course_id);
    if (worker_id) query = query.eq('worker_id', worker_id);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: '查询失败', detail: error.message }, { status: 500 });
    }

    let result2 = data || [];

    // 补充阿姨名和课程名（从workers和courses表）
    if (result2.length > 0) {
      const workerIds = [...new Set(result2.map((r: Record<string, unknown>) => r.worker_id as string))];
      const courseIds = [...new Set(result2.map((r: Record<string, unknown>) => r.course_id as string))];

      const { data: workers } = await supabase.from('workers').select('id, name, phone').in('id', workerIds);
      const { data: courses } = await supabase.from('courses').select('id, title, name').in('id', courseIds);

      const workerMap = new Map((workers || []).map((w: Record<string, unknown>) => [w.id as string, w]));
      const courseMap = new Map((courses || []).map((c: Record<string, unknown>) => [c.id as string, c]));

      result2 = result2.map((r: Record<string, unknown>) => {
        const w = workerMap.get(r.worker_id as string);
        const c = courseMap.get(r.course_id as string);
        return {
          ...r,
          student_id: r.worker_id,  // 兼容旧字段
          student_name: r.student_name || (w as Record<string, unknown>)?.name || '未知',
          student_phone: (w as Record<string, unknown>)?.phone || '',
          course_title: (c as Record<string, unknown>)?.title || (c as Record<string, unknown>)?.name || '未知课程',
        };
      });

      // 关键词搜索
      if (keyword) {
        result2 = result2.filter((r: Record<string, unknown>) => {
          const name = (r.student_name || '') as string;
          return name.includes(keyword);
        });
      }
    }

    // 应用数据权限过滤（2.0: enrollment关联worker_id）
    const visibility = getDataVisibilitySync(session.role, 'students');
    if (visibility === 'own') {
      result2 = result2.filter((r: Record<string, unknown>) => 
        r.worker_id === session.userId
      );
    }

    return NextResponse.json({ success: true, data: result2 });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误', detail: String(err) }, { status: 500 });
  }
}

// POST /api/students — 新建报名（enrollment）2.0: student_id→worker_id
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'students:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { course_id, student_id, worker_id } = body;

    // 兼容新旧参数名
    const finalWorkerId = worker_id || student_id;
    if (!course_id || !finalWorkerId) {
      return NextResponse.json({ error: '课程ID和学员ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查重复报名
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('worker_id', finalWorkerId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '该学员已报名此课程' }, { status: 409 });
    }

    // 获取阿姨名
    const { data: worker } = await supabase
      .from('workers')
      .select('name')
      .eq('id', finalWorkerId)
      .single();

    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        id,
        course_id,
        worker_id: finalWorkerId,
        student_name: worker?.name || null,
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

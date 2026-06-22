
import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/enrollments — 获取学员报名记录（2.0: student_id→worker_id）
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
    const workerId = request.nextUrl.searchParams.get('worker_id');
    const status = request.nextUrl.searchParams.get('status');
    const withCourses = request.nextUrl.searchParams.get('with_courses') === 'true';
    const withWorkers = request.nextUrl.searchParams.get('with_workers') === 'true';

    // 查询报名记录 (v2: 兼容两种schema)
    let query = supabase
      .from('enrollments')
      .select('*')
      .order('id', { ascending: false });

    if (courseId) query = query.eq('course_id', courseId);
    if (workerId) {
      // worker_id可能不存在，尝试查询
      try {
        query = query.eq('worker_id', workerId);
      } catch { /* ignore */ }
    }
    if (status) query = query.eq('status', status);

    // 数据权限过滤：非admin只看自己相关的报名
    if (session.role !== 'admin') {
      if (session.role === 'instructor') {
        const { data: myCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('instructor_id', session.userId);
        if (myCourses && myCourses.length > 0) {
          const courseIds = myCourses.map(c => c.id);
          const { data: allData } = await supabase
            .from('enrollments')
            .select('*')
            .order('id', { ascending: false });
          return NextResponse.json({ 
            data: (allData || []).filter(e => courseIds.includes((e as Record<string,unknown>).course_id as string)) 
          });
        } else {
          return NextResponse.json({ data: [] });
        }
      } else if (session.role === 'recruiter') {
        // enrolled_by may not exist, filter in code
        const { data: allData } = await supabase
          .from('enrollments')
          .select('*')
          .order('id', { ascending: false });
        return NextResponse.json({ 
          data: (allData || []).filter(e => (e as Record<string,unknown>).enrolled_by === session.userId) 
        });
      }
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

    const enrollmentsList = (data || []) as Record<string, unknown>[];

    // 如果需要课程信息，单独查询 courses 表再合并
    if (withCourses && enrollmentsList.length > 0) {
      const courseIds = [...new Set(enrollmentsList.map(e => e.course_id as string).filter(Boolean))];
      if (courseIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('id, name, type, price, description, location, status, course_type')
          .in('id', courseIds);
        const courseMap: Record<string, unknown> = {};
        (courses || []).forEach((c: Record<string, unknown>) => {
          courseMap[c.id as string] = c;
        });
        enrollmentsList.forEach(e => {
          (e as Record<string, unknown>).course = courseMap[e.course_id as string] || null;
        });
      }
    }

    // 如果需要阿姨信息（替代原来students表查询）
    if (withWorkers && enrollmentsList.length > 0) {
      const workerIds = [...new Set(enrollmentsList.map(e => e.worker_id as string).filter(Boolean))];
      if (workerIds.length > 0) {
        const { data: workers } = await supabase
          .from('workers')
          .select('id, name, phone, job_types, status')
          .in('id', workerIds);
        const workerMap: Record<string, unknown> = {};
        (workers || []).forEach((w: Record<string, unknown>) => {
          workerMap[w.id as string] = w;
        });
        enrollmentsList.forEach(e => {
          (e as Record<string, unknown>).worker = workerMap[e.worker_id as string] || null;
          // 补充student_name
          const w = workerMap[e.worker_id as string] as Record<string, unknown> | undefined;
          if (w && !(e as Record<string, unknown>).student_name) {
            (e as Record<string, unknown>).student_name = w.name || '';
          }
        });
      }
    }

    return NextResponse.json({ data: enrollmentsList });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[enrollments GET] Error:', message);
    return NextResponse.json({ error: '查询失败', detail: String(error), message }, { status: 500 });
  }
}

// POST /api/enrollments — 创建报名（2.0: student_id→worker_id）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'enrollments:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { course_id, worker_id, student_id } = body as {
      course_id?: string;
      worker_id?: string;
      student_id?: string;  // 兼容旧参数名
    };

    // course_id必填
    if (!course_id) {
      return NextResponse.json({ error: 'course_id为必填' }, { status: 400 });
    }

    // 2.0: 优先用worker_id，兼容旧student_id参数，阿姨自助报名时用session.userId找对应worker
    let finalWorkerId = worker_id || student_id;
    if (!finalWorkerId && (session.role === 'worker')) {
      // 阿姨自助报名：通过user_id查自己的worker记录
      const { getSupabaseClient } = await import('@/storage/database/supabase-client');
      const supabase = getSupabaseClient();
      const { data: myWorker } = await supabase
        .from('workers')
        .select('id')
        .eq('user_id', session.userId)
        .maybeSingle();
      if (myWorker) finalWorkerId = myWorker.id;
    }
    if (!finalWorkerId) {
      return NextResponse.json({ error: 'worker_id为必填' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 校验课程存在
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, max_students, current_students, status')
      .eq('id', course_id)
      .maybeSingle();
    if (courseErr || !course) {
      return NextResponse.json({ error: '课程不存在' }, { status: 400 });
    }
    if (course.status === 'closed') {
      return NextResponse.json({ error: '课程已满员，无法报名' }, { status: 400 });
    }

    // 校验worker存在
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, name')
      .eq('id', finalWorkerId)
      .maybeSingle();
    if (workerErr || !worker) {
      return NextResponse.json({ error: '阿姨记录不存在' }, { status: 400 });
    }

    // 防重复报名
    const { data: existing, error: existErr } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course_id)
      .eq('worker_id', finalWorkerId)
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
      worker_id: finalWorkerId,
      student_name: worker.name || null,
      enrolled_by: session.userId,
      status: 'enrolled',
    };

    const { data, error } = await supabase
      .from('enrollments')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[enrollments POST] insert error:', error);
      const err = error as unknown as Record<string, unknown>;
      return NextResponse.json({ 
        error: '创建报名失败', 
        detail: error?.message || String(error),
        code: err?.code,
        hint: err?.hint 
      }, { status: 500 });
    }

    // 报名成功后更新课程人数
    if (data) {
      const newCount = (course.current_students || 0) + 1;
      const updateData: Record<string, unknown> = {
        current_students: newCount,
        updated_at: new Date().toISOString()
      };
      if (course.max_students && newCount >= course.max_students) {
        updateData.status = 'closed';
      }
      await supabase
        .from('courses')
        .update(updateData)
        .eq('id', course_id);
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[enrollments POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/enrollments — 更新报名（状态、打分等）
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'enrollments:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { id, status, score, notes } = body as {
      id: string;
      status?: string;
      score?: number;
      notes?: string;
    };

    if (!id) {
      return NextResponse.json({ error: '缺少报名ID' }, { status: 400 });
    }

    // 边界校验：分数范围 0-100
    if (score !== undefined) {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        return NextResponse.json({ error: '分数必须在0-100之间' }, { status: 400 });
      }
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 检查报名是否存在
    const { data: existing, error: fetchErr } = await supabase
      .from('enrollments')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: '未找到该报名记录' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) updates.status = status;
    if (score !== undefined) updates.score = score;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[enrollments PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[enrollments PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

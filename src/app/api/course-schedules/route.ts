import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/course-schedules — 查询排课表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'course_schedules:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const instructorId = searchParams.get('instructor_id');
    const status = searchParams.get('status');

    const supabase = getSupabaseClient();

    let query = supabase.from('course_schedules').select('*');

    if (courseId) query = query.eq('course_id', courseId);
    if (instructorId) query = query.eq('instructor_id', instructorId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/course-schedules — 创建排课
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'course_schedules:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { course_id, instructor_id, start_time, end_time, location, max_students, date, schedule_date } = body as {
      course_id: string;
      instructor_id?: string;
      start_time: string;
      end_time: string;
      location?: string;
      max_students?: number;
      date?: string;
      schedule_date?: string;
    };

    if (!course_id || !start_time || !end_time) {
      return NextResponse.json({ ok: false, error: '课程ID、开始时间和结束时间为必填项' }, { status: 400 });
    }

    // 处理日期字段：优先使用传入的date/schedule_date，否则从start_time提取
    const scheduleDate = date || schedule_date || (start_time ? start_time.split('T')[0] : null);
    // 提取时间部分：DB start_time/end_time 为 varchar(10)，存 HH:MM 格式
    const extractTime = (iso: string) => {
      const t = iso.split('T')[1];
      return t ? t.substring(0, 5) : iso.substring(0, 5);
    };
    const finalStartTime = extractTime(start_time);
    const finalEndTime = extractTime(end_time);

    // 自动从token填充讲师ID
    const finalInstructorId = instructor_id || session.userId;

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('course_schedules')
      .insert({
        course_id,
        instructor_id: finalInstructorId,
        start_time: finalStartTime,
        end_time: finalEndTime,
        date: scheduleDate,
        location: location || null,
        max_students: max_students || null,
        status: 'pending',
        created_by: session.userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, success: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

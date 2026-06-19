import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/course-schedules — 查询排课表
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'course_schedules:read');
  if (!session) return unauthorizedResponse();

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
  const session = await checkPermission(request, 'course_schedules:write');
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { course_id, instructor_id, start_time, end_time, location, max_students } = body as {
      course_id: string;
      instructor_id?: string;
      start_time: string;
      end_time: string;
      location?: string;
      max_students?: number;
    };

    if (!course_id || !start_time || !end_time) {
      return NextResponse.json({ ok: false, error: '课程ID、开始时间和结束时间为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('course_schedules')
      .insert({
        course_id,
        instructor_id: instructor_id || null,
        start_time,
        end_time,
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

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

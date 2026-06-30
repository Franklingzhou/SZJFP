import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 排课管理 API（课节级别，比 course-schedules 更细粒度）
 *
 * GET  /api/schedules — 查询课节列表（支持日期范围、课程、讲师、场地筛选）
 * POST /api/schedules — 创建课节
 * PUT  /api/schedules — 更新课节
 *
 * 说明：course_schedules 侧重"课程排期"（哪个课程什么时间段），
 *       本 API 侧重"课节管理"（哪天哪节课，支持考勤关联、学员名单等）。
 *       数据存储在同一张 course_schedules 表，但本 API 提供了日期范围筛选
 *       和课节级别的 CRUD（如更新单节课考勤状态、备注等）。
 */

// GET /api/schedules — 查询课节
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'schedules:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const instructorId = searchParams.get('instructor_id');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const location = searchParams.get('location');

    const supabase = getSupabaseClient();

    let query = supabase.from('course_schedules').select(`
      *,
      courses!inner(name, instructor_name)
    `);

    if (courseId) query = query.eq('course_id', courseId);
    if (instructorId) query = query.eq('instructor_id', instructorId);
    if (status) query = query.eq('status', status);
    if (location) query = query.eq('location', location);
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    // 如果联接查询失败（表可能没有外键），回退到基础查询
    // eslint-disable-next-line prefer-const -- data 在 fallback 路径中被重新赋值
    let { data, error } = await query.order('date', { ascending: true }).order('start_time', { ascending: true });

    if (error) {
      // 回退：不用 join，直接查
      const fallback = supabase.from('course_schedules').select('*');
      if (courseId) fallback.eq('course_id', courseId);
      if (instructorId) fallback.eq('instructor_id', instructorId);
      if (status) fallback.eq('status', status);
      if (location) fallback.eq('location', location);
      if (dateFrom) fallback.gte('date', dateFrom);
      if (dateTo) fallback.lte('date', dateTo);
      const fb = await fallback.order('date', { ascending: true }).order('start_time', { ascending: true });
      if (fb.error) {
        return NextResponse.json({ ok: false, error: fb.error.message }, { status: 500 });
      }
      data = fb.data;
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/schedules — 创建课节
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'schedules:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const {
      course_id, instructor_id, date, start_time, end_time,
      location, max_students, note, schedule_date,
    } = body as {
      course_id: string; instructor_id?: string; date?: string;
      start_time: string; end_time: string; location?: string;
      max_students?: number; note?: string; schedule_date?: string;
    };

    if (!course_id || !start_time || !end_time) {
      return NextResponse.json({
        ok: false, error: '课程ID、开始时间和结束时间为必填项',
      }, { status: 400 });
    }

    // 提取日期和纯时间
    const scheduleDate = date || schedule_date || (start_time.includes('T') ? start_time.split('T')[0] : new Date().toISOString().split('T')[0]);
    const extractTime = (iso: string) => {
      const t = iso.split('T')[1];
      return t ? t.substring(0, 5) : iso.substring(0, 5);
    };
    const finalStart = extractTime(start_time);
    const finalEnd = extractTime(end_time);

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('course_schedules')
      .insert({
        course_id,
        instructor_id: instructor_id || session.userId,
        date: scheduleDate,
        start_time: finalStart,
        end_time: finalEnd,
        location: location || null,
        max_students: max_students || null,
        note: note || null,
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

// PUT /api/schedules — 更新课节
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'schedules:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const body = await request.json();
    const { id } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少课节ID' }, { status: 400 });
    }

    // 白名单字段
    const allowedFields = [
      'instructor_id', 'date', 'start_time', 'end_time',
      'location', 'max_students', 'note', 'status',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('course_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '课节不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

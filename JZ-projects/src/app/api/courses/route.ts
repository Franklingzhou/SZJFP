import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/courses — 获取课程列表
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'courses:read');
  if (!session) return unauthorizedResponse();
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const status = request.nextUrl.searchParams.get('status');
    const instructorId = request.nextUrl.searchParams.get('instructor_id');
    const type = request.nextUrl.searchParams.get('type');
    const courseType = request.nextUrl.searchParams.get('course_type');

    let query = supabase
      .from('courses')
      .select('id, name, instructor_id, type, course_type, max_students, current_students, start_date, end_date, hours, price, description, location, status, approved_by, approved_at, created_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (instructorId) query = query.eq('instructor_id', instructorId);
    if (type) query = query.eq('type', type);
    if (courseType) query = query.eq('course_type', courseType);

    const { data, error } = await query;

    if (error) {
      console.error('[courses GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[courses GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/courses — 更新课程（审批等）
// v9: 加显式字段白名单，禁止{...updates}直接写入
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'courses:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少课程ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 显式白名单：只允许更新以下字段
    const allowedFields = ['name', 'instructor_id', 'type', 'course_type', 'max_students', 'current_students', 'start_date', 'end_date', 'hours', 'price', 'description', 'location', 'status', 'approved_by', 'approved_at'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeUpdates[key] = body[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('courses')
      .update(safeUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[courses PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该课程' }, { status: 404 });
    }

    // 尝试写入 package_items（列可能不存在，忽略错误）
    if (body.package_items) {
      const pkgVal = typeof body.package_items === 'string' ? body.package_items : JSON.stringify(body.package_items);
      const { error: pkgErr } = await supabase.from('courses').update({ package_items: pkgVal }).eq('id', id);
      if (pkgErr && !String(pkgErr.message || '').includes('does not exist')) {
        console.error('[courses PUT] package_items error:', pkgErr);
      }
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[courses PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/courses — 新建课程（讲师/培训主管）
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'courses:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { name, instructor_id, type, course_type, max_students, start_date, end_date, hours, price, description, location } = body as Record<string, unknown>;

    if (!name || !instructor_id) {
      return NextResponse.json({ ok: false, error: '缺少课程名称或讲师ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const id = crypto.randomUUID();
    const { data, error } = await supabase
      .from('courses')
      .insert({
        id,
        name,
        instructor_id,
        type: type || '技能提升',
        course_type: course_type || 'single',
        max_students: max_students || 20,
        current_students: 0,
        start_date: start_date || null,
        end_date: end_date || null,
        hours: hours || 0,
        price: price || 0,
        description: description || null,
        location: location || null,
        status: 'pending_approval',
      })
      .select()
      .single();

    if (error) {
      console.error('[courses POST] DB error:', error);
      const e = error as unknown as Record<string,unknown>;
      return NextResponse.json({
        ok: false,
        error: '创建失败',
        detail: String(error),
        message: e?.message || '',
        code: e?.code || '',
        hint: e?.hint || '',
        details: e?.details || '',
      }, { status: 500 });
    }

    // 尝试写入 package_items（列可能不存在，忽略错误）
    if (body.package_items) {
      const pkgVal = typeof body.package_items === 'string' ? body.package_items : JSON.stringify(body.package_items);
      const { error: pkgErr } = await supabase.from('courses').update({ package_items: pkgVal }).eq('id', id);
      if (pkgErr && !String(pkgErr.message || '').includes('does not exist')) {
        console.error('[courses POST] package_items error:', pkgErr);
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[courses POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

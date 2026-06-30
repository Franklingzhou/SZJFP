import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';

// PUT /api/courses/[id] — 更新课程
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'courses:write');
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, type, duration, price, status, instructor_id, max_students } = body as Record<string, unknown>;

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (duration !== undefined) updates.duration = duration;
    if (price !== undefined) updates.price = price;
    if (status !== undefined) updates.status = status;
    if (instructor_id !== undefined) updates.instructor_id = instructor_id;
    if (max_students !== undefined) updates.max_students = max_students;

    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/courses/[id] — 获取单个课程详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'courses:read');
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '缺少课程ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[courses detail] Error:', error.message);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '课程不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

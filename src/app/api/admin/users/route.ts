import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';

// GET /api/admin/users — 获取用户列表（支持筛选+分页）
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'users:read');

  if (session instanceof NextResponse) return session;
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const role = request.nextUrl.searchParams.get('role');
    const reviewStatus = request.nextUrl.searchParams.get('review_status');
    const isActive = request.nextUrl.searchParams.get('is_active');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const pageSize = parseInt(request.nextUrl.searchParams.get('page_size') || '20');

    let query = supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active, reviewed_by, reviewed_at, register_source, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (reviewStatus) query = query.eq('review_status', reviewStatus);
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[admin/users GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], total: count || 0, page, page_size: pageSize });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[admin/users GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/admin/users — 更新用户（审核、角色、状态等）
export async function PUT(request: NextRequest) {
  const session = await requirePermission(request, 'users:write');

  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const { id, review_status, is_active, reviewed_by, role, name } = body as {
      id: string;
      review_status?: string;
      is_active?: boolean;
      reviewed_by?: string;
      role?: string;
      name?: string;
    };

    if (!id) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 显式白名单更新
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (review_status !== undefined) updates.review_status = review_status;
    if (is_active !== undefined) updates.is_active = is_active;
    if (reviewed_by !== undefined) updates.reviewed_by = reviewed_by;

    // 修改 review_status 为 approved/rejected 时，自动填入审核人和时间
    if (review_status === 'approved' || review_status === 'rejected') {
      updates.reviewed_by = session.userId;
      updates.reviewed_at = new Date().toISOString();
    }

    // 停用用户时，自动标记为rejected
    if (is_active === false) {
      updates.review_status = 'rejected';
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[admin/users PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '未找到该用户' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[admin/users PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/users — 获取用户列表（管理员用）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'users:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const role = request.nextUrl.searchParams.get('role');
    const reviewStatus = request.nextUrl.searchParams.get('review_status');
    const search = request.nextUrl.searchParams.get('search');

    let query = supabase
      .from('users')
      .select('id, name, phone, role, review_status, wechat_openid, is_active, created_at, updated_at, pending_role, pending_role_status')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (reviewStatus) query = query.eq('review_status', reviewStatus);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;

    if (error) {
      console.error('[users GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[users GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/users — 更新用户（审核、离职、重新入职等）
// v9: 补checkPermission认证 + 加显式字段白名单，禁止{...updates}直接写入
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'users:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { id } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 显式白名单：只允许更新以下字段
    const allowedFields = ['name', 'phone', 'role', 'review_status', 'is_active'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeUpdates[key] = body[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    // 2.0: 校验角色值合法性
    const VALID_ROLES = ['admin', 'agent', 'recruiter', 'instructor', 'worker', 'customer', 'training_supervisor', 'worker_operator'];
    if (safeUpdates.role && !VALID_ROLES.includes(safeUpdates.role as string)) {
      return NextResponse.json({ error: `无效的角色值，合法值：${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', id)
      .select('id, name, phone, role, review_status, is_active');

    if (error) {
      console.error('[users PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该用户' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[users PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

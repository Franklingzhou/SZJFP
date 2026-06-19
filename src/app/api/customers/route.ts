import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// GET /api/customers — 获取客户列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'customers:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');
    const user_id = searchParams.get('user_id');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const agent_id = searchParams.get('agent_id');

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    let query = supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (name) query = query.ilike('name', `%${name}%`);
    if (phone) query = query.ilike('phone', `%${phone}%`);
    if (user_id) query = query.eq('user_id', user_id);
    if (status) query = query.eq('status', status);
    if (source) query = query.ilike('source', `%${source}%`);
    if (agent_id) query = query.eq('agent_id', agent_id);

    const { data, error } = await query;
    if (error) {
      console.error('[customers GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'customers');
    let filteredData = data || [];
    
    if (visibility === 'own') {
      // 只能看自己负责的客户
      filteredData = filteredData.filter(customer => customer.agent_id === session.userId);
    }
    // 'all' 权限返回全部数据，'hidden' 返回空数组

    return NextResponse.json({ data: filteredData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[customers GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/customers — 新建客户
export async function POST(request: NextRequest) {
  // 使用checkPermissionDetailed区分未登录和无权限
  const result = await checkPermissionDetailed(request, 'customers:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') {
      return unauthorizedResponse();
    }
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { user_id, name, phone, requirement, address, source, agent_id } = body as {
      user_id?: string; name: string; phone: string; requirement?: string; address?: string;
      source?: string; agent_id?: string;
    };

    if (!name || !phone) {
      return NextResponse.json({ error: '缺少必要参数(name/phone)' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const insertData: Record<string, unknown> = {
      name,
      phone,
      requirement: requirement || null,
      address: address || null,
      user_id: user_id || session.userId,
      status: 'new',
      source: source || null,
      agent_id: agent_id || session.userId,
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[customers POST] DB error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[customers POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/customers — 更新客户
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'customers:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少客户ID' }, { status: 400 });
    }

    // 白名单：只允许改这些字段
    const allowedFields = ['name', 'phone', 'requirement', 'address', 'credit_score', 'status', 'source', 'agent_id'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    // status 枚举校验
    if (safeUpdates.status && !['new', 'following', 'ordered', 'serving', 'completed', 'lost'].includes(safeUpdates.status as string)) {
      return NextResponse.json({ error: '无效的状态值(允许: new/following/ordered/serving/completed/lost)' }, { status: 400 });
    }

    safeUpdates.updated_at = new Date().toISOString();

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('customers')
      .update(safeUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[customers PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该客户' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[customers PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/customers — 删除客户（仅admin）
export async function DELETE(request: NextRequest) {
  const session = await checkPermission(request, 'customers:write');
  if (!session) return unauthorizedResponse();
  if (session.role !== 'admin') {
    return NextResponse.json({ error: '仅管理员可删除客户' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: '缺少客户ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.error('[customers DELETE] DB error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '删除失败';
    console.error('[customers DELETE] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
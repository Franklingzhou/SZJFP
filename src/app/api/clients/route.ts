import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/clients — 获取客户列表（支持管理端和小程序端）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'customers:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const supabase = getSupabaseClient();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const agentId = searchParams.get('agent_id');
    const search = searchParams.get('search');

    let query = supabase
      .from('customers')
      .select('id, name, phone, status, source, agent_id, requirement, address, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);
    if (agentId) query = query.eq('agent_id', agentId);

    // 数据权限：agent 只看自己的客户
    if (session.role === 'agent') {
      query = query.eq('agent_id', session.userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[clients GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let filtered = data || [];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(c => 
        (c.name || '').toLowerCase().includes(s) || 
        (c.phone || '').includes(s)
      );
    }

    return NextResponse.json({ ok: true, data: filtered });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[clients GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/clients — 创建新客户
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'customers:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { name, phone, source, requirement, address, agent_id } = body as {
      name: string; phone: string; source?: string; requirement?: string;
      address?: string; agent_id?: string;
    };

    if (!name || !phone) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：name, phone' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name,
        phone,
        source: source || 'direct',
        requirement: requirement || null,
        address: address || null,
        agent_id: agent_id || session.userId,
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[clients POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[clients POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/clients — 更新客户信息
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'customers:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const body = await request.json();
    const { id, name, phone, status, source, requirement, address, agent_id } = body as {
      id: string; name?: string; phone?: string; status?: string;
      source?: string; requirement?: string; address?: string; agent_id?: string;
    };

    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少客户ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const allowedFields = ['name', 'phone', 'status', 'source', 'requirement', 'address', 'agent_id'];
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[clients PUT] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: '未找到该客户' }, { status: 404 });
    }

    // 流程2：客户流失(closed) → 级联关闭关联订单 + 联动拒绝关联推荐
    if (status === 'closed') {
      const { data: cancelledOrders, error: cascadeErr } = await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString(), cancel_reason: `客户${id}已流失，关联订单自动取消` })
        .eq('customer_id', id)
        .in('status', ['created', 'open', 'assigned', 'signed', 'in_progress'])
        .select('id');
      if (cascadeErr) {
        console.warn('[clients PUT] closed cascade cancel error:', cascadeErr.message);
      } else {
        console.log('[clients PUT] closed → cancelled orders for customer', id);
        // 联动规则9：被取消的订单，其关联推荐全部自动拒绝
        if (cancelledOrders && cancelledOrders.length > 0) {
          const orderIds = cancelledOrders.map((o: { id: string }) => o.id);
          const { error: recErr } = await supabase
            .from('recommendations')
            .update({ status: 'rejected', updated_at: new Date().toISOString(), reject_reason: `客户${id}流失，关联订单自动取消` })
            .in('order_id', orderIds)
            .neq('status', 'rejected');
          if (recErr) console.warn('[clients PUT] cascade reject recs error:', recErr.message);
        }
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[clients PUT] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

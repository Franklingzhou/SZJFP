import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// PUT /api/orders/[id] — 更新订单状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'orders:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, worker_id, signed_worker_id, signed_at, reviewed, ...otherUpdates } = body;

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询当前订单状态
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('id, status, worker_id, signed_worker_id')
      .eq('id', id)
      .single();

    if (!currentOrder) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 状态流转校验
    const validTransitions: Record<string, string[]> = {
      created: ['open', 'cancelled'],
      open: ['assigned', 'signed', 'cancelled'],
      assigned: ['signed', 'open', 'cancelled'],
      signed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (status && !validTransitions[currentOrder.status]?.includes(status)) {
      return NextResponse.json({
        error: `不允许从"${currentOrder.status}"变更为"${status}"`,
        allowed: validTransitions[currentOrder.status] || [],
      }, { status: 400 });
    }

    // 构建更新数据
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (worker_id !== undefined) updates.worker_id = worker_id;
    if (signed_worker_id !== undefined) updates.signed_worker_id = signed_worker_id;
    if (signed_at !== undefined) updates.signed_at = signed_at;
    if (reviewed !== undefined) updates.reviewed = reviewed;

    // 其他允许更新的字段
    const allowedFields = ['title', 'job_type', 'salary_min', 'salary_max', 'location', 'description', 'contact_name', 'contact_phone', 'amount', 'service_fee'];
    for (const field of allowedFields) {
      if (otherUpdates[field] !== undefined) {
        updates[field] = otherUpdates[field];
      }
    }

    // 签约时自动设置signed_at
    if (status === 'signed' && !signed_at) {
      updates.signed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[orders PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[orders PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/orders/[id] — 部分更新订单
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

// GET /api/orders/[id] — 获取单个订单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'orders:read');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
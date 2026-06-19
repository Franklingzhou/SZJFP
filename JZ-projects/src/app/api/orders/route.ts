import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/orders — 获取订单/合单列表
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'orders:read');
  if (!session) return unauthorizedResponse();
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const status = request.nextUrl.searchParams.get('status');
    const agentId = request.nextUrl.searchParams.get('agent_id');
    const workerId = request.nextUrl.searchParams.get('worker_id');
    const customerId = request.nextUrl.searchParams.get('customer_id');

    let query = supabase
      .from('orders')
      .select('id, title, job_type, salary_min, salary_max, salary_type, work_duration, location, description, agent_id, worker_id, customer_id, contact_name, contact_phone, status, service_type, amount, service_fee, commission_rate, start_date, signed_worker_id, signed_at, reviewed, created_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (agentId) query = query.eq('agent_id', agentId);
    if (workerId) query = query.eq('worker_id', workerId);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error } = await query;

    if (error) {
      console.error('[orders GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[orders GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/orders — 创建订单
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'orders:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { title, job_type, salary_min, salary_max, location, description, agent_id, worker_id, customer_id, service_type, amount, start_date, salary_type, work_duration, contact_name, contact_phone } = body as {
      title: string; job_type: string; salary_min: number; salary_max: number;
      location: string; description?: string; agent_id: string;
      worker_id?: string; customer_id?: string; service_type?: string;
      amount?: number; start_date?: string;
      salary_type?: string; work_duration?: string;
      contact_name?: string; contact_phone?: string;
    };

    if (!title || !job_type) {
      return NextResponse.json({ error: '缺少必要参数(标题、工种)' }, { status: 400 });
    }

    const finalAgentId = agent_id || session.userId;
    if (!finalAgentId) {
      return NextResponse.json({ error: '缺少经纪人信息，请重新登录' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('orders')
      .insert({
        title, job_type, salary_min, salary_max, location, description,
        agent_id: finalAgentId, worker_id: worker_id || null, customer_id: customer_id || null,
        service_type, amount, start_date,
        salary_type: salary_type || null, work_duration: work_duration || null,
        contact_name: contact_name || null, contact_phone: contact_phone || null,
        status: 'created', reviewed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[orders POST] DB error:', error);
      return NextResponse.json({ error: '创建失败', detail: error?.message || 'unknown', body: { title, job_type, agent_id: finalAgentId, customer_id, contact_name, contact_phone } }, { status: 500 });
    }

    // A5: 发单后客户status → ordered（仅更新new/following状态的客户）
    if (data && data.customer_id) {
      try {
        const { getSupabaseClient: getSupabase2 } = await import('@/storage/database/supabase-client');
        const supabase2 = getSupabase2();
        const { error: custErr } = await supabase2
          .from('customers')
          .update({ status: 'ordered', updated_at: new Date().toISOString() })
          .eq('id', data.customer_id)
          .or('status.eq.new,status.eq.following');
        if (custErr) console.error('[orders POST] customer status update failed:', custErr.message);
      } catch (e: unknown) {
        console.error('[orders POST] customer status update error:', e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[orders POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/orders — 更新订单（匹配、状态变更等）
// v9: 加显式字段白名单，禁止{...updates}直接写入
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'orders:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 显式白名单：只允许更新以下字段
    const allowedFields = ['title', 'job_type', 'salary_min', 'salary_max', 'salary_type', 'work_duration', 'location', 'description', 'agent_id', 'worker_id', 'customer_id', 'contact_name', 'contact_phone', 'status', 'service_type', 'amount', 'service_fee', 'commission_rate', 'start_date', 'signed_worker_id', 'signed_at', 'reviewed', 'worker_salary', 'commission', 'contract_start_date', 'contract_end_date', 'signing_notes'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeUpdates[key] = body[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('orders')
      .update(safeUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[orders PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该订单' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[orders PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

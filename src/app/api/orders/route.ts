import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { filterDataByPermission, filterSensitiveFields, getDataVisibilitySync } from '@/lib/data-permissions';

// 敏感字段映射（API级别过滤）
const sensitiveFieldsByModule: Record<string, string[]> = {
  workers: ['id_card', 'id_card_front', 'id_card_back'],
  customers: ['address'],
  leads: ['phone'],
  orders: ['contact_phone'],
};

// GET /api/orders — 获取订单/合单列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'orders:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
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

    // 数据权限过滤：非admin只看自己相关的订单
    if (session.role !== 'admin') {
      if (session.role === 'agent') {
        query = query.eq('agent_id', session.userId);
      } else if (session.role === 'worker') {
        query = query.eq('worker_id', session.userId);
      } else if (session.role === 'customer') {
        query = query.eq('customer_id', session.userId);
      }
      // recruiter/instructor/training_supervisor/worker_operator 能看订单大厅全量，不加过滤
    }

    const { data, error } = await query;

    if (error) {
      console.error('[orders GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'orders');
    let filteredData = data || [];
    
    if (visibility === 'own') {
      // 经纪人只能看自己的订单，阿姨只能看与自己相关的订单
      filteredData = filteredData.filter(order => 
        order.agent_id === session.userId || 
        order.signed_worker_id === session.userId ||
        order.worker_id === session.userId
      );
    }
    // 'all' 权限直接返回全部数据，'hidden' 返回空数组已在filterDataByPermission处理

    return NextResponse.json({ data: filteredData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[orders GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/orders — 创建订单/合单
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'orders:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { title, job_type, salary_min, salary_max, location, description, agent_id, worker_id, customer_id, service_type, amount, price, start_date, salary_type, work_duration, contact_name, contact_phone } = body as {
      title: string; job_type?: string; salary_min?: number; salary_max?: number;
      location?: string; description?: string; agent_id?: string;
      worker_id?: string; customer_id?: string; service_type?: string;
      amount?: number; price?: number; start_date?: string;
      salary_type?: string; work_duration?: string;
      contact_name?: string; contact_phone?: string;
    };

    // 同时支持 job_type 和 service_type（优先使用 job_type）
    const finalJobType = job_type || service_type;
    // 自动生成title（如果未提供）
    const finalTitle = title || `订单-${finalJobType || '未分类'}-${Date.now().toString(36)}`;
    if (!finalJobType) {
      return NextResponse.json({ error: '缺少必要参数(工种/job_type或service_type)' }, { status: 400 });
    }

    // 边界校验：金额/价格不能为负
    const finalAmount = amount || price || null;
    if (finalAmount !== null && finalAmount !== undefined && finalAmount < 0) {
      return NextResponse.json({ error: '价格不能为负数' }, { status: 400 });
    }

    const finalAgentId = agent_id || session.userId;
    if (!finalAgentId) {
      return NextResponse.json({ error: '缺少经纪人信息，请重新登录' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // v14: 解析 worker_id 和 customer_id 为 users.id（DB FK 指向 users 表）
    let finalWorkerId = worker_id || null;
    let finalCustomerId = customer_id || null;
    let customerTableId: string | null = null; // 保留原 customers 表 ID，用于状态更新

    if (worker_id) {
      const { data: wk } = await supabase.from('workers').select('user_id').eq('id', worker_id).maybeSingle();
      if (wk) finalWorkerId = wk.user_id;
    }
    if (customer_id) {
      const { data: cust } = await supabase.from('customers').select('user_id').eq('id', customer_id).maybeSingle();
      if (cust) {
        finalCustomerId = cust.user_id;
        customerTableId = customer_id; // 原表ID用于后续状态更新
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        title: finalTitle, job_type: finalJobType, salary_min: salary_min || 0, salary_max: salary_max || 0, location: location || null, description: description || null,
        agent_id: finalAgentId, worker_id: finalWorkerId, customer_id: finalCustomerId,
        service_type: service_type || finalJobType, amount: finalAmount, start_date: start_date || null,
        salary_type: salary_type || null, work_duration: work_duration || null,
        contact_name: contact_name || null, contact_phone: contact_phone || null,
        status: 'open', // A1: 发单后订单状态为open（待匹配）
        reviewed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[orders POST] DB error:', error);
      return NextResponse.json({ error: '创建失败', detail: error?.message || 'unknown', body: { title, job_type, agent_id: finalAgentId, customer_id, contact_name, contact_phone } }, { status: 500 });
    }

    // A5: 发单后客户status → matching（仅更新new/following状态的客户）
    if (data && customerTableId) {
      try {
        const { getSupabaseClient: getSupabase2 } = await import('@/storage/database/supabase-client');
        const supabase2 = getSupabase2();
        const { error: custErr } = await supabase2
          .from('customers')
          .update({ status: 'matching', updated_at: new Date().toISOString() })
          .eq('id', customerTableId)
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
  const result = await checkPermissionDetailed(request, 'orders:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
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

    // 边界校验：金额不能为负
    if (safeUpdates.amount !== undefined && (typeof safeUpdates.amount !== 'number' || safeUpdates.amount < 0)) {
      return NextResponse.json({ error: '金额不能为负数' }, { status: 400 });
    }

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

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/orders/hall — 订单大厅，查询所有待匹配订单
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'orders:read');
  if (!session) return unauthorizedResponse();

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const jobType = request.nextUrl.searchParams.get('job_type');

    // 查询所有 status='created' 的待匹配订单
    let query = supabase
      .from('orders')
      .select('id, title, job_type, salary_min, salary_max, location, description, service_type, agent_id, created_at')
      .eq('status', 'created')
      .order('created_at', { ascending: false });

    if (jobType) {
      query = query.eq('job_type', jobType);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('[orders/hall GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // 批量查经纪人名称
    const agentIds = [...new Set(orders.map((o: { agent_id: string }) => o.agent_id).filter(Boolean))];
    let agentMap: Record<string, string> = {};

    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('users')
        .select('id, name')
        .in('id', agentIds);

      if (agents) {
        agentMap = agents.reduce((acc: Record<string, string>, a: { id: string; name: string }) => {
          acc[a.id] = a.name;
          return acc;
        }, {});
      }
    }

    // 组装结果
    const result = orders.map((o: {
      id: string; title: string; job_type: string;
      salary_min: number; salary_max: number;
      location: string; description: string;
      service_type: string; agent_id: string;
      created_at: string;
    }) => ({
      id: o.id,
      title: o.title,
      job_type: o.job_type,
      salary_min: o.salary_min,
      salary_max: o.salary_max,
      location: o.location,
      description: o.description,
      service_type: o.service_type,
      created_at: o.created_at,
      agent_name: agentMap[o.agent_id] || '未知',
    }));

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[orders/hall GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

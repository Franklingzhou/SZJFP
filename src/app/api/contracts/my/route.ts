import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';

// GET /api/contracts/my — 获取当前用户的合同列表（worker/customer/agent等角色均可查看）
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'contracts:read');

  if (session instanceof NextResponse) return session;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const status = request.nextUrl.searchParams.get('status');
    const type = request.nextUrl.searchParams.get('type');

    let query = supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    // 根据角色过滤：只看自己是甲/乙方
    if (session.role === 'worker' || session.role === 'customer') {
      query = query.or(`party_a_id.eq.${session.userId},party_b_id.eq.${session.userId}`);
    } else if (session.role === 'agent') {
      query = query.eq('party_a_id', session.userId);
    } else if (session.role === 'recruiter' || session.role === 'training_supervisor') {
      // 招生/培训主管看培训合同（己方创建或与自己相关）
      query = query.or(`party_a_id.eq.${session.userId},party_b_id.eq.${session.userId}`);
    } else if (session.role !== 'admin') {
      // 其他角色只看自己相关的
      query = query.or(`party_a_id.eq.${session.userId},party_b_id.eq.${session.userId}`);
    }

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;

    if (error) {
      console.error('[contracts/my GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[contracts/my GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

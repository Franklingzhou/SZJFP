import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/customer-followups — 获取跟进记录
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'customers:read');
  if (!session) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get('customer_id');

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    let query = supabase
      .from('customer_followups')
      .select('*')
      .order('created_at', { ascending: false });

    if (customer_id) query = query.eq('customer_id', customer_id);

    const { data, error } = await query;
    if (error) {
      console.error('[customer-followups GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 关联跟进人信息
    let enrichedData = data || [];
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((r: Record<string, unknown>) => r.follow_up_by as string).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, name, phone, role').in('id', userIds);
        const userMap = new Map((users || []).map((u: Record<string, unknown>) => [u.id, u]));
        enrichedData = data.map((r: Record<string, unknown>) => {
          const user = userMap.get(r.follow_up_by as string) as Record<string, unknown> | undefined;
          return {
            ...r,
            follow_up_by_name: user?.name || '未知',
            follow_up_by_phone: user?.phone || '',
          };
        });
      }
    }

    return NextResponse.json({ data: enrichedData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[customer-followups GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/customer-followups — 新建跟进记录
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'customers:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { customer_id, content, result } = body as {
      customer_id: string; content?: string; result?: string;
    };

    if (!customer_id) {
      return NextResponse.json({ error: '缺少客户ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 验证客户存在
    const { data: customer } = await supabase.from('customers').select('id').eq('id', customer_id).single();
    if (!customer) {
      return NextResponse.json({ error: '客户不存在' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('customer_followups')
      .insert({
        customer_id,
        content: content || null,
        result: result || null,
        follow_up_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[customer-followups POST] DB error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[customer-followups POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/reviews — 获取评价列表（含关联数据）
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'reviews:read');
  if (!session) return unauthorizedResponse();
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const targetUserId = request.nextUrl.searchParams.get('target_user_id');
    const reviewerId = request.nextUrl.searchParams.get('reviewer_id');
    const reviewerRole = request.nextUrl.searchParams.get('reviewer_role');
    const targetRole = request.nextUrl.searchParams.get('target_role');
    const orderId = request.nextUrl.searchParams.get('order_id');
    const hiddenParam = request.nextUrl.searchParams.get('hidden');
    // 1. 查评价记录
    let query = supabase
      .from('reviews')
      .select('id, target_user_id, target_role, reviewer_id, reviewer_role, order_id, rating, content, hidden, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (targetUserId) query = query.eq('target_user_id', targetUserId);
    if (reviewerId) query = query.eq('reviewer_id', reviewerId);
    if (reviewerRole) query = query.eq('reviewer_role', reviewerRole);
    if (targetRole) query = query.eq('target_role', targetRole);
    if (orderId) query = query.eq('order_id', orderId);
    if (hiddenParam === 'true') query = query.eq('hidden', true);
    else if (hiddenParam === 'false') query = query.eq('hidden', false);
    // hidden参数不传时返回全部（包含hidden和未hidden）

    const { data, error } = await query;

    if (error) {
      console.error('[reviews GET] DB error:', error);
      const e = error as unknown as Record<string,unknown>;
      return NextResponse.json({
        error: '查询失败',
        detail: String(error),
        message: e?.message || '',
        code: e?.code || '',
        hint: e?.hint || '',
        details: e?.details || '',
      }, { status: 500 });
    }

    // 2. 收集需要关联查询的ID
    const reviews = (data || []) as Record<string, unknown>[];
    const targetUserIds = [...new Set(reviews.map(r => r.target_user_id as string).filter(Boolean))];
    const reviewerIds = [...new Set(reviews.map(r => r.reviewer_id as string).filter(Boolean))];
    const orderIds = [...new Set(reviews.map(r => r.order_id as string).filter(Boolean))];

    // 3. 批量查用户名
    const userMap: Record<string, string> = {};
    if (targetUserIds.length > 0 || reviewerIds.length > 0) {
      const allUserIds = [...new Set([...targetUserIds, ...reviewerIds])];
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', allUserIds);
      (users || []).forEach((u: Record<string, unknown>) => {
        userMap[u.id as string] = u.name as string;
      });
    }

    // 4. 批量查订单标题
    const orderMap: Record<string, string> = {};
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, title')
        .in('id', orderIds);
      (orders || []).forEach((o: Record<string, unknown>) => {
        orderMap[o.id as string] = o.title as string;
      });
    }

    // 5. 组装结果
    const enriched = reviews.map(r => ({
      ...r,
      worker_name: userMap[r.target_user_id as string] || null,
      reviewer_name: userMap[r.reviewer_id as string] || null,
      order_title: orderMap[r.order_id as string] || null,
    }));

    return NextResponse.json({ data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[reviews GET] Error:', message);
    return NextResponse.json({ error: '查询失败', detail: String(error), message }, { status: 500 });
  }
}

// PUT /api/reviews — 更新评价
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'reviews:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少评价ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 白名单：只允许改3个字段
    const allowedFields = ['rating', 'content', 'hidden'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('reviews')
      .update(safeUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[reviews PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该评价' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[reviews PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/reviews — 新增评价
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'reviews:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { target_user_id, reviewer_id, reviewer_role, rating, content, order_id, target_role } = body as {
      target_user_id: string; reviewer_id?: string; reviewer_role?: string;
      rating: number; content?: string; order_id?: string; target_role?: string;
    };

    if (!rating) {
      return NextResponse.json({ error: '缺少必要参数(评分)' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 从session取评价人信息，禁止硬编码fallback
    const resolvedReviewer = reviewer_id || session.userId;
    const resolvedRole = reviewer_role || session.role;

    if (!target_user_id) {
      return NextResponse.json({ error: '缺少被评价人ID(target_user_id)' }, { status: 400 });
    }
    const resolvedTarget = target_user_id;

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        target_user_id: resolvedTarget,
        target_role: target_role || null,
        reviewer_id: resolvedReviewer,
        reviewer_role: resolvedRole,
        rating, content: content || '', hidden: false,
        order_id: order_id || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[reviews POST] DB error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[reviews POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

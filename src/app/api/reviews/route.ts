import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// GET /api/reviews — 获取评价列表（含关联数据）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'reviews:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const targetUserId = request.nextUrl.searchParams.get('target_user_id');
    const reviewerId = request.nextUrl.searchParams.get('reviewer_id');
    const reviewerRole = request.nextUrl.searchParams.get('reviewer_role');
    const targetRole = request.nextUrl.searchParams.get('target_role');
    const orderId = request.nextUrl.searchParams.get('order_id');
    const hiddenParam = request.nextUrl.searchParams.get('hidden');
    const statusParam = request.nextUrl.searchParams.get('status');
    // 1. 查评价记录
    let query = supabase
      .from('reviews')
      .select('id, target_user_id, target_role, reviewer_id, reviewer_role, order_id, rating, content, hidden, status, hide_reason, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (targetUserId) query = query.eq('target_user_id', targetUserId);
    if (reviewerId) query = query.eq('reviewer_id', reviewerId);
    if (reviewerRole) query = query.eq('reviewer_role', reviewerRole);
    if (targetRole) query = query.eq('target_role', targetRole);
    if (orderId) query = query.eq('order_id', orderId);
    if (hiddenParam === 'true') query = query.eq('hidden', true);
    else if (hiddenParam === 'false') query = query.eq('hidden', false);
    if (statusParam) query = query.eq('status', statusParam);
    // hidden/status参数不传时返回全部

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
    })) as (Record<string, unknown> & {
      worker_name: string | null;
      reviewer_name: string | null;
      order_title: string | null;
    })[];

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'reviews');
    let filteredData = enriched;
    
    if (visibility === 'own') {
      // 只能看自己相关的评价（自己评价的或评价自己的）
      filteredData = filteredData.filter(review => 
        review.target_user_id === session.userId || 
        review.reviewer_id === session.userId
      );
    }
    // 'all' 权限返回全部数据，'hidden' 返回空数组

    return NextResponse.json({ data: filteredData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[reviews GET] Error:', message);
    return NextResponse.json({ error: '查询失败', detail: String(error), message }, { status: 500 });
  }
}

// PUT /api/reviews — 更新评价
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'reviews:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少评价ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 2.0: 校验所有权 — 只能编辑自己的评价（admin除外）
    if (session.role !== 'admin') {
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('reviewer_id')
        .eq('id', id)
        .maybeSingle();
      if (!existingReview) {
        return NextResponse.json({ error: '未找到该评价' }, { status: 404 });
      }
      if ((existingReview as Record<string, unknown>).reviewer_id !== session.userId) {
        return NextResponse.json({ error: '只能编辑自己的评价' }, { status: 403 });
      }
    }

    // 白名单：允许修改的字段
    const allowedFields = ['rating', 'content', 'hidden', 'status', 'hide_reason'];
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

// 2.0 互评矩阵：谁可以评价谁
// admin / training_supervisor 不参与互评
// customer 不可评 recruiter, worker_operator
// recruiter / instructor / worker_operator 不可评 customer
const REVIEW_MATRIX: Record<string, string[]> = {
  customer:          ['worker', 'agent', 'instructor'],
  worker:            ['customer', 'agent', 'recruiter', 'instructor', 'worker_operator'],
  agent:             ['worker', 'agent', 'customer', 'recruiter', 'instructor', 'worker_operator'],
  recruiter:         ['worker', 'agent', 'instructor', 'worker_operator'],
  instructor:        ['worker', 'agent', 'recruiter', 'worker_operator'],
  worker_operator:   ['worker', 'agent', 'recruiter', 'instructor'],
};

function checkReviewPermission(reviewerRole: string, targetRole: string): boolean {
  // 管理员和培训主管不参与互评
  if (reviewerRole === 'admin' || reviewerRole === 'training_supervisor') return false;
  const allowedTargets = REVIEW_MATRIX[reviewerRole];
  if (!allowedTargets) return false;
  return allowedTargets.includes(targetRole);
}

// POST /api/reviews — 新增评价
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'reviews:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    // 同时支持 comment 和 content 字段名，兼容 target_id/target_user_id
    const { target_user_id, target_id, reviewer_id, reviewer_role, rating, content, comment, order_id, target_role, target_type } = body as {
      target_user_id?: string; target_id?: string; reviewer_id?: string; reviewer_role?: string;
      rating: number; content?: string; comment?: string; order_id?: string; target_role?: string; target_type?: string;
    };

    if (!rating) {
      return NextResponse.json({ error: '缺少必要参数(评分)' }, { status: 400 });
    }
    // 评分范围校验
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: '评分需在1-5之间' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // v13: 兼容 target_id 别名
    let resolvedTarget = target_user_id || target_id;
    if (!resolvedTarget) {
      return NextResponse.json({ error: '缺少被评价人ID(target_user_id或target_id)' }, { status: 400 });
    }

    // v14: 解析目标用户ID — reviews.target_user_id 有 FK 约束指向 users.id
    // 如果传入的是 worker ID 或其他ID，自动转为对应的 users.id
    const { data: targetUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', resolvedTarget)
      .maybeSingle();
    if (!targetUser) {
      // 不在users表中 → 尝试从workers表查关联user_id
      const { data: workerInfo } = await supabase
        .from('workers')
        .select('user_id, id')
        .eq('id', resolvedTarget)
        .maybeSingle();
      if (workerInfo?.user_id) {
        resolvedTarget = workerInfo.user_id;
      } else {
        // v14: 也不在workers表 → 尝试从customers表查关联user_id
        const { data: custInfo } = await supabase
          .from('customers')
          .select('user_id, id')
          .eq('id', resolvedTarget)
          .maybeSingle();
        if (custInfo?.user_id) {
          resolvedTarget = custInfo.user_id;
        } else {
          // 也不在customers表 → 尝试从users按phone/name查找
        const { data: userByPhone } = await supabase
          .from('users')
          .select('id')
          .or(`phone.eq.${resolvedTarget},name.eq.${resolvedTarget}`)
          .limit(1)
          .maybeSingle();
        if (userByPhone) {
          resolvedTarget = userByPhone.id;
        } else {
          return NextResponse.json({ error: `未找到目标用户: ${resolvedTarget}（需为有效的用户ID、阿姨ID、手机号或姓名）` }, { status: 400 });
        }
      }
    }
  }
    // 如果提供了target_type，用作target_role
    let resolvedTargetRole = target_role || target_type || null;
    // 优先使用content，fallback到comment
    const resolvedContent = content || comment || '';
    // 从session取评价人信息
    const resolvedReviewer = reviewer_id || session.userId;
    const resolvedRole = reviewer_role || session.role;

    // 2.0: 如果未传 target_role，从 users 表查目标用户角色
    if (!resolvedTargetRole && resolvedTarget) {
      const { data: targetUserInfo } = await supabase
        .from('users')
        .select('role')
        .eq('id', resolvedTarget)
        .maybeSingle();
      if (targetUserInfo) {
        resolvedTargetRole = (targetUserInfo as Record<string, unknown>).role as string;
      }
    }

    // 2.0 互评矩阵校验
    if (!resolvedTargetRole) {
      return NextResponse.json({ error: '无法确定被评价人角色，请提供 target_role' }, { status: 400 });
    }
    if (!checkReviewPermission(resolvedRole, resolvedTargetRole)) {
      return NextResponse.json({ error: `角色 ${resolvedRole} 不能评价 ${resolvedTargetRole}` }, { status: 403 });
    }

    // 审核上线：新评价默认待审核（hidden=true, status='pending'）
    const reviewId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        id: reviewId,
        target_user_id: resolvedTarget,
        target_role: resolvedTargetRole,
        reviewer_id: resolvedReviewer,
        reviewer_role: resolvedRole,
        rating, content: resolvedContent, hidden: true,
        status: 'pending',
        order_id: order_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[reviews POST] DB error:', JSON.stringify(error));
      return NextResponse.json({ error: `创建失败: ${error.message || error.code || ''}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[reviews POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// GET /api/recommendations — 获取推荐列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'recommendations:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const orderId = searchParams.get('order_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('recommendations')
      .select('*')
      .order('created_at', { ascending: false });

    if (orderId) {
      query = query.eq('order_id', orderId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[recommendations GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'recommendations');
    let filteredData = data || [];
    
    if (visibility === 'own') {
      // 只能看自己相关的推荐记录
      filteredData = filteredData.filter(rec => 
        rec.recommender_id === session.userId || 
        rec.agent_id === session.userId || 
        rec.worker_id === session.userId
      );
    }
    // 'all' 权限返回全部数据，'hidden' 返回空数组

    return NextResponse.json({ ok: true, data: filteredData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[recommendations GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/recommendations — 创建推荐
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'recommendations:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { order_id, worker_id, notes, customer_id, reason } = body as {
      order_id?: string;
      worker_id?: string;
      notes?: string;
      customer_id?: string;
      reason?: string;
    };

    // v14: 兼容 customer_id→order_id，reason→notes
    const finalNotes = notes || reason || null;
    const finalWorkerId = worker_id;
    let finalOrderId = order_id;
    
    // 如果没传order_id但有customer_id，解析customer_id→user_id后查该客户最后一个订单
    if (!finalOrderId && customer_id) {
      // 先解析 customer_id 为 users.id（可能是customers表ID）
      let customerUserId = customer_id;
      const { data: custInfo } = await supabase
        .from('customers')
        .select('user_id')
        .eq('id', customer_id)
        .maybeSingle();
      if (custInfo?.user_id) customerUserId = custInfo.user_id;
      
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastOrder) finalOrderId = lastOrder.id;
    }
    
    // 如果仍然没有order_id，允许仅凭 worker_id 和 customer_id 创建推荐
    if (!finalWorkerId) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：worker_id' }, { status: 400 });
    }

    // 检查订单是否存在
    if (finalOrderId) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id')
        .eq('id', finalOrderId)
        .single();

      if (orderError || !orderData) {
        return NextResponse.json({ ok: false, error: '订单不存在' }, { status: 404 });
      }
    }

    // 检查阿姨是否存在
    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('id, creator_id')
      .eq('id', finalWorkerId)
      .single();

    if (workerError || !workerData) {
      return NextResponse.json({ ok: false, error: '阿姨不存在' }, { status: 404 });
    }

    // ⚠️ 去重校验必须在「标记旧推荐为rejected」之前执行
    // 防重复推荐：同一订单+同一阿姨已有pending/accepted时，禁止推荐
    if (finalOrderId) {
      const { data: existingRec, error: dupErr } = await supabase
        .from('recommendations')
        .select('id, status')
        .eq('order_id', finalOrderId)
        .eq('worker_id', finalWorkerId)
        .in('status', ['pending', 'accepted'])
        .limit(1);
      if (!dupErr && existingRec && existingRec.length > 0) {
        return NextResponse.json({
          ok: false,
          error: `已存在该订单+阿姨的推荐（${existingRec[0].status}），请勿重复推荐`,
        }, { status: 409 });
      }
    }

    // 推荐前，把同一订单同一阿姨的旧推荐标记为rejected（仅清理已非pending/accepted的记录）
    if (finalOrderId) {
      await supabase
        .from('recommendations')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('order_id', finalOrderId)
        .eq('worker_id', finalWorkerId)
        .neq('status', 'rejected');
    }

    // A15 自动确认：经纪人推荐自己创建的阿姨，状态直接为 accepted
    const autoAccepted = workerData.creator_id === session.userId;
    const recStatus = autoAccepted ? 'accepted' : 'pending';

    const { data, error } = await supabase
      .from('recommendations')
      .insert({
        order_id: finalOrderId,
        worker_id: finalWorkerId,
        recommender_id: session.userId,
        recommender_role: session.role,
        notes: finalNotes,
        status: recStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[recommendations POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, success: true, data, auto_accepted: autoAccepted });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '推荐失败';
    console.error('[recommendations POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

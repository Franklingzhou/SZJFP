import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// 中介合同流程：
// 经纪人发起(draft) -> 经纪人确认+阿姨确认(signed) -> 经纪人最终确认生效(active)
// reject: rejected

// GET /api/agency-contracts — 获取中介合同列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'contracts:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const orderId = searchParams.get('order_id');
    const partyAId = searchParams.get('party_a_id');
    const partyBId = searchParams.get('party_b_id');

    let query = supabase
      .from('agency_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (orderId) query = query.eq('order_id', orderId);
    if (partyAId) query = query.eq('party_a_id', partyAId);
    if (partyBId) query = query.eq('party_b_id', partyBId);

    const { data, error } = await query;

    if (error) {
      console.error('[agency-contracts GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'contracts');
    let filteredData = data || [];
    
    if (visibility === 'own') {
      // 只能看自己相关的合同（自己是甲方或乙方）
      filteredData = filteredData.filter(contract => 
        contract.party_a_id === session.userId || 
        contract.party_b_id === session.userId ||
        contract.created_by === session.userId
      );
    }
    // 'all' 权限返回全部数据，'hidden' 返回空数组

    return NextResponse.json({ success: true, data: filteredData });
  } catch (err) {
    console.error('[agency-contracts GET] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/agency-contracts — 创建中介合同
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  
  try {
    const body = await request.json();
    const supabase = getSupabaseClient();

    const {
      title,
      order_id,
      party_b_id,
      party_b_name,
      party_b_phone,
      party_b_id_card,
      party_c_id,
      party_c_name,
      party_c_phone,
      amount,
      service_fee,
      start_date,
      end_date,
    } = body;

    // 验证必填字段
    if (!order_id || !party_b_id) {
      return NextResponse.json({ error: '订单和阿姨不能为空' }, { status: 400 });
    }

    // 获取订单信息
    const { data: order } = await supabase
      .from('orders')
      .select('id, title, agent_id')
      .eq('id', order_id)
      .single();

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 创建合同
    const { data, error } = await supabase
      .from('agency_contracts')
      .insert({
        title: title || `订单合同-${order.title}`,
        order_id,
        party_a_id: session.userId,
        party_a_name: session.name || '',
        party_b_id,
        party_b_name,
        party_b_phone,
        party_b_id_card,
        party_c_id,
        party_c_name,
        party_c_phone,
        amount: amount || 0,
        service_fee: service_fee || 0,
        start_date: start_date || null,
        end_date: end_date || null,
        status: 'draft',
        created_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[agency-contracts POST] Insert error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[agency-contracts POST] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT /api/agency-contracts — 更新中介合同
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  
  try {
    const body = await request.json();
    const supabase = getSupabaseClient();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: '缺少合同ID' }, { status: 400 });
    }

    // 获取当前合同信息
    const { data: current } = await supabase
      .from('agency_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (!current) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    // 只有创建人或admin可以修改草稿状态的合同
    if (current.status !== 'draft' && session.role !== 'admin') {
      return NextResponse.json({ error: '非草稿状态合同不可修改' }, { status: 403 });
    }

    // 更新
    const { data, error } = await supabase
      .from('agency_contracts')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[agency-contracts PUT] Update error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[agency-contracts PUT] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/agency-contracts — 删除中介合同
export async function DELETE(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少合同ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 获取合同信息
    const { data: contract } = await supabase
      .from('agency_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (!contract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    // 仅管理员可删除
    if (session.role !== 'admin') {
      return NextResponse.json({ error: '仅管理员可删除合同' }, { status: 403 });
    }

    const { error } = await supabase
      .from('agency_contracts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[agency-contracts DELETE] Error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[agency-contracts DELETE] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

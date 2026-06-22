import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/platform-fees — 获取平台费用列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'platform_fees:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    let query = supabase
      .from('platform_fees')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[platform-fees GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[platform-fees GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/platform-fees — 创建平台费用（签约时由系统自动调用，也支持手动创建）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'platform_fees:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { order_id, contract_id, contract_type, amount } = body as {
      order_id: string;
      contract_id?: string;
      contract_type?: string;
      amount?: number;
    };

    if (!order_id) {
      return NextResponse.json({ ok: false, error: '订单号为必填项' }, { status: 400 });
    }

    const feeId = `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const feeData = {
      id: feeId,
      order_id,
      contract_id: contract_id || null,
      contract_type: contract_type || 'agency',
      amount: Math.round((amount || 0) * 100) / 100,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('platform_fees')
      .insert(feeData)
      .select()
      .single();

    if (error) {
      console.error('[platform-fees POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log('[platform-fees] Created:', feeId, 'order=', order_id, 'amount=', feeData.amount);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[platform-fees POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

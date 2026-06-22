import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/deposits — 查询保证金记录列表
// admin可查询所有人的保证金；非admin角色只能查看自己的保证金记录
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'deposits:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    let query = supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500));

    // 非管理员角色：强制只查自己的保证金
    if (result.session.role !== 'admin') {
      query = query.eq('user_id', result.session.userId);
    } else if (userId) {
      // 管理员可按user_id筛选
      query = query.eq('user_id', userId);
    }
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;

    if (error) {
      console.error('[deposits GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[deposits GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/deposits — 创建保证金记录（手动充值/缴纳）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'deposits:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { user_id, amount, type, note } = body as {
      user_id: string;
      amount: number;
      type: string;
      note?: string;
    };

    if (!user_id || !amount || !type) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：user_id, amount, type' }, { status: 400 });
    }

    const recordId = `dp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: recordId,
      user_id,
      amount: Math.round(amount * 100) / 100,
      type,
      status: 'paid',
      note: note || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('deposits')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[deposits POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 同步更新用户保证金余额
    const { data: userData } = await supabase
      .from('users')
      .select('deposit')
      .eq('id', user_id)
      .maybeSingle();
    const currentDeposit = Number(userData?.deposit) || 0;
    const newDeposit = Math.max(0, currentDeposit + Math.round(amount * 100) / 100);

    await supabase
      .from('users')
      .update({ deposit: newDeposit, updated_at: new Date().toISOString() })
      .eq('id', user_id);
    // 同步 workers 表
    await supabase
      .from('workers')
      .update({ deposit: newDeposit, updated_at: new Date().toISOString() })
      .eq('user_id', user_id);

    console.log('[deposits] Created:', recordId, 'user=', user_id, 'amount=', amount);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[deposits POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/deposits — 更新保证金状态（退款/冻结）
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'deposits:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { id, status, note } = body as { id: string; status: string; note?: string };

    if (!id || !status) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：id, status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('deposits')
      .update({ status, note: note || null })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[deposits PUT] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 如果是退款，同步扣减用户余额
    if (status === 'refunded' && data) {
      const { data: userData } = await supabase
        .from('users')
        .select('deposit')
        .eq('id', data.user_id)
        .maybeSingle();
      const currentDeposit = Number(userData?.deposit) || 0;
      const refundAmount = Number(data.amount);
      const newDeposit = Math.max(0, currentDeposit - refundAmount);

      await supabase
        .from('users')
        .update({ deposit: newDeposit, updated_at: new Date().toISOString() })
        .eq('id', data.user_id);
      await supabase
        .from('workers')
        .update({ deposit: newDeposit, updated_at: new Date().toISOString() })
        .eq('user_id', data.user_id);
    }

    console.log('[deposits] Updated:', id, 'status=', status);
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[deposits PUT] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/platform-fees/[id] — 获取单条平台费详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'platform_fees:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('platform_fees')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[platform-fees GET id] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[platform-fees GET id] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/platform-fees/[id] — 编辑平台费（修改金额、状态等）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'platform_fees:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, status, contract_type, order_id, notes } = body as {
      amount?: number;
      status?: string;
      contract_type?: string;
      order_id?: string;
      notes?: string;
    };

    // 构建更新字段
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (amount !== undefined) {
      if (amount < 0) {
        return NextResponse.json({ ok: false, error: '金额不能为负数' }, { status: 400 });
      }
      updates.amount = Math.round(amount * 100) / 100;
    }
    if (status !== undefined) {
      const validStatuses = ['pending', 'confirmed', 'overdue', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ ok: false, error: `无效状态: ${status}, 合法值: ${validStatuses.join(', ')}` }, { status: 400 });
      }
      updates.status = status;
    }
    if (contract_type !== undefined) updates.contract_type = contract_type;
    if (order_id !== undefined) updates.order_id = order_id;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('platform_fees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[platform-fees PUT id] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '编辑失败';
    console.error('[platform-fees PUT id] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

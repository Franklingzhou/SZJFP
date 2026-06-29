import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/order-signings — 查询签约记录
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'order-signings:read');

  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const status = searchParams.get('status');

    const supabase = getSupabaseClient();

    let query = supabase.from('order_signings').select('*');

    if (orderId) query = query.eq('order_id', orderId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// DELETE /api/order-signings — 删除签约记录（仅admin）
export async function DELETE(request: NextRequest) {
  const session = await requirePermission(request, 'order-signings:write');

  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少id参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('order_signings')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '删除失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

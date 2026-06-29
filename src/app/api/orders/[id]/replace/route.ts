import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/replace — 更换阿姨
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'orders:write');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { new_worker_id, reason } = body as { new_worker_id: string; reason?: string };

    if (!new_worker_id) {
      return NextResponse.json({ ok: false, error: '缺少新阿姨ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查新阿姨存在
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, name')
      .eq('id', new_worker_id)
      .single();

    if (workerErr || !worker) {
      return NextResponse.json({ ok: false, error: '新阿姨不存在' }, { status: 404 });
    }

    // 获取当前订单信息（旧阿姨ID）
    const { data: orderData } = await supabase
      .from('orders')
      .select('signed_worker_id')
      .eq('id', id)
      .single();

    const oldWorkerId = orderData?.signed_worker_id;

    // A8: 旧阿姨状态 busy → available
    if (oldWorkerId) {
      await supabase
        .from('workers')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', oldWorkerId);
    }

    // A9: 旧签约记录标记为 replaced
    if (oldWorkerId) {
      await supabase
        .from('order_signings')
        .update({ 
          status: 'replaced', 
          replaced_at: new Date().toISOString(),
          replace_reason: reason || null 
        })
        .eq('order_id', id)
        .eq('worker_id', oldWorkerId)
        .eq('status', 'active');
    }

    // 更新订单的 signed_worker_id，订单状态回到 open
    const { data, error } = await supabase
      .from('orders')
      .update({
        signed_worker_id: new_worker_id,
        status: 'open',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '订单不存在' }, { status: 404 });
    }

    // A11: 新阿姨状态 available → busy（如果立即签约）
    // 这里暂时不自动签约，需要经纪人再次确认签约

    return NextResponse.json({ success: true, ok: true, data: { ...data, new_worker_name: worker.name } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更换阿姨失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

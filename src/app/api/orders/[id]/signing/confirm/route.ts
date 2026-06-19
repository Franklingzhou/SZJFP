import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/signing/confirm — 确认签约
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'order-signings:confirm');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { signing_id } = body as { signing_id: string };

    if (!signing_id) {
      return NextResponse.json({ ok: false, error: '签约ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 确认签约
    const { data, error } = await supabase
      .from('order_signings')
      .update({
        status: 'confirmed',
        confirmed_by: session.userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', signing_id)
      .eq('order_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '签约记录不存在' }, { status: 404 });
    }

    // 更新订单状态为已签约
    await supabase
      .from('orders')
      .update({ status: 'signed', signed_worker_id: data.worker_id })
      .eq('id', id);

    // A6: 签约后阿姨状态 idle → working
    await supabase
      .from('workers')
      .update({ work_status: 'working', updated_at: new Date().toISOString() })
      .eq('id', data.worker_id);

    // A7: 签约1个后，同订单其他推荐自动rejected
    await supabase
      .from('recommendations')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('order_id', id)
      .neq('id', signing_id)
      .neq('status', 'signed');

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认签约失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

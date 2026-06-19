import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/replace — 更换阿姨
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'orders:write');
  if (!session) return unauthorizedResponse();

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

    // 更新订单的 signed_worker_id
    const { data, error } = await supabase
      .from('orders')
      .update({
        signed_worker_id: new_worker_id,
        replace_reason: reason || null,
        replaced_at: new Date().toISOString(),
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

    return NextResponse.json({ ok: true, data: { ...data, new_worker_name: worker.name } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更换阿姨失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

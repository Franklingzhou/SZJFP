import { NextRequest, NextResponse } from 'next/server';
import { forbiddenResponse, requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/start — 上户确认（阿姨端确认已开始上户）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'orders:start');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 查询当前订单
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, signed_worker_id, start_date')
      .eq('id', id)
      .single();

    if (orderErr || !orderData) {
      return NextResponse.json({ ok: false, error: '订单不存在' }, { status: 404 });
    }

    // 状态校验：仅 signed 状态可确认上户
    if (orderData.status !== 'signed') {
      return NextResponse.json({
        ok: false,
        error: `当前订单状态为"${orderData.status}"，仅已签约订单可确认上户`,
      }, { status: 400 });
    }

    // 权限校验：管理员可代确认，阿姨仅能确认自己的订单
    if (session.role !== 'admin') {
      if (!orderData.signed_worker_id) {
        return NextResponse.json({ ok: false, error: '该订单未指定签约阿姨' }, { status: 400 });
      }

      // 通过 workers.user_id 校验阿姨身份
      const { data: workerData } = await supabase
        .from('workers')
        .select('user_id')
        .eq('id', orderData.signed_worker_id)
        .single();

      if (!workerData || workerData.user_id !== session.userId) {
        return forbiddenResponse('您不是该订单的签约阿姨，无权确认上户');
      }
    }

    // 防重复：start_date 已设置则拒绝
    if (orderData.start_date) {
      return NextResponse.json({
        ok: false,
        error: '已确认上户，无需重复操作',
        start_date: orderData.start_date,
      }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 更新订单：status → in_progress, start_date → 今天
    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'in_progress',
        start_date: todayStr,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('[orders/start] DB update error:', updateErr);
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    // 更新阿姨 work_status → working（确保同步）
    const { error: workerErr } = await supabase
      .from('workers')
      .update({
        work_status: 'working',
        updated_at: nowIso,
      })
      .eq('id', orderData.signed_worker_id);

    if (workerErr) {
      console.error('[orders/start] Worker update error:', workerErr);
      // 不阻塞主流程，订单状态已更新
    }

    return NextResponse.json({
      ok: true,
      data: updatedOrder,
      message: '上户确认成功',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '上户确认失败';
    console.error('[orders/start] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/agency-contracts/[id]/sign
// 中介合同签约确认
// 状态流转：draft -> signed(经纪人确认+阿姨确认) -> active(经纪人最终生效)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'agency-contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, confirm_note } = body; // action: agent_confirm | worker_confirm | activate
    const supabase = getSupabaseClient();

    // 获取合同信息
    const { data: contract, error: fetchError } = await supabase
      .from('agency_contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !contract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // 根据action执行不同操作
    switch (action) {
      case 'agent_confirm': {
        // 经纪人确认
        if (session.userId !== contract.party_a_id && session.role !== 'admin') {
          return NextResponse.json({ error: '只有甲方可以确认' }, { status: 403 });
        }

        const { error } = await supabase
          .from('agency_contracts')
          .update({
            agent_confirmed_at: now,
            agent_confirm_note: confirm_note || null,
            // 如果阿姨也已确认，则直接进入signed状态
            status: contract.worker_confirmed_at ? 'signed' : 'draft',
            updated_at: now,
          })
          .eq('id', id);

        if (error) {
          console.error('[agency-contracts sign] agent_confirm error:', error);
          return NextResponse.json({ error: '确认失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: '经纪人已确认' });
      }

      case 'worker_confirm': {
        // 阿姨确认
        if (session.userId !== contract.party_b_id && session.role !== 'admin') {
          return NextResponse.json({ error: '只有乙方可以确认' }, { status: 403 });
        }

        const { error } = await supabase
          .from('agency_contracts')
          .update({
            worker_confirmed_at: now,
            worker_confirm_note: confirm_note || null,
            // 如果经纪人已确认，则直接进入signed状态
            status: contract.agent_confirmed_at ? 'signed' : 'draft',
            updated_at: now,
          })
          .eq('id', id);

        if (error) {
          console.error('[agency-contracts sign] worker_confirm error:', error);
          return NextResponse.json({ error: '确认失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: '阿姨已确认' });
      }

      case 'activate': {
        // 经纪人最终确认生效
        // 要求：signed状态 + 双方都确认
        if (contract.status !== 'signed') {
          return NextResponse.json({ error: '合同尚未完成双方确认' }, { status: 400 });
        }

        if (session.userId !== contract.party_a_id && session.role !== 'admin') {
          return NextResponse.json({ error: '只有甲方可以最终生效' }, { status: 403 });
        }

        // 更新合同状态为active
        const { error } = await supabase
          .from('agency_contracts')
          .update({
            status: 'active',
            activated_at: now,
            updated_at: now,
          })
          .eq('id', id);

        if (error) {
          console.error('[agency-contracts sign] activate error:', error);
          return NextResponse.json({ error: '生效失败' }, { status: 500 });
        }

        // 更新阿姨工作状态为working
        if (contract.party_b_id) {
          await supabase
            .from('workers')
            .update({
              work_status: 'working',
              updated_at: now,
            })
            .eq('id', contract.party_b_id);
        }

        // 更新订单状态为matched
        if (contract.order_id) {
          await supabase
            .from('orders')
            .update({
              status: 'matched',
              signed_worker_id: contract.party_b_id,
              signed_at: now,
              updated_at: now,
            })
            .eq('id', contract.order_id);

          // 拒绝同订单其他推荐
          await supabase
            .from('recommendations')
            .update({
              status: 'rejected',
              updated_at: now,
            })
            .eq('order_id', contract.order_id)
            .neq('worker_id', contract.party_b_id)
            .eq('status', 'pending');
        }

        return NextResponse.json({ success: true, message: '合同已生效' });
      }

      default:
        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (err) {
    console.error('[agency-contracts sign] Error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

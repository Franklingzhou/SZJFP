import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/contracts/[id]/confirm — 主管确认签约
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'contracts:approve');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 获取合同信息
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, order_id, worker_id, course_id, party_b_id, party_b_name, party_b_phone')
      .eq('id', id)
      .maybeSingle();

    if (contractError) {
      console.error('[confirm] query error:', contractError);
      return NextResponse.json({ ok: false, error: '查询合同失败' }, { status: 500 });
    }

    if (!contract) {
      return NextResponse.json({ ok: false, error: '合同不存在' }, { status: 404 });
    }

    // 确认合同（state machine: signed→active）
    const { data, error } = await supabase
      .from('contracts')
      .update({
        status: 'active',
        approved_by: session.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // v34: contracts表无lead_id列，签约后自动创建阿姨的功能暂不在此处触发
    // 如需此功能，应通过单独的手动操作完成（创建worker → 关联到合同）

    return NextResponse.json({ success: true, ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

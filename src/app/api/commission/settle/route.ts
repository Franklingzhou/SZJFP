import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/commission/settle — 执行分账结算
export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'commission:settle');

  if (session instanceof NextResponse) return session;

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { settlement_id } = body as { settlement_id: string };

    if (!settlement_id) {
      return NextResponse.json({ ok: false, error: '缺少结算ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('settlements')
      .update({ status: 'settled', created_at: new Date().toISOString() })
      .eq('id', settlement_id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[commission settle] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '结算记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '结算失败';
    console.error('[commission settle] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

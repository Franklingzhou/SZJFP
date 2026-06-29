import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PUT /api/commission-settlements/[id] — 更新结算状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'commission-settlements:write');

  if (session instanceof NextResponse) return session;

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: string };

    if (!status) {
      return NextResponse.json({ ok: false, error: '缺少状态' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('settlements')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[commission-settlements PUT] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[commission-settlements PUT] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

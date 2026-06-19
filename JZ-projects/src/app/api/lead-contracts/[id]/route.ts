import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PUT /api/lead-contracts/[id] — 更新签约记录
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'order-signings:update');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body as { status?: string; notes?: string };

    const supabase = getSupabaseClient();
    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: '无更新内容' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('lead_contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '签约记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

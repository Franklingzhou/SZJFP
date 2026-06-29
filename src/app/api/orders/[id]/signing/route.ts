import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/orders/[id]/signing — 创建签约
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'order-signings:create');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { worker_id, notes } = body as { worker_id: string; notes?: string };

    if (!worker_id) {
      return NextResponse.json({ ok: false, error: '阿姨ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('order_signings')
      .insert({
        order_id: id,
        worker_id,
        notes: notes || null,
        status: 'pending',
        created_by: session.userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建签约失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/orders/[id]/signing — 更新签约状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'order-signings:update');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { signing_id, status, notes } = body as { signing_id: string; status: string; notes?: string };

    if (!signing_id || !status) {
      return NextResponse.json({ ok: false, error: '签约ID和状态为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const updates: Record<string, unknown> = { status };
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('order_signings')
      .update(updates)
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

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新签约失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

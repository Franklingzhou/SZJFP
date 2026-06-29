import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PUT /api/worker-applications/[id] — 更新阿姨申请状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'workers:write');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body as { status: string; notes?: string };

    if (!status) {
      return NextResponse.json({ ok: false, error: '状态为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const updates: Record<string, unknown> = { status };
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('worker_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '申请记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

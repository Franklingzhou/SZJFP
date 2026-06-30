import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/workers/[id]/blacklist — 拉黑阿姨
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'workers:blacklist');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    if (!reason) {
      return NextResponse.json({ ok: false, error: '拉黑原因为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('workers')
      .update({
        status: 'blacklisted',
        remark: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '阿姨不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '操作失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

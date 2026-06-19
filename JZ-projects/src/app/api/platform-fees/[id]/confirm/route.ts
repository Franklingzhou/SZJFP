import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/platform-fees/[id]/confirm — 确认平台费用到账
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'platform_fees:write');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('platform_fees')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: session.userId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[platform-fees confirm] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认失败';
    console.error('[platform-fees confirm] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

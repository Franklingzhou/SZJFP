import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/commission-settlements — 获取佣金结算列表
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'commission-settlements:read');

  if (session instanceof NextResponse) return session;

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    let query = supabase
      .from('settlements')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[commission-settlements GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[commission-settlements GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

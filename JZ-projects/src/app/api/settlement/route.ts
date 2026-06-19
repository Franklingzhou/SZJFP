import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/settlement — 获取分账列表
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'settlement:read');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    let query = supabase
      .from('commission_records')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[settlement GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[settlement GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

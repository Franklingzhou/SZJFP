import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/platform-fees — 获取平台费用列表
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'platform_fees:read');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');

    let query = supabase
      .from('platform_fees')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[platform-fees GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[platform-fees GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

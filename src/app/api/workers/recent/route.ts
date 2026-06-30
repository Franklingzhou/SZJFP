import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';

// GET /api/workers/recent — 最近修改的阿姨简历（按 updated_at 倒序）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'workers:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { getSupabaseServiceClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseServiceClient();

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

    const { data, error } = await supabase
      .from('workers')
      .select('id, name, phone, status, resume_review_status, updated_at, created_at')
      .not('updated_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(Math.min(limit, 100));

    if (error) {
      console.error('[recent] DB error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [], total: (data || []).length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[recent] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

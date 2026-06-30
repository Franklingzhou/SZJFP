import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';

// GET /api/workers/status-counts — 阿姨状态统计（按 status 分组计数）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'workers:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { getSupabaseServiceClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('workers')
      .select('status');

    if (error) {
      console.error('[status-counts] DB error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const w of data || []) {
      const s = w.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      data: {
        total: (data || []).length,
        by_status: counts,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[status-counts] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

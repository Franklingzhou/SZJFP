import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';

// GET /api/workers/audit-stats — 简历审核统计（按 resume_review_status 分组）
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
      .select('resume_review_status');

    if (error) {
      // 列不存在时返回空
      console.warn('[audit-stats] resume_review_status not found, using status:', error.message);
      const { data: data2, error: error2 } = await supabase
        .from('workers')
        .select('status');
      if (error2) {
        return NextResponse.json({ ok: false, error: error2.message }, { status: 500 });
      }
      const statusCounts: Record<string, number> = {};
      for (const w of data2 || []) {
        const s = w.status || 'unknown';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      }
      return NextResponse.json({ ok: true, data: { by_status: statusCounts, by_audit: {} } });
    }

    const byAudit: Record<string, number> = {};
    for (const w of data || []) {
      const s = w.resume_review_status || 'none';
      byAudit[s] = (byAudit[s] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      data: {
        total: (data || []).length,
        by_audit: byAudit,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[audit-stats] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

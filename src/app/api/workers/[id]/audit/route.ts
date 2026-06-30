import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';

// GET /api/workers/[id]/audit — 获取指定阿姨的审核历史
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'workers:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { id } = await params;
    const { getSupabaseServiceClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseServiceClient();

    // 查 worker 是否存在
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, name, resume_review_status')
      .eq('id', id)
      .single();

    if (workerErr || !worker) {
      return NextResponse.json({ error: '阿姨记录不存在' }, { status: 404 });
    }

    // 查 resume_reviews 审核记录
    const { data: reviews, error: reviewErr } = await supabase
      .from('resume_reviews')
      .select('*')
      .eq('worker_id', id)
      .order('created_at', { ascending: false });

    if (reviewErr) {
      console.warn('[workers/[id]/audit] resume_reviews query failed:', reviewErr.message);
      // 不返回 500，返回基本信息
      return NextResponse.json({
        ok: true,
        data: {
          worker: { id: worker.id, name: worker.name, resume_review_status: worker.resume_review_status },
          reviews: [],
          total: 0,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        worker: { id: worker.id, name: worker.name, resume_review_status: worker.resume_review_status },
        reviews: reviews || [],
        total: (reviews || []).length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[workers/[id]/audit] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

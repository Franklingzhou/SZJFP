import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/workers/[id]/pause — 阿姨暂停接单（提交审核）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'workers:status');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body as { reason?: string };
    const supabase = getSupabaseClient();

    // 检查阿姨是否存在且状态允许暂停
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (workerError || !worker) {
      return NextResponse.json({ ok: false, error: '阿姨不存在' }, { status: 404 });
    }

    const workerRecord = worker as Record<string, unknown>;
    if (workerRecord.status === 'paused') {
      return NextResponse.json({ ok: false, error: '该阿姨已是暂停状态' }, { status: 400 });
    }

    // 创建 resume_reviews 审核记录（而非直接修改 status）
    const reviewId = crypto.randomUUID();
    const { error: reviewError } = await supabase
      .from('resume_reviews')
      .insert({
        id: reviewId,
        worker_id: id,
        type: 'pause',
        review_type: 'pause',
        status: 'pending',
        reason: reason || '申请暂停接单',
        submitted_by: session.userId,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        proposed_data: { status: 'paused' },
        original_data: { status: workerRecord.status },
      });

    if (reviewError) {
      console.error('[workers pause] create review error:', reviewError);
      return NextResponse.json({ ok: false, error: reviewError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      data: { review_id: reviewId, worker_id: id, message: '暂停接单申请已提交，等待管理员审核' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '操作失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

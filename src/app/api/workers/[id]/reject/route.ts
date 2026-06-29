import { NextRequest, NextResponse } from 'next/server';
import { forbiddenResponse, requirePermission } from '@/lib/auth-middleware';

// POST /api/workers/[id]/reject — 管理员拒绝pending worker
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'workers:write');

  if (session instanceof NextResponse) return session;
  if (session.role !== 'admin') return forbiddenResponse('仅管理员可审核简历');

  try {
    const { id: workerId } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 检查worker是否存在
    const { data: worker, error: findErr } = await supabase
      .from('workers')
      .select('id, name, status')
      .eq('id', workerId)
      .maybeSingle();

    if (findErr || !worker) {
      return NextResponse.json({ error: '阿姨记录不存在' }, { status: 404 });
    }

    if (worker.status !== 'pending') {
      return NextResponse.json({ error: '该阿姨不在待审核状态' }, { status: 409 });
    }

    // 更新状态：pending → inactive（拒绝），标记简历审核为rejected
    const { error: updateErr } = await supabase
      .from('workers')
      .update({
        status: 'inactive',
        resume_review_status: 'rejected',
        remark: reason || '管理员拒绝',
        updated_at: new Date().toISOString(),
      })
      .eq('id', workerId);

    if (updateErr) {
      console.error('[reject worker] update error:', updateErr);
      return NextResponse.json({ error: '拒绝失败', detail: updateErr.message }, { status: 500 });
    }

    // 更新关联的resume_review记录
    await supabase
      .from('resume_reviews')
      .update({
        status: 'rejected',
        reviewer_id: session.userId,
        review_note: reason || '管理员拒绝',
        reviewed_at: new Date().toISOString(),
      })
      .eq('worker_id', workerId)
      .eq('status', 'pending');

    return NextResponse.json({ ok: true, message: '已拒绝该简历' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '拒绝失败';
    console.error('[reject worker] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

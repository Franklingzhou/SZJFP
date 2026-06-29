import { NextRequest, NextResponse } from 'next/server';
import { forbiddenResponse, requirePermission } from '@/lib/auth-middleware';

// POST /api/workers/[id]/approve — 管理员审核通过pending worker
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'workers:write');

  if (session instanceof NextResponse) return session;
  if (session.role !== 'admin') return forbiddenResponse('仅管理员可审核简历');

  try {
    const { id: workerId } = await params;
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 检查worker是否存在且状态为pending
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

    // 更新状态：pending → available，审核通过
    const { error: updateErr } = await supabase
      .from('workers')
      .update({
        status: 'available',
        resume_review_status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', workerId);

    if (updateErr) {
      console.error('[approve worker] update error:', updateErr);
      return NextResponse.json({ error: '审核失败', detail: updateErr.message }, { status: 500 });
    }

    // 更新关联的resume_review记录
    await supabase
      .from('resume_reviews')
      .update({
        status: 'approved',
        reviewer_id: session.userId,
        review_note: '管理员审核通过',
        reviewed_at: new Date().toISOString(),
      })
      .eq('worker_id', workerId)
      .eq('status', 'pending');

    return NextResponse.json({ ok: true, message: '审核通过，阿姨已可接单' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    console.error('[approve worker] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

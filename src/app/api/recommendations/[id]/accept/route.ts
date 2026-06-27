import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/recommendations/[id]/accept — 阿姨接受推荐
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'orders:accept');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 查推荐记录
    const { data: rec, error: fetchErr } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !rec) {
      return NextResponse.json({ ok: false, error: '推荐记录不存在' }, { status: 404 });
    }

    // 只能接受属于自己的pending推荐
    const recData = rec as Record<string, unknown>;
    if (recData.status !== 'pending') {
      return NextResponse.json({ ok: false, error: `推荐状态为 ${recData.status}，无法接受` }, { status: 400 });
    }

    // 验证worker身份：当前用户必须是推荐的阿姨
    // worker_id 存的是 workers.id，需要查 workers.user_id 匹配 session.userId
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('user_id')
      .eq('id', recData.worker_id as string)
      .maybeSingle();

    if (workerErr || !worker) {
      return NextResponse.json({ ok: false, error: '阿姨信息不存在' }, { status: 404 });
    }

    if ((worker as Record<string, unknown>).user_id !== session.userId && session.role !== 'admin') {
      return forbiddenResponse('只能接受推送给自己的推荐');
    }

    // 更新推荐状态为 accepted
    const { data, error } = await supabase
      .from('recommendations')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '接受推荐失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

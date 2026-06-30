import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sendNotification, getWorkerUserId } from '@/lib/notification-helper';

// POST /api/resume-reviews/[id]/reject — 简历审核拒绝
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'resume-reviews:write');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    if (!reason) {
      return NextResponse.json({ ok: false, error: '拒绝原因不能为空' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 先查数据库实际的列名（兼容 review_note / notes 两种 schema）
    let colName = 'review_note'; // 新 schema 默认
    try {
      const { data: cols } = await supabase.rpc('get_table_columns', { tbl: 'resume_reviews' });
      if (cols && Array.isArray(cols)) {
        const colNames = (cols as { column_name: string }[]).map(c => c.column_name);
        if (colNames.includes('notes') && !colNames.includes('review_note')) colName = 'notes';
      }
    } catch { /* fallback */ }

    const updatePayload: Record<string, unknown> = {
      status: 'rejected',
      reviewer_id: session.userId,
      reviewed_at: new Date().toISOString(),
    };
    if (reason) updatePayload[colName] = reason;
    // 同时尝试 review_comment（部分 schema 有此列）
    if (reason) updatePayload.review_comment = reason;

    let { data, error } = await supabase
      .from('resume_reviews')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    // 处理未知列错误：渐进式移除不存在的列后重试
    if (error) {
      const msg = error.message || '';
      if (msg.includes('review_comment')) {
        delete updatePayload.review_comment;
      }
      if (msg.includes('reviewer_id')) {
        delete updatePayload.reviewer_id;
        updatePayload.reviewed_by = session.userId;
      }
      if (msg.includes(colName) || msg.includes('column')) {
        // 回退：试另一个列名
        const altCol = colName === 'review_note' ? 'notes' : 'review_note';
        delete updatePayload[colName];
        updatePayload[altCol] = reason;
      }
      const retry = await supabase
        .from('resume_reviews')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '审核记录不存在' }, { status: 404 });
    }

    // 通知阿姨审核被拒
    const workerId = (data as Record<string, unknown>).worker_id as string;
    if (workerId) {
      const workerUserId = await getWorkerUserId(workerId);
      if (workerUserId) {
        sendNotification({
          user_id: workerUserId,
          title: '简历审核未通过',
          content: `你的简历审核未通过，原因：${reason}`,
          type: 'review_rejected',
        });
      }
    }

    return NextResponse.json({ success: true, ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

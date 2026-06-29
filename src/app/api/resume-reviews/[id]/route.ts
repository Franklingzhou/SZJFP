import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/resume-reviews/[id] — 获取单条简历审核记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'resume-reviews:read');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 先尝试新字段查询
    const selectNew = 'id, worker_id, type, review_type, old_data, new_data, proposed_data, original_data, changed_fields, changes, status, reviewer_id, review_note, reviewed_at, created_at';
    let { data, error } = await supabase
      .from('resume_reviews')
      .select(selectNew + ', workers(name, phone, job_types, origin, lead_id)')
      .eq('id', id)
      .single();

    // 回退到旧字段
    if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
      const r2 = await supabase
        .from('resume_reviews')
        .select('id, worker_id, status, notes, reviewer_id, reviewed_at, created_at, workers(name, phone, job_types, origin, lead_id)')
        .eq('id', id)
        .single();

      if (r2.error) {
        return NextResponse.json({ error: '审核记录不存在' }, { status: 404 });
      }

      data = {
        ...r2.data,
        review_type: 'update_resume',
        review_note: (r2.data as Record<string, unknown>).notes,
      } as unknown as typeof data;
      error = null;
    }

    if (error && !data) {
      return NextResponse.json({ error: '审核记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '查询失败';
    console.error('[resume-reviews GET /:id]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

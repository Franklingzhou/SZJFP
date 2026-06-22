import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/resume-reviews/[id]/reject — 简历审核拒绝
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'resume-reviews:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { reason } = body as { reason?: string };

    const supabase = getSupabaseClient();

    // v13: try with review_comment, fallback if column missing
    const updatePayload: Record<string, unknown> = {
      status: 'rejected',
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    };
    if (reason) updatePayload.review_comment = reason;

    let { data, error } = await supabase
      .from('resume_reviews')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message?.includes('review_comment')) {
      delete updatePayload.review_comment;
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

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

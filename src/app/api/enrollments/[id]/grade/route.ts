import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/enrollments/[id]/grade — 讲师考核打分
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'enrollments:grade');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { score, comment } = body as { score: number; comment?: string };

    if (score === undefined || score < 0 || score > 100) {
      return NextResponse.json({ ok: false, error: '分数需在0-100之间' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('enrollments')
      .update({
        score,
        status: score >= 60 ? 'passed' : 'failed',
        completed_at: new Date().toISOString(),
        graded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: '报名记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '打分失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

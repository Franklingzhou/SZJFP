import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/enrollments/[id]/transfer — 学员转班
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'enrollments:transfer');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { target_course_id } = body as { target_course_id: string };

    if (!target_course_id) {
      return NextResponse.json({ ok: false, error: '缺少目标课程ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查目标课程存在
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id')
      .eq('id', target_course_id)
      .single();

    if (courseErr || !course) {
      return NextResponse.json({ ok: false, error: '目标课程不存在' }, { status: 404 });
    }

    // 先检查报名记录是否存在
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ ok: false, error: '报名记录不存在' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update({ course_id: target_course_id })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '转班失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PATCH /api/students/[id] — 更新学员报名状态（结课考核等）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseClient();

    // 查询当前报名记录
    const { data: enrollment, error: findError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !enrollment) {
      return NextResponse.json({ error: '报名记录不存在' }, { status: 404 });
    }

    const allowedFields = ['status', 'score', 'passed', 'grade', 'certificate'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // 结课考核：填入打分信息
    if (body.score !== undefined || body.grade !== undefined) {
      updates.graded_at = new Date().toISOString();
      updates.completed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '更新失败', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误', detail: String(err) }, { status: 500 });
  }
}

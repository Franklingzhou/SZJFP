import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getWorkerUserId } from '@/lib/notification-helper';

// POST /api/enrollments/[id]/grade — 讲师考核打分
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'enrollments:grade');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { score } = body as { score: number; comment?: string };

    if (score === undefined || score < 0 || score > 100) {
      return NextResponse.json({ ok: false, error: '分数需在0-100之间' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // v13: try with completed_at/graded_at, fallback if columns missing
    const updatePayload: Record<string, unknown> = {
      score,
      status: score >= 80 ? 'excellent' : score >= 60 ? 'qualified' : 'failed',
    };
    let { data, error } = await supabase
      .from('enrollments')
      .update({ ...updatePayload, completed_at: new Date().toISOString(), graded_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error && (error.message?.includes('completed_at') || error.message?.includes('graded_at') || error.message?.includes('coerce'))) {
      const retry = await supabase
        .from('enrollments')
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
      return NextResponse.json({ ok: false, error: '报名记录不存在' }, { status: 404 });
    }

    // 考核通过后发送培训记录通知（不发证，证书归简历范畴）
    if (score >= 60 && data) {
      const enrollment = data as Record<string, unknown>;
      const workerId = enrollment.worker_id as string;
      const courseId = enrollment.course_id as string;
      const gradeStatus = score >= 80 ? '优秀' : '合格';
      
      if (workerId && courseId) {
        try {
          const { data: courseData } = await supabase
            .from('courses')
            .select('name')
            .eq('id', courseId)
            .maybeSingle();
          const courseName = (courseData as Record<string, unknown> | null)?.name || '培训课程';
          
          const realUserId = await getWorkerUserId(workerId);
          if (realUserId) {
            await supabase.from('notifications').insert({
              user_id: realUserId,
              type: 'training_result',
              title: `考核结果：${gradeStatus}`,
              content: `您在课程"${courseName}"中以${score}分获得${gradeStatus}评价。`,
              is_read: false,
              created_at: new Date().toISOString(),
            });
          }
        } catch { /* 通知非关键 */ }
      }
    }

    const resultData = data as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      ok: true,
      data: resultData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '打分失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

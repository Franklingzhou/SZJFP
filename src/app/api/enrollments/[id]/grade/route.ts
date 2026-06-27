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

    // v13: try with completed_at/graded_at, fallback if columns missing
    const updatePayload: Record<string, unknown> = {
      score,
      status: score >= 60 ? 'passed' : 'failed',
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

    // 读取证书颁发模式配置
    let certMode = 'auto'; // 默认自动
    try {
      const { data: certSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'certificate_issuance')
        .maybeSingle();
      if (certSetting && (certSetting as Record<string, unknown>).value) {
        const val = (certSetting as Record<string, unknown>).value as Record<string, unknown>;
        if (val.mode === 'manual') certMode = 'manual';
      }
    } catch { /* 默认 auto */ }

    // 课程考核通过(>=60分)后颁发证书
    if (score >= 60 && data) {
      const enrollment = data as Record<string, unknown>;
      const workerId = enrollment.worker_id as string;
      const courseId = enrollment.course_id as string;

      if (certMode === 'auto' && workerId && courseId) {
        // 查课程名和阿姨名
        const { data: courseData } = await supabase
          .from('courses')
          .select('name, certificate_options')
          .eq('id', courseId)
          .maybeSingle();

        const { data: workerData } = await supabase
          .from('workers')
          .select('name')
          .eq('id', workerId)
          .maybeSingle();

        const courseName = (courseData as Record<string, unknown> | null)?.name || '培训课程';
        const workerName = (workerData as Record<string, unknown> | null)?.name || '学员';
        const certTitle = `${courseName} - 结业证书`;

        // 防重复颁发
        const { data: existingCert } = await supabase
          .from('certificates')
          .select('id')
          .eq('user_id', workerId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (!existingCert) {
          const certId = crypto.randomUUID();
          await supabase.from('certificates').insert({
            id: certId,
            user_id: workerId,
            course_id: courseId,
            title: certTitle,
            certificate_url: null,
            issued_by: session.userId,
            status: 'issued',
            issue_date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
          });

          // 发送证书通知
          await supabase.from('notifications').insert({
            user_id: workerId,
            type: 'certificate',
            title: '恭喜获得结业证书',
            content: `您在课程"${courseName}"中以${score}分通过考核，已自动颁发《${certTitle}》证书。`,
            related_id: certId,
            related_type: 'certificate',
            is_read: false,
            created_at: new Date().toISOString(),
          });

          console.log('[enrollments grade] Auto certificate issued:', certId, 'for worker:', workerId, 'course:', courseId);
        }
      } else if (certMode === 'manual' && workerId && courseId) {
        // 手动模式：仅记录，不自动发证
        console.log('[enrollments grade] Manual mode - certificate issuance skipped for worker:', workerId, 'course:', courseId, '(score:', score, ')');
      }
    }

    const resultData = data as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      ok: true,
      data: {
        ...resultData,
        certificate_mode: certMode,
        cert_auto_issued: certMode === 'auto' && score >= 60,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '打分失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

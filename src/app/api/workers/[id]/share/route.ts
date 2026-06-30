import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';

// GET /api/workers/[id]/share — 经纪人分享阿姨简历
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'workers:read');
  if (session instanceof NextResponse) return session;

  const { id: workerId } = await params;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询阿姨信息
    const { data: worker, error: wError } = await supabase
      .from('workers')
      .select('id, name, age, origin, job_types, experience_years, specialties, certifications, status, phone, user_id')
      .eq('id', workerId)
      .maybeSingle();

    if (wError || !worker) {
      return NextResponse.json({ error: '未找到该阿姨' }, { status: 404 });
    }

    // 检查是否已有关联推荐记录
    const { data: existingRec } = await supabase
      .from('recommendations')
      .select('id')
      .eq('worker_id', workerId)
      .eq('recommender_id', session.userId)
      .limit(1)
      .maybeSingle();

    // 生成分享文本
    const skillsText = worker.specialties || '无';
    const certText = worker.certifications || '无';

    const shareText = [
      `【${worker.name || '阿姨'}】`,
      worker.age ? `年龄：${worker.age}岁` : '',
      worker.origin ? `籍贯：${worker.origin}` : '',
      worker.experience_years ? `经验：${worker.experience_years}年` : '',
      `技能：${skillsText}`,
      certText !== '无' ? `证书：${certText}` : '',
      worker.job_types ? `工种：${worker.job_types}` : '',
    ].filter(Boolean).join('\n');

    return NextResponse.json({
      success: true,
      data: {
        worker_id: workerId,
        worker_name: worker.name,
        share_text: shareText,
        already_recommended: !!existingRec,
        shared_by: session.userId,
        shared_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '分享失败';
    console.error('[workers share] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

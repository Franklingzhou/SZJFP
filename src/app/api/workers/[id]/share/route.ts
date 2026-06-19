import { NextRequest, NextResponse } from 'next/server';
import { checkPermission } from '@/lib/auth-middleware';

// GET /api/workers/[id]/share — 经纪人分享阿姨简历
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'workers:read');
  if (!session) return NextResponse.json({ error: '无权限' }, { status: 403 });

  const { id: workerId } = await params;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询阿姨信息 + 关联用户信息
    const { data: worker, error: wError } = await supabase
      .from('workers')
      .select('id, name, age, origin, education, experience, skills, certifications, specialty, status, phone, user_id')
      .eq('id', workerId)
      .single();

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
    const skillsText = Array.isArray(worker.skills)
      ? worker.skills.join('、')
      : (worker.skills || '无');
    const certText = Array.isArray(worker.certifications)
      ? worker.certifications.join('、')
      : (worker.certifications || '无');

    const shareText = [
      `【${worker.name || '阿姨'}】`,
      worker.age ? `年龄：${worker.age}岁` : '',
      worker.origin ? `籍贯：${worker.origin}` : '',
      worker.education ? `学历：${worker.education}` : '',
      worker.experience ? `经验：${worker.experience}年` : '',
      `技能：${skillsText}`,
      certText !== '无' ? `证书：${certText}` : '',
      worker.specialty ? `特长：${worker.specialty}` : '',
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

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/students/[id]/convert-to-worker — 学员转简历（2.0: enrollment已关联worker_id，直接激活）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'students:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 查询报名记录
    const { data: enrollment, error: findError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !enrollment) {
      return NextResponse.json({ error: '报名记录不存在' }, { status: 404 });
    }

    // 2.0: 使用 worker_id 关联
    const workerId = (enrollment as Record<string, unknown>).worker_id as string;

    if (!workerId) {
      return NextResponse.json({ error: '报名记录未关联阿姨，无法转换' }, { status: 400 });
    }

    // 检查worker是否存在
    const { data: existingWorker, error: workerFindErr } = await supabase
      .from('workers')
      .select('id, name, status')
      .eq('id', workerId)
      .maybeSingle();

    if (workerFindErr || !existingWorker) {
      return NextResponse.json({ error: '关联的阿姨记录不存在' }, { status: 404 });
    }

    // 如果worker已经是available，说明已激活
    if ((existingWorker as Record<string, unknown>).status === 'available') {
      return NextResponse.json({ success: true, data: existingWorker, message: '该阿姨简历已激活' });
    }

    // 查询关联课程获取工种信息
    const { data: course } = await supabase
      .from('courses')
      .select('title, course_type')
      .eq('id', (enrollment as Record<string, unknown>).course_id as string)
      .maybeSingle();

    // 激活worker：状态改为available，补充工种信息
    const updates: Record<string, unknown> = {
      status: 'available',
      resume_review_status: 'approved',
      updated_at: new Date().toISOString(),
    };

    // 如果有课程信息，补充工种
    if (course?.title) {
      const { data: currentWorker } = await supabase
        .from('workers')
        .select('job_types')
        .eq('id', workerId)
        .single();
      const existingJobs: string[] = currentWorker?.job_types
        ? (typeof currentWorker.job_types === 'string' ? currentWorker.job_types.split(',').filter(Boolean) : currentWorker.job_types as string[])
        : [];
      if (!existingJobs.includes(course.title)) {
        existingJobs.push(course.title);
      }
      updates.job_types = existingJobs.join(',');
    }

    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', workerId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '转换失败', detail: error.message }, { status: 500 });
    }

    // 更新enrollment状态
    await supabase
      .from('enrollments')
      .update({ status: 'qualified', updated_at: new Date().toISOString() })
      .eq('id', id);

    // 2.0: 线索签约时已自动创建worker，此处仅激活worker状态
    // 不再需要更新leads状态（签约时已是signed）

    return NextResponse.json({ success: true, data, message: '学员已转为简历' }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误', detail: String(err) }, { status: 500 });
  }
}

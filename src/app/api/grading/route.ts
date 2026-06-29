import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';

// GET /api/grading — 获取待考核学员列表
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'grading:read');

  if (session instanceof NextResponse) return session;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const courseId = request.nextUrl.searchParams.get('course_id');
    const status = request.nextUrl.searchParams.get('status');

    let query = supabase
      .from('enrollments')
      .select('id, course_id, worker_id, student_name, status, grade, passed, graded_at, created_at, courses(name, type)')
      .order('created_at', { ascending: false });

    if (courseId) query = query.eq('course_id', courseId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;

    if (error) {
      console.error('[grading GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/grading — 提交考核打分
export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'enrollments:write');
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { enrollment_id, grade, passed, notes } = body as {
      enrollment_id: string;
      grade: number;
      passed: boolean;
      notes?: string;
    };

    if (!enrollment_id || grade === undefined || passed === undefined) {
      return NextResponse.json({ error: '缺少必要参数(enrollment_id, grade, passed)' }, { status: 400 });
    }

    // 分数范围校验
    if (grade < 0 || grade > 100) {
      return NextResponse.json({ error: '分数必须在0-100之间' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 更新学员考核结果（不包含updated_at，数据库可能没有该列）
    const { data, error } = await supabase
      .from('enrollments')
      .update({
        grade,
        passed,
        graded_at: new Date().toISOString(),
        status: passed ? 'qualified' : 'failed',
      })
      .eq('id', enrollment_id)
      .select()
      .single();

    if (error) {
      console.error('[grading POST] DB error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: '打分失败', details: error.message }, { status: 500 });
    }

    // 考核通过 → 关联线索自动变为 converted（培训线终点）
    if (passed && data) {
      const workerId = (data as Record<string, unknown>).worker_id as string;
      if (workerId) {
        const { data: worker } = await supabase
          .from('workers')
          .select('phone')
          .eq('id', workerId)
          .maybeSingle();
        if (worker?.phone) {
          const { data: lead } = await supabase
            .from('leads')
            .select('id, status')
            .eq('phone', worker.phone)
            .maybeSingle();
          if (lead && lead.status === 'signed') {
            await supabase
              .from('leads')
              .update({ status: 'converted' })
              .eq('id', lead.id);
            console.log(`[grading] lead ${lead.id} → converted (worker ${workerId})`);
          }
        }
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '打分失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
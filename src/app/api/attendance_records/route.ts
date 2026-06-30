import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseServiceClient } from '@/storage/database/supabase-client';

// GET /api/attendance_records — 聚合查询所有报名记录的考勤数据
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'enrollments:read');

  if (session instanceof NextResponse) return session;

  try {
    const supabase = getSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollment_id');
    const scheduleId = searchParams.get('schedule_id');

    // enrollment 表实际列：worker_id / course_schedule_id / student_name（可选）/ attendance_records（JSONB，可选）
    let query = supabase
      .from('enrollments')
      .select('*');

    if (enrollmentId) {
      query = query.eq('id', enrollmentId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[attendance_records GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 收集需要 JOIN 的 worker_id
    const workerIds = [...new Set((data || []).map(e => (e as Record<string,unknown>).worker_id as string).filter(Boolean))];
    const workerMap: Record<string, { name: string; phone: string }> = {};
    if (workerIds.length > 0) {
      const { data: workers } = await supabase
        .from('workers')
        .select('id, name, phone')
        .in('id', workerIds);
      for (const w of (workers || [])) {
        workerMap[w.id] = { name: w.name, phone: w.phone || '' };
      }
    }

    // 将 attendance_records JSONB 展开为记录列表
    const records: Array<Record<string, unknown>> = [];
    for (const enrollment of (data || []) as Record<string,unknown>[]) {
      const ar = enrollment.attendance_records as Record<string, unknown> | null;
      const wid = enrollment.worker_id as string;
      const wn = workerMap[wid]?.name || (enrollment.student_name as string) || '';

      if (ar && typeof ar === 'object') {
        for (const [schedId, detail] of Object.entries(ar)) {
          if (scheduleId && schedId !== scheduleId) continue;
          records.push({
            enrollment_id: enrollment.id,
            student_name: wn,
            course_id: (enrollment.course_id || enrollment.course_schedule_id),
            worker_id: wid,
            schedule_id: schedId,
            ...(detail as Record<string, unknown>),
          });
        }
      } else {
        // 无 attendance_records 字段时：返回空记录（兼容 init_all_tables.sql schema）
        if (!scheduleId) {
          records.push({
            enrollment_id: enrollment.id,
            student_name: wn,
            course_id: (enrollment.course_id || enrollment.course_schedule_id),
            worker_id: wid,
            attendance_records: null,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, data: records, total: records.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[attendance_records GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/attendance_records — 记录考勤（讲师/培训主管记录学员出勤）
export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'enrollments:write');

  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json().catch(() => ({}));
    const { enrollment_id, schedule_id, status, notes } = body as {
      enrollment_id?: string;
      schedule_id?: string;
      status?: string;
      notes?: string;
    };

    if (!enrollment_id || !schedule_id) {
      return NextResponse.json({ error: 'enrollment_id和schedule_id为必填' }, { status: 400 });
    }

    const validStatuses = ['present', 'absent', 'late', 'leave'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `状态必须为: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    // 查 enrollment 是否存在
    const { data: enrollment, error: fetchErr } = await supabase
      .from('enrollments')
      .select('id, attendance_records')
      .eq('id', enrollment_id)
      .single();

    if (fetchErr || !enrollment) {
      return NextResponse.json({ error: '报名记录不存在' }, { status: 404 });
    }

    // 读取已有考勤记录，追加新记录
    const existing = (enrollment.attendance_records as Record<string, unknown>) || {};
    existing[schedule_id] = {
      status: status || 'present',
      notes: notes || '',
      recorded_by: session.userId,
      recorded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('enrollments')
      .update({ attendance_records: existing, updated_at: new Date().toISOString() })
      .eq('id', enrollment_id)
      .select()
      .single();

    if (error) {
      console.error('[attendance_records POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '记录考勤失败';
    console.error('[attendance_records POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

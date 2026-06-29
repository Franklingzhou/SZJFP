import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/enrollments/[id]/attendance — 考勤打卡
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'enrollments:write');

  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { schedule_id, status } = body as { schedule_id: string; status: string };

    if (!schedule_id || !status) {
      return NextResponse.json({ ok: false, error: '排课ID和考勤状态为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert({
        enrollment_id: id,
        schedule_id,
        status,
        recorded_by: session.userId,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '考勤失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

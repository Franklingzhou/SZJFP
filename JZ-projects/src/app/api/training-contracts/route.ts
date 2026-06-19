import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/training-contracts — 查询培训合同
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'training-contracts:read');
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const studentId = searchParams.get('student_id');

    const supabase = getSupabaseClient();

    let query = supabase.from('training_contracts').select('*');

    if (status) query = query.eq('status', status);
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/training-contracts — 创建培训合同
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'training-contracts:write');
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { student_id, course_id, start_date, end_date, fee, notes } = body as {
      student_id: string;
      course_id: string;
      start_date?: string;
      end_date?: string;
      fee?: number;
      notes?: string;
    };

    if (!student_id || !course_id) {
      return NextResponse.json({ ok: false, error: '学员ID和课程ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('training_contracts')
      .insert({
        student_id,
        course_id,
        start_date: start_date || null,
        end_date: end_date || null,
        fee: fee || null,
        notes: notes || null,
        status: 'pending',
        created_by: session.userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

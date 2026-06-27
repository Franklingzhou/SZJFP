import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/training-contracts — 查询培训合同
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'training-contracts:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const studentId = searchParams.get('student_id');
    const workerId = searchParams.get('worker_id');  // 2.0: 优先使用worker_id

    const supabase = getSupabaseClient();

    let query = supabase.from('training_contracts').select('*');

    if (status) query = query.eq('status', status);
    // 2.0: worker_id优先，兼容student_id
    if (studentId || workerId) query = query.eq('student_id', workerId || studentId);

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
  const result = await checkPermissionDetailed(request, 'training-contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { student_id, worker_id, course_id, start_date, end_date, fee } = body as {
      student_id?: string;  // 兼容旧参数
      worker_id?: string;   // 2.0新参数
      course_id: string;
      start_date?: string;
      end_date?: string;
      fee?: number;
    };

    // 2.0: worker_id优先，兼容student_id
    const finalStudentId = worker_id || student_id;
    if (!finalStudentId || !course_id) {
      return NextResponse.json({ ok: false, error: '学员ID和课程ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('training_contracts')
      .insert({
        student_id: finalStudentId,
        course_id,
        party_a_id: session.userId,
        party_b_name: finalStudentId,
        start_date: start_date || null,
        end_date: end_date || null,
        amount: fee || null,
        status: 'draft',
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

// PUT /api/training-contracts — 更新培训合同
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'training-contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { id, status, amount, fee, student_id } = body as {
      id: string;
      status?: string;
      amount?: number;
      fee?: number;
      student_id?: string;
    };

    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少合同ID' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 检查合同是否存在
    const { data: existing, error: fetchErr } = await supabase
      .from('training_contracts')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ ok: false, error: '未找到该培训合同' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (status !== undefined) updates.status = status;
    if (amount !== undefined) updates.amount = amount;  // DB列名是 amount
    if (fee !== undefined) updates.amount = fee;        // 兼容 API参数 fee -> DB amount
    if (student_id !== undefined) updates.student_id = student_id;

    const { data, error } = await supabase
      .from('training_contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

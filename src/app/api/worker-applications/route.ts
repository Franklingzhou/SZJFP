import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/worker-applications — 查询阿姨申请记录
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'workers:read');
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const workerId = searchParams.get('worker_id');

    const supabase = getSupabaseClient();

    let query = supabase.from('worker_applications').select('*');

    if (status) query = query.eq('status', status);
    if (workerId) query = query.eq('worker_id', workerId);

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

// POST /api/worker-applications — 创建阿姨申请
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'workers:write');
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { worker_id, order_id, notes } = body as {
      worker_id: string;
      order_id?: string;
      notes?: string;
    };

    if (!worker_id) {
      return NextResponse.json({ ok: false, error: '阿姨ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('worker_applications')
      .insert({
        worker_id,
        order_id: order_id || null,
        notes: notes || null,
        status: 'pending',
        applicant_id: session.userId,
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

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/lead-contracts — 查询签约记录
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'order-signings:read');

  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const status = searchParams.get('status');

    const supabase = getSupabaseClient();

    let query = supabase.from('lead_contracts').select('*');

    if (leadId) query = query.eq('lead_id', leadId);
    if (status) query = query.eq('status', status);

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

// POST /api/lead-contracts — 创建签约记录
export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'order-signings:create');

  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { lead_id, worker_id, order_id, notes } = body as {
      lead_id: string;
      worker_id?: string;
      order_id?: string;
      notes?: string;
    };

    if (!lead_id) {
      return NextResponse.json({ ok: false, error: '线索ID为必填项' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('lead_contracts')
      .insert({
        lead_id,
        worker_id: worker_id || null,
        order_id: order_id || null,
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

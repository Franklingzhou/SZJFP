import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/worker-tiers — 获取所有等级
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'settings:read');

  if (session instanceof NextResponse) return session;

  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('worker_tiers')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: '查询失败' }, { status: 500 });
  }
}

// PUT /api/worker-tiers — 更新等级
export async function PUT(request: NextRequest) {
  const session = await requirePermission(request, 'settings:write');

  if (session instanceof NextResponse) return session;

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color } = body;

    if (!id) return NextResponse.json({ ok: false, error: '缺少ID' }, { status: 400 });

    const { data, error } = await supabase
      .from('worker_tiers')
      .update({
        name, level, min_orders, min_rating, min_reorder_rate,
        hourly_premium, priority, deposit_reduction, badge_color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, success: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: '更新失败' }, { status: 500 });
  }
}

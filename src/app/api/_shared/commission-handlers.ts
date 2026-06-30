import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 佣金 GET/PUT 的共享 handler，供 /api/commission 和 /api/commissions 复用
export async function handleGetCommission(request: NextRequest) {
  const session = await requirePermission(request, 'commission:read');
  if (session instanceof NextResponse) return session;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('commission_rules')
      .select('id, name, type, description, role, rate, is_active, created_at')
      .order('type')
      .order('role');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function handlePutCommission(request: NextRequest) {
  const session = await requirePermission(request, 'commission:write');
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { id, rate } = body as { id: string; rate: number };

    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少规则ID' }, { status: 400 });
    }
    if (rate === undefined || rate < 0 || rate > 100) {
      return NextResponse.json({ ok: false, error: '比例需在0-100之间' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('commission_rules')
      .update({ rate })
      .eq('id', id)
      .select('id, name, type, role, rate')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: '规则不存在' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

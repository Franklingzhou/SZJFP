import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/orders/recommendations — 查询所有推荐记录
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'recommendations:read');
  if (!session) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const workerId = searchParams.get('worker_id');
    const status = searchParams.get('status');

    const supabase = getSupabaseClient();

    let query = supabase.from('recommendations').select('*');

    if (orderId) query = query.eq('order_id', orderId);
    if (workerId) query = query.eq('worker_id', workerId);
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

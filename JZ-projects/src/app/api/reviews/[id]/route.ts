import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// PATCH /api/reviews/[id] — 管理员隐藏/恢复评价
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'reviews:write');
  if (!session) return unauthorizedResponse();

  // 仅admin可操作
  if (session.role !== 'admin') {
    return NextResponse.json({ error: '无权限，仅管理员可操作' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { hidden } = body as { hidden?: boolean };

    if (typeof hidden !== 'boolean') {
      return NextResponse.json({ error: '缺少hidden参数（布尔值）' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('reviews')
      .update({ hidden, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[reviews PATCH] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '未找到该评价' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[reviews PATCH] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/auth/profile — 获取当前用户信息
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active, created_at')
      .eq('id', session.userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (err) {
    console.error('[profile GET] error:', err);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}

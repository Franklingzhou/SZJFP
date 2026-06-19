import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/auth/update-profile — 更新当前用户信息
export async function POST(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { name } = body as { name?: string };

    const updates: Record<string, string> = {};
    if (name) updates.name = name;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.userId)
      .select('id, name, phone, role')
      .single();

    if (error) {
      console.error('[update-profile] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    // 同步更新 localStorage 中的用户名
    return NextResponse.json({ success: true, user: data });
  } catch (err) {
    console.error('[update-profile] error:', err);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

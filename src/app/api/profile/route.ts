import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/profile — 获取当前登录用户完整资料
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const supabase = getSupabaseClient();

    // 查用户基础信息
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active, created_at, wechat_openid')
      .eq('id', session.userId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: '用户信息查询失败' }, { status: 500 });
    }

    // 根据角色查询关联档案
    let profile: Record<string, unknown> | null = null;

    if (session.role === 'worker') {
      const { data } = await supabase
        .from('workers')
        .select('*')
        .eq('user_id', session.userId)
        .maybeSingle();
      profile = data;
    } else if (session.role === 'agent' || session.role === 'recruiter') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.userId)
        .maybeSingle();
      profile = data;
    } else if (session.role === 'customer') {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', session.userId)
        .maybeSingle();
      profile = data;
    }

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          review_status: user.review_status,
          is_active: user.is_active,
          created_at: user.created_at,
        },
        role_profile: profile,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

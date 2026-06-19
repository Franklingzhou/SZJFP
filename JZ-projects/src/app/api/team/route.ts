import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/team — 获取团队成员列表
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const supabase = getSupabaseClient();
    const url = request.nextUrl;
    const role = url.searchParams.get('role');
    const keyword = url.searchParams.get('keyword');

    let query = supabase
      .from('users')
      .select('id, name, phone, role, is_active, review_status, created_at')
      .order('created_at', { ascending: false });

    // 非admin只看自己角色的成员
    if (session.role !== 'admin') {
      query = query.eq('role', session.role);
    }

    if (role) query = query.eq('role', role);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: '查询失败', detail: error.message }, { status: 500 });
    }

    let result = data || [];

    // 关键词搜索
    if (keyword) {
      const kw = keyword.toLowerCase();
      result = result.filter((u: Record<string, unknown>) => {
        const name = ((u.name || '') as string).toLowerCase();
        const phone = ((u.phone || '') as string).toLowerCase();
        return name.includes(kw) || phone.includes(kw);
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ error: '服务器错误', detail: String(err) }, { status: 500 });
  }
}

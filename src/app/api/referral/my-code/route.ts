import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse } from '@/lib/auth-middleware';

// 生成随机推荐码 (6位字母数字)
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符 0O1I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET /api/referral/my-code — 获取我的推荐码
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse();

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 解析 JWT token
    const { parseAndVerifyToken } = await import('@/lib/auth-token');
    const userId = parseAndVerifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: '无效 token' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, name, role, referral_code')
      .eq('id', userId)
      .maybeSingle();
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    if (!user.referral_code) {
      const code = generateReferralCode();
      await supabase.from('users').update({ referral_code: code }).eq('id', user.id);
      user.referral_code = code;
    }

    return NextResponse.json({
      referral_code: user.referral_code,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error('[referral my-code] Error:', error);
    return NextResponse.json({ error: '获取推荐码失败' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth-password';

// PC端手机号+密码登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = body as { phone: string; password: string };

    if (!phone || !password) {
      return NextResponse.json({ error: '请输入手机号和密码' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查找用户（可能有重复手机号，优先选有密码的）
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active, password_hash')
      .eq('phone', phone);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ error: '手机号或密码错误' }, { status: 401 });
    }

    // 在所有候选账号中直接匹配密码（兼容明文/哈希，支持重复手机号）
    const activeApprovedUsers = users.filter((u: Record<string, unknown>) => 
      u.password_hash && u.is_active === true && u.review_status === 'approved'
    );
    const usersWithPassword = users.filter((u: Record<string, unknown>) => u.password_hash);
    const candidates = activeApprovedUsers.length > 0 ? activeApprovedUsers : (usersWithPassword.length > 0 ? usersWithPassword : users);

    const user = candidates.find((u: Record<string, unknown>) => 
      typeof u.password_hash === 'string' && verifyPassword(password, u.password_hash as string)
    );

    // 校验密码
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: '手机号或密码错误' }, { status: 401 });
    }

    // 检查账号状态
    if (user.review_status === 'pending') {
      return NextResponse.json(
        { error: '账号审核中，请等待管理员审核', code: 'ACCOUNT_PENDING' },
        { status: 403 }
      );
    }
    if (user.review_status === 'rejected') {
      return NextResponse.json(
        { error: '账号审核未通过，请联系管理员', code: 'ACCOUNT_REJECTED' },
        { status: 403 }
      );
    }
    if (user.review_status === 'resigned') {
      return NextResponse.json(
        { error: '该账号已离职，无法登录。如需重新入职，请联系管理员。', code: 'ACCOUNT_RESIGNED' },
        { status: 403 }
      );
    }
    if (!user.is_active) {
      return NextResponse.json(
        { error: '账号已被停用', code: 'ACCOUNT_DISABLED' },
        { status: 403 }
      );
    }

    // 生成标准 JWT token（7天过期，环境变量 JWT_SECRET 签名）
    const { signToken } = await import('@/lib/auth-token');
    const token = signToken(user.id as string);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        reviewStatus: user.review_status,
        is_active: user.is_active,
      },
      token,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '登录失败';
    console.error('[password-login] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

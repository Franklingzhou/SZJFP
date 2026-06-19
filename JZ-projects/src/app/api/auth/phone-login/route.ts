import { NextRequest, NextResponse } from 'next/server';

// 手机号+验证码登录API
// 开发模式：任意手机号+验证码888888即可登录
// 生产模式：需对接短信服务商
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, role } = body as { phone: string; code: string; role?: string };

    if (!phone || !code) {
      return NextResponse.json({ error: '请输入手机号和验证码' }, { status: 400 });
    }

    // 验证码校验
    const isValidCode = await verifyCode(phone, code);
    if (!isValidCode) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 401 });
    }

    // 查找用户
    const user = await findUserByPhone(phone, role);

    if (user) {
      // 检查账号状态
      if (user.review_status === 'pending') {
        return NextResponse.json(
          { error: '您的注册申请正在审核中，请耐心等待。', code: 'ACCOUNT_PENDING' },
          { status: 403 }
        );
      }

      if (user.review_status === 'resigned') {
        return NextResponse.json(
          { error: '该账号已离职，无法登录。如需重新入职，请联系管理员。', code: 'ACCOUNT_RESIGNED' },
          { status: 403 }
        );
      }

      if (user.review_status === 'rejected') {
        return NextResponse.json(
          { error: '账号审核未通过，请联系管理员', code: 'ACCOUNT_REJECTED' },
          { status: 403 }
        );
      }

      if (!user.is_active) {
        return NextResponse.json(
          { error: '该账号已被禁用，请联系管理员。', code: 'ACCOUNT_DISABLED' },
          { status: 403 }
        );
      }

      // 生成token
      const token = generateToken(user.id);

      return NextResponse.json({
        success: true,
        isNewUser: false,
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
    }

    // 新用户，需要选择角色注册
    return NextResponse.json({
      success: false,
      isNewUser: true,
      phone,
      message: '该手机号尚未注册，请选择角色并完善信息',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '登录失败';
    console.error('[phone-login] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 验证码校验
async function verifyCode(phone: string, code: string): Promise<boolean> {
  // 开发模式：任意手机号+888888即可登录
  const isDev = !process.env.SMS_PROVIDER;
  if (isDev) {
    return code === '888888';
  }

  // 生产模式：查询验证码记录
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('sms_codes')
      .select('code, expires_at')
      .eq('phone', phone)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;

    // 检查是否过期
    if (new Date(data.expires_at) < new Date()) return false;

    // 检查验证码是否匹配
    if (data.code !== code) return false;

    // 标记为已使用
    await supabase.from('sms_codes').update({ used: true }).eq('phone', phone).eq('code', code);

    return true;
  } catch {
    // 数据库不可用时回退到开发模式
    return code === '888888';
  }
}

// 根据手机号查找用户
async function findUserByPhone(phone: string, role?: string): Promise<{
  id: string;
  name: string;
  phone: string;
  role: string;
  review_status: string;
  is_active: boolean;
} | null> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    let query = supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active')
      .eq('phone', phone);

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// 生成简单token（生产环境应使用JWT）
function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  const timestamp = Date.now();
  const hash = Buffer.from(`${userId}:${timestamp}:${secret}`).toString('base64url');
  return Buffer.from(`${userId}:${timestamp}`).toString('base64url') + '.' + hash.substring(0, 16);
}

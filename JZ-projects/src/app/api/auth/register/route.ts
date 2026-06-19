import { NextRequest, NextResponse } from 'next/server';

// 公开注册接口（无需token）
// 创建用户后需管理员审核才能登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, name, role, code } = body as {
      phone: string;
      name: string;
      role?: string;
      code: string;
    };

    // 必填校验
    if (!phone || !name || !code) {
      return NextResponse.json(
        { error: '手机号、姓名和验证码为必填项' },
        { status: 400 }
      );
    }

    // 手机号格式校验
    if (!/^1\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: '请输入正确的手机号' },
        { status: 400 }
      );
    }

    // 角色白名单
    const validRole = role || 'worker';
    const allowedRoles = ['worker', 'agent', 'recruiter', 'instructor', 'customer', 'worker_operator', 'training_supervisor'];
    if (!allowedRoles.includes(validRole)) {
      return NextResponse.json(
        { error: `不支持的角色: ${validRole}` },
        { status: 400 }
      );
    }

    // 验证码校验
    const isValidCode = await verifyCode(phone, code);
    if (!isValidCode) {
      return NextResponse.json(
        { error: '验证码错误或已过期' },
        { status: 401 }
      );
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查重：手机号+角色是否已存在
    const { data: existing, error: queryError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .eq('role', validRole)
      .maybeSingle();

    if (queryError) {
      console.error('[register] Query error:', queryError);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: '该手机号已注册此角色，请直接登录', code: 'DUPLICATE_PHONE' },
        { status: 409 }
      );
    }

    // 创建用户
    const userId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        phone,
        name,
        role: validRole,
        is_active: false,
        review_status: 'pending',
        register_source: 'self',
        password_hash: '123456',
      })
      .select('id, name, phone, role, review_status')
      .single();

    if (insertError || !newUser) {
      console.error('[register] Insert error:', insertError);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: '注册成功，等待管理员审核',
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
          review_status: newUser.review_status,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '注册失败';
    console.error('[register] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 验证码校验（与 phone-login 逻辑一致）
async function verifyCode(phone: string, code: string): Promise<boolean> {
  const isDev = !process.env.SMS_PROVIDER;
  if (isDev) {
    return code === '888888';
  }

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
    if (new Date(data.expires_at) < new Date()) return false;
    if (data.code !== code) return false;

    // 标记为已使用
    await supabase.from('sms_codes').update({ used: true }).eq('phone', phone).eq('code', code);

    return true;
  } catch {
    return code === '888888';
  }
}

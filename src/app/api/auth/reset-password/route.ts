import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth-password';

// 重置密码（通过验证码验证身份，不需要旧密码）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, newPassword } = body as {
      phone: string;
      code: string;
      newPassword: string;
    };

    if (!phone || !code || !newPassword) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: '新密码至少4位' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 验证验证码
    const { data: codes, error: codeError } = await supabase
      .from('sms_codes')
      .select('id, code, expires_at, used')
      .eq('phone', phone)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (codeError || !codes || codes.length === 0) {
      return NextResponse.json({ error: '请先获取验证码' }, { status: 400 });
    }

    const smsCode = codes[0];
    const isExpired = new Date(smsCode.expires_at).getTime() < Date.now();

    if (isExpired) {
      return NextResponse.json({ error: '验证码已过期，请重新获取' }, { status: 400 });
    }

    if (smsCode.code !== code) {
      return NextResponse.json({ error: '验证码错误' }, { status: 400 });
    }

    // 标记验证码已使用
    await supabase
      .from('sms_codes')
      .update({ used: true })
      .eq('id', smsCode.id);

    // 查找用户
    const { data: users, error } = await supabase
      .from('users')
      .select('id, phone')
      .eq('phone', phone);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ error: '该手机号未注册' }, { status: 404 });
    }

    // 更新所有匹配账号的密码
    for (const user of users) {
      await supabase
        .from('users')
        .update({ password_hash: hashPassword(newPassword) })
        .eq('id', user.id);
    }

    return NextResponse.json({ success: true, message: '密码重置成功' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '重置失败';
    console.error('[reset-password] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

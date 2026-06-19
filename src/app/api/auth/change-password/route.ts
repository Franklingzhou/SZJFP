import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// 修改密码（需登录态，通过 x-session 识别用户）
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'profile:write');
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { current_password, new_password } = body as {
      current_password: string;
      new_password: string;
    };

    if (!current_password || !new_password) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    if (new_password.length < 4) {
      return NextResponse.json({ error: '新密码至少4位' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 通过 session.userId 查找用户
    const { data: user, error } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', session.userId)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 校验旧密码
    if (!user.password_hash || user.password_hash !== current_password) {
      return NextResponse.json({ error: '当前密码错误' }, { status: 401 });
    }

    // 更新密码
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: new_password })
      .eq('id', user.id);

    if (updateError) {
      console.error('[change-password] DB error:', updateError);
      return NextResponse.json({ error: '修改失败，请重试' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '修改失败';
    console.error('[change-password] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

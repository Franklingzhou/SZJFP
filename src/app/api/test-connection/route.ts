import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // 测试查询
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, phone, role')
      .limit(10);

    if (usersError) {
      return NextResponse.json({
        success: false,
        error: usersError.message,
        hint: '请检查Supabase连接配置和表是否存在',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '数据库连接成功！',
      userCount: users?.length || 0,
      users: users || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '连接失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('id, phone')
      .limit(5);

    if (tablesError) {
      return NextResponse.json({
        success: false,
        status: 'TABLE_NOT_FOUND',
        error: tablesError.message,
        suggestion: '需要在Supabase SQL Editor中执行建表SQL',
      });
    }

    return NextResponse.json({
      success: true,
      status: 'TABLE_EXISTS',
      userCount: tables?.length || 0,
      users: tables,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
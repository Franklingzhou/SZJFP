import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/admin/refresh-schema — 查看状态
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: '使用 POST 请求来刷新 PostgREST schema cache',
  });
}

// POST /api/admin/refresh-schema — 刷新 Supabase PostgREST schema cache
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    // 调用 PostgreSQL 函数发送 NOTIFY pgrst, 'reload schema'
    const { error } = await supabase.rpc('reload_schema');

    if (error) {
      // 如果 rpc 不可用，尝试直接通过 REST API 触发
      console.error('[refresh-schema] rpc failed:', error.message);
      return NextResponse.json({
        ok: false,
        error: 'Schema refresh failed',
        detail: error.message,
        hint: '可能需要手动在 Supabase Dashboard → Database → 点击 "Reload Schema"',
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'PostgREST schema cache 已刷新',
      refreshed_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const err = e as Error;
    return NextResponse.json({
      ok: false,
      error: 'Schema refresh failed',
      detail: err.message,
    }, { status: 500 });
  }
}

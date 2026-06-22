import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/settings — 获取系统设置
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'settings:read');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const key = searchParams.get('key');

    if (key) {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value, updated_at')
        .eq('key', key)
        .single();
      if (error && error.code !== 'PGRST116') {
        console.error('[settings GET] Error:', error.message);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data: data || null });
    }

    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value, updated_at')
      .order('key');

    if (error) {
      console.error('[settings GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[settings GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/settings — 保存系统设置（upsert）
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'settings:write');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { key, value } = body as { key: string; value: unknown };

    if (!key) {
      return NextResponse.json({ ok: false, error: '缺少配置键名' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('system_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single();

    if (error) {
      console.error('[settings PUT] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '保存失败';
    console.error('[settings PUT] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/notifications — 获取通知列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'notifications:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');
    const isRead = searchParams.get('is_read');

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }
    if (isRead !== null && isRead !== undefined) {
      query = query.eq('is_read', isRead === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[notifications GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[notifications GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/notifications — 发送通知（仅admin）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'notifications:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { user_id, title, content, type } = body as {
      user_id: string;
      title: string;
      content: string;
      type?: string;
    };

    if (!user_id || !title || !content) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：user_id, title, content' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        content,
        type: type || 'system',
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[notifications POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '发送失败';
    console.error('[notifications POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

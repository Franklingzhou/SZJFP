import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

async function markAsRead(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

// PUT /api/notifications/[id] — 标记已读
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'notifications:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { id } = await params;
    const { data, error } = await markAsRead(id);

    if (error) {
      console.error('[notifications PUT] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[notifications PUT] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PATCH /api/notifications/[id] — 标记已读（兼容前端PATCH调用）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'notifications:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { id } = await params;
    const { data, error } = await markAsRead(id);

    if (error) {
      console.error('[notifications PATCH] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[notifications PATCH] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/workers/[id]/media — 获取阿姨照片/视频列表（公开接口）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('worker_media')
      .select('id, type, category, url, sort_order, created_at')
      .eq('worker_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// POST /api/workers/[id]/media — 添加照片/视频（需认证）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'workers:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { type, category, url } = body as { type: string; category?: string; url: string };

    if (!type || !url) {
      return NextResponse.json({ error: '缺少 type 或 url 参数' }, { status: 400 });
    }
    if (!['photo', 'video'].includes(type)) {
      return NextResponse.json({ error: 'type 必须为 photo 或 video' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const mediaId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('worker_media')
      .insert({
        id: mediaId,
        worker_id: id,
        type,
        category: category || 'other',
        url,
        sort_order: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[worker_media POST] DB error:', error);
      return NextResponse.json({ error: '添加失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: '添加失败' }, { status: 500 });
  }
}

// DELETE /api/workers/[id]/media — 删除照片/视频（需认证，传 media_id）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'workers:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const { id } = await params;
  const mediaId = request.nextUrl.searchParams.get('media_id');
  if (!mediaId) {
    return NextResponse.json({ error: '缺少 media_id 参数' }, { status: 400 });
  }

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('worker_media')
      .delete()
      .eq('id', mediaId)
      .eq('worker_id', id);

    if (error) {
      console.error('[worker_media DELETE] DB error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

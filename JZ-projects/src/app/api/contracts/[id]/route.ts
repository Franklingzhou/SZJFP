import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/contracts/[id] — 获取单个合同
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'contracts:read');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// PUT /api/contracts/[id] — 更新合同 (委托到集合级 PUT)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

// PATCH /api/contracts/[id] — 局部更新 (NEW-58)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  const session = await checkPermission(request, 'contracts:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const updates = { id, ...body };

    const { PUT: collectionPut } = await import('../route');
    if (!collectionPut) {
      return NextResponse.json({ error: '内部路由错误' }, { status: 500 });
    }
    const internalUrl = new URL('/api/contracts', request.url);
    const internalReq = new NextRequest(internalUrl, {
      method: 'PUT',
      headers: request.headers,
      body: JSON.stringify(updates),
    });
    return collectionPut(internalReq);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/contracts/[id] — 删除合同 (仅管理员)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'contracts:delete');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase.from('contracts').delete().eq('id', id);

    if (error) {
      console.error('[contracts DELETE] DB error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    console.log(`[contracts DELETE] contract ${id} deleted by admin ${session.userId}`);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/contract-templates — 获取合同模板列表
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'contract-templates:read');
  if (!session) return unauthorizedResponse();
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const type = request.nextUrl.searchParams.get('type');
    const isActive = request.nextUrl.searchParams.get('is_active');

    let query = supabase
      .from('contract_templates')
      .select('id, name, type, content, description, is_active, sort_order, created_by, created_at, updated_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (type) query = query.eq('type', type);
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[contract-templates GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[contract-templates GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/contract-templates — 创建合同模板
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'contract-templates:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { name, template_name, type, content, description, is_active, sort_order } = body as {
      name?: string;
      template_name?: string;  // 别名
      type: string;
      content: string;
      description?: string;
      is_active?: boolean;
      sort_order?: number;
    };

    const finalName = name || template_name;
    if (!finalName || !content) {
      return NextResponse.json({ error: '缺少必要参数(name, content)' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const finalType = type || 'general';
    const { data, error } = await supabase
      .from('contract_templates')
      .insert({
        name: finalName,
        type: finalType,
        content,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
        sort_order: sort_order || 0,
        created_by: session.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('[contract-templates POST] DB error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[contract-templates POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/contract-templates — 更新合同模板
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'contract-templates:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id, name, type, content, description, is_active, sort_order } = body as {
      id: string;
      name?: string;
      type?: string;
      content?: string;
      description?: string;
      is_active?: boolean;
      sort_order?: number;
    };

    if (!id) {
      return NextResponse.json({ error: '缺少模板ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 显式白名单更新
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (content !== undefined) updates.content = content;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data, error } = await supabase
      .from('contract_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[contract-templates PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '未找到该模板' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[contract-templates PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/contract-templates — 停用模板（软删除）
export async function DELETE(request: NextRequest) {
  const session = await checkPermission(request, 'contract-templates:write');
  if (!session) return unauthorizedResponse();
  try {
    let id: string | undefined;
    // 优先从 URL 参数取
    id = request.nextUrl.searchParams.get('id') || undefined;
    // 兼容 body 方式
    if (!id) {
      try {
        const body = await request.json();
        id = (body as Record<string, unknown>).id as string;
      } catch { /* body 为空或非JSON */ }
    }

    if (!id) {
      return NextResponse.json({ error: '缺少模板ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('contract_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[contract-templates DELETE] DB error:', error);
      return NextResponse.json({ error: '停用失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '停用失败';
    console.error('[contract-templates DELETE] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

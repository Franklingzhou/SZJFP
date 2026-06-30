import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/field-permissions — 获取字段权限配置列表
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'settings:manage');

  if (session instanceof NextResponse) return session;
  
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = request.nextUrl;
    const role = searchParams.get('role');
    const moduleName = searchParams.get('module');

    let query = supabase
      .from('field_permissions')
      .select('*')
      .order('role', { ascending: true })
      .order('module', { ascending: true });

    if (role) query = query.eq('role', role);
    if (moduleName) query = query.eq('module', moduleName);

    const { data, error } = await query;

    if (error) {
      console.error('[field-permissions GET] Error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[field-permissions GET] Unexpected error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST /api/field-permissions — 创建或批量更新字段权限配置
export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'settings:manage');

  if (session instanceof NextResponse) return session;
  
  try {
    const body = await request.json();
    const supabase = getSupabaseClient();

    // 支持批量更新（传入数组）或单条创建
    const items = Array.isArray(body) ? body : [body];
    const results = [];

    for (const item of items) {
      const { role, module, visible_fields, editable_fields, enabled, description } = item;

      if (!role || !module) {
        return NextResponse.json({ error: '角色和模块不能为空' }, { status: 400 });
      }

      // 检查是否已存在
      const { data: existing } = await supabase
        .from('field_permissions')
        .select('id')
        .eq('role', role)
        .eq('module', module)
        .single();

      if (existing) {
        // 更新
        const { data, error } = await supabase
          .from('field_permissions')
          .update({
            visible_fields: visible_fields || null,
            editable_fields: editable_fields || null,
            enabled: enabled ?? false,
            description: description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('[field-permissions POST] Update error:', error);
          return NextResponse.json({ error: '更新失败' }, { status: 500 });
        }
        results.push(data);
      } else {
        // 新建
        const { data, error } = await supabase
          .from('field_permissions')
          .insert({
            role,
            module,
            visible_fields: visible_fields || null,
            editable_fields: editable_fields || null,
            enabled: enabled ?? false,
            description: description || null,
          })
          .select()
          .single();

        if (error) {
          console.error('[field-permissions POST] Insert error:', error);
          return NextResponse.json({ error: '创建失败' }, { status: 500 });
        }
        results.push(data);
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err) {
    console.error('[field-permissions POST] Unexpected error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/field-permissions — 删除配置
export async function DELETE(request: NextRequest) {
  const session = await requirePermission(request, 'settings:manage');

  if (session instanceof NextResponse) return session;
  
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少ID参数' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('field_permissions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[field-permissions DELETE] Error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[field-permissions DELETE] Unexpected error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

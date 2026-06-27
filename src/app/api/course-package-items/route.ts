import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/course-package-items — 查询套餐项目
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'courses:read');
  if (!session) return unauthorizedResponse();
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const packageId = request.nextUrl.searchParams.get('package_id');
    const itemId = request.nextUrl.searchParams.get('item_id');

    let query = supabase
      .from('course_package_items')
      .select('id, package_course_id, item_course_id, sort_order, created_at')
      .order('sort_order', { ascending: true });

    if (packageId) query = query.eq('package_course_id', packageId);
    if (itemId) query = query.eq('item_course_id', itemId);

    const { data: items, error } = await query;

    if (error) {
      console.error('[course-package-items GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 关联查询课程名称
    if (items && items.length > 0) {
      const courseIds = [...new Set([
        ...items.map((i: Record<string, unknown>) => i.package_course_id),
        ...items.map((i: Record<string, unknown>) => i.item_course_id),
      ] as string[])];

      const { data: courses } = await supabase
        .from('courses')
        .select('id, name, course_type')
        .in('id', courseIds);

      const courseMap = new Map(
        (courses || []).map((c: Record<string, unknown>) => [c.id, c])
      );

      const enriched = items.map((item: Record<string, unknown>) => ({
        ...item,
        package_course_name: courseMap.get(item.package_course_id)?.name || null,
        package_course_type: courseMap.get(item.package_course_id)?.course_type || null,
        item_course_name: courseMap.get(item.item_course_id)?.name || null,
        item_course_type: courseMap.get(item.item_course_id)?.course_type || null,
      }));

      return NextResponse.json({ data: enriched });
    }

    return NextResponse.json({ data: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[course-package-items GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/course-package-items — 新建套餐项目
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'courses:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { package_course_id, item_course_id, sort_order, package_id, item_id, item_name } = body as {
      package_course_id?: string;
      item_course_id?: string;
      sort_order?: number;
      package_id?: string;    // 别名
      item_id?: string;       // 别名
      item_name?: string;     // 别名（忽略）
    };

    const finalPackageId = package_course_id || package_id;
    const finalItemId = item_course_id || item_id;

    if (!finalPackageId || !finalItemId) {
      return NextResponse.json({ error: '缺少套餐课程ID或子课程ID' }, { status: 400 });
    }

    if (finalPackageId === finalItemId) {
      return NextResponse.json({ error: '套餐不能包含自身' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 校验套餐课程类型必须是 package
    const { data: pkgCourse } = await supabase
      .from('courses')
      .select('id, course_type')
      .eq('id', finalPackageId)
      .single();

    if (!pkgCourse) {
      return NextResponse.json({ error: '套餐课程不存在' }, { status: 404 });
    }
    if (pkgCourse.course_type !== 'package') {
      return NextResponse.json({ error: '目标课程不是套餐类型' }, { status: 400 });
    }

    // 校验子课程存在且是单课
    const { data: itemCourse } = await supabase
      .from('courses')
      .select('id, course_type')
      .eq('id', finalItemId)
      .single();

    if (!itemCourse) {
      return NextResponse.json({ error: '子课程不存在' }, { status: 404 });
    }

    // 检查重复
    const { data: existing } = await supabase
      .from('course_package_items')
      .select('id')
      .eq('package_course_id', finalPackageId)
      .eq('item_course_id', finalItemId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: '该子课程已在此套餐中' }, { status: 409 });
    }

    const insertData: Record<string, unknown> = {
      package_course_id: finalPackageId,
      item_course_id: finalItemId,
      sort_order: sort_order ?? 0,
    };

    const { data, error } = await supabase
      .from('course_package_items')
      .insert(insertData)
      .select();

    if (error) {
      console.error('[course-package-items POST] DB error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data?.[0] }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[course-package-items POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/course-package-items — 更新套餐项目
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'courses:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const allowedFields = ['item_course_id', 'sort_order'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeUpdates[key] = body[key];
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('course_package_items')
      .update(safeUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[course-package-items PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该项目' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[course-package-items PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/course-package-items — 删除套餐项目
export async function DELETE(request: NextRequest) {
  const session = await checkPermission(request, 'courses:write');
  if (!session) return unauthorizedResponse();
  try {
    let id = request.nextUrl.searchParams.get('id');
    // 兼容 body 方式传 id
    if (!id) {
      try {
        const body = await request.json();
        id = (body as Record<string, unknown>).id as string;
      } catch { /* body 为空或非JSON */ }
    }

    if (!id) {
      return NextResponse.json({ error: '缺少项目ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('course_package_items')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('[course-package-items DELETE] DB error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该项目' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '删除失败';
    console.error('[course-package-items DELETE] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

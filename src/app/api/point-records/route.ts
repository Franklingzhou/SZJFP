import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/point-records — 查询积分记录列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'points:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    let query = supabase
      .from('point_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500));

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.ilike('action', `%${action}%`);

    const { data, error } = await query;

    if (error) {
      console.error('[point-records GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[point-records GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/point-records — 手动调整积分（创建记录+更新用户总分）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'points:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { user_id, action, points, related_order_id } = body as {
      user_id: string;
      action: string;
      points: number;
      related_order_id?: string;
    };

    if (!user_id || !action || points === undefined) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：user_id, action, points' }, { status: 400 });
    }

    const recordId = `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: recordId,
      user_id,
      action,
      points: Math.round(points),
      related_order_id: related_order_id || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('point_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[point-records POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 同步更新用户积分
    const { data: userData } = await supabase
      .from('users')
      .select('points')
      .eq('id', user_id)
      .maybeSingle();
    const currentPoints = Number(userData?.points) || 0;
    const newPoints = Math.max(0, currentPoints + Math.round(points));
    await supabase
      .from('users')
      .update({ points: newPoints, updated_at: new Date().toISOString() })
      .eq('id', user_id);
    // 同步 workers 表
    await supabase
      .from('workers')
      .update({ points: newPoints, updated_at: new Date().toISOString() })
      .eq('user_id', user_id);

    console.log('[point-records] Created:', recordId, 'user=', user_id, 'points=', points);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[point-records POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

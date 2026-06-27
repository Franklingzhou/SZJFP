import { NextRequest, NextResponse } from 'next/server';
import { requireRole, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/operation-logs — 查询操作日志（admin + training_supervisor）
export async function GET(request: NextRequest) {
  const session = await requireRole(request, ['admin', 'training_supervisor']);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const resourceId = searchParams.get('resource_id');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    let query = supabase
      .from('operation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (action) query = query.eq('action', action);
    if (resource) query = query.eq('resource', resource);
    if (resourceId) query = query.eq('resource_id', resourceId);

    const { data, error, count } = await query;

    if (error) {
      console.error('[operation-logs GET] DB error:', error);
      return NextResponse.json({ ok: true, data: [], total: 0, message: '操作日志表尚未初始化' });
    }

    return NextResponse.json({ ok: true, data: data || [], total: count || 0 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/operation-logs — 记录操作日志
export async function POST(request: NextRequest) {
  const session = await requireRole(request, [
    'admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator',
  ]);
  if (!session) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { action, resource, resource_id, detail } = body as {
      action: string;
      resource: string;
      resource_id?: string;
      detail?: string;
    };

    if (!action || !resource) {
      return NextResponse.json({ error: '缺少必填字段(action, resource)' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('operation_logs')
      .insert({
        user_id: session.userId,
        user_name: session.name,
        user_role: session.role,
        action,
        resource,
        resource_id: resource_id || null,
        detail: detail || null,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[operation-logs POST] DB error:', error);
      return NextResponse.json({ ok: true, data: null, message: '日志记录失败（表可能未创建）' });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '记录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

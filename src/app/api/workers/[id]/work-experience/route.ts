import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/workers/[id]/work-experience — 获取上户记录列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('worker_work_experience')
      .select('id, period, employer, job_type, description, sort_order, contract_id, source, created_at')
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

// POST /api/workers/[id]/work-experience — 添加上户记录（需认证）
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
    const { period, employer, job_type, description } = body as {
      period: string; employer?: string; job_type?: string; description?: string;
    };

    if (!period) {
      return NextResponse.json({ error: '缺少工作时间段' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const expId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('worker_work_experience')
      .insert({
        id: expId,
        worker_id: id,
        period,
        employer: employer || '',
        job_type: job_type || '',
        description: description || '',
        sort_order: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[work_experience POST] DB error:', error);
      return NextResponse.json({ error: '添加失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: '添加失败' }, { status: 500 });
  }
}

// PUT /api/workers/[id]/work-experience — 更新上户记录（需认证，传 exp_id）
export async function PUT(
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
    const { exp_id, period, employer, job_type, description } = body as {
      exp_id: string; period?: string; employer?: string; job_type?: string; description?: string;
    };

    if (!exp_id) {
      return NextResponse.json({ error: '缺少 exp_id 参数' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const updates: Record<string, unknown> = {};
    if (period !== undefined) updates.period = period;
    if (employer !== undefined) updates.employer = employer;
    if (job_type !== undefined) updates.job_type = job_type;
    if (description !== undefined) updates.description = description;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('worker_work_experience')
      .update(updates)
      .eq('id', exp_id)
      .eq('worker_id', id)
      .select()
      .single();

    if (error) {
      console.error('[work_experience PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '未找到该记录' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

// DELETE /api/workers/[id]/work-experience — 删除上户记录（需认证，传 exp_id）
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
  const expId = request.nextUrl.searchParams.get('exp_id');
  if (!expId) {
    return NextResponse.json({ error: '缺少 exp_id 参数' }, { status: 400 });
  }

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('worker_work_experience')
      .delete()
      .eq('id', expId)
      .eq('worker_id', id);

    if (error) {
      console.error('[work_experience DELETE] DB error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

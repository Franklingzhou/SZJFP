import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';

// PATCH /api/recommendations/[id] — 审核推荐记录（仅admin）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'recommendations:write');
  if (!session) return unauthorizedResponse();

  if (session.role !== 'admin') {
    return forbiddenResponse('仅管理员可审核推荐记录');
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejection_reason } = body as {
      status: string;
      rejection_reason?: string;
    };

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: '状态值必须为 approved 或 rejected' }, { status: 400 });
    }

    if (status === 'rejected' && (!rejection_reason || !rejection_reason.trim())) {
      return NextResponse.json({ error: '拒绝推荐时必须填写理由' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 检查记录是否存在
    const { data: existing, error: fetchError } = await supabase
      .from('recommendations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json({ error: '推荐记录不存在' }, { status: 404 });
    }

    // 更新记录
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'rejected' && rejection_reason) {
      updates.rejection_reason = rejection_reason.trim();
    }

    const { data, error } = await supabase
      .from('recommendations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[recommendations PATCH] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    // enrichment：关联查询（与GET一致）
    const workerIds = data.worker_id ? [data.worker_id] : [];
    const orderIds = data.order_id ? [data.order_id] : [];
    const recommenderIds = data.recommender_id ? [data.recommender_id] : [];

    const [workersRes, ordersRes, usersRes] = await Promise.all([
      workerIds.length > 0
        ? supabase.from('workers').select('id, name, user_id, status, job_types, experience_years, origin').in('id', workerIds)
        : Promise.resolve({ data: [] }),
      orderIds.length > 0
        ? supabase.from('orders').select('id, title, status, location, salary_min, salary_max, job_type').in('id', orderIds)
        : Promise.resolve({ data: [] }),
      recommenderIds.length > 0
        ? supabase.from('users').select('id, name, phone, role').in('id', recommenderIds)
        : Promise.resolve({ data: [] }),
    ]);

    // 获取worker的phone
    const workerUserIds = [...new Set((workersRes.data || []).map((w: Record<string, unknown>) => w.user_id as string).filter(Boolean))];
    const workerUsersRes = workerUserIds.length > 0
      ? await supabase.from('users').select('id, phone').in('id', workerUserIds)
      : { data: [] };
    const userPhoneMap = new Map((workerUsersRes.data || []).map((u: Record<string, unknown>) => [u.id, u.phone]));
    const workerUserMap = new Map((workersRes.data || []).map((w: Record<string, unknown>) => [w.id, w.user_id]));

    const worker = (workersRes.data || []).find((w: Record<string, unknown>) => w.id === data.worker_id) as Record<string, unknown> | undefined;
    const order = (ordersRes.data || []).find((o: Record<string, unknown>) => o.id === data.order_id) as Record<string, unknown> | undefined;
    const recommender = (usersRes.data || []).find((u: Record<string, unknown>) => u.id === data.recommender_id) as Record<string, unknown> | undefined;
    const workerUserId = worker ? workerUserMap.get(worker.id as string) : null;
    const workerPhone = workerUserId ? (userPhoneMap.get(workerUserId as string) || '') : '';

    const enriched = {
      ...data,
      worker_name: worker?.name || '未知',
      worker_phone: workerPhone,
      worker_status: worker?.status || '',
      worker_skills: worker?.job_types || '',
      worker_experience_years: worker?.experience_years || null,
      worker_hometown: worker?.origin || '',
      order_title: order?.title || '未知订单',
      order_status: order?.status || '',
      order_location: order?.location || '',
      order_salary_min: order?.salary_min || 0,
      order_salary_max: order?.salary_max || 0,
      order_job_type: order?.job_type || '',
      recommender_name: recommender?.name || '未知',
      recommender_phone: recommender?.phone || '',
      recommender_role: data.recommender_role || recommender?.role || '',
    };

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[recommendations PATCH] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

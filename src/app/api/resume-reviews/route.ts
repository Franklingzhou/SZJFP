import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/resume-reviews — 列出审核记录
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'resume-reviews:read');
  if (!session) return unauthorizedResponse();
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const rStatus = request.nextUrl.searchParams.get('status');
    const workerId = request.nextUrl.searchParams.get('worker_id');
    const type = request.nextUrl.searchParams.get('type');
    const source = request.nextUrl.searchParams.get('source'); // 'lead' | 'direct'

    // 先尝试新字段查询，如果列不存在则回退到旧字段
    let data: Record<string, unknown>[] | null = null;
    let error: unknown = null;

    // 尝试方案1：使用新字段（schema.ts定义）
    const selectNew = 'id, worker_id, type, review_type, old_data, new_data, changes, status, reviewer_id, review_note, reviewed_at, created_at';
    let query1 = supabase
      .from('resume_reviews')
      .select(selectNew + ', workers(name, job_types, origin, lead_id)')
      .order('created_at', { ascending: false });
    if (rStatus) query1 = query1.eq('status', rStatus);
    if (workerId) query1 = query1.eq('worker_id', workerId);
    if (type) query1 = query1.eq('type', type);
    if (source === 'lead') query1 = query1.not('workers.lead_id', 'is', null);
    if (source === 'direct') query1 = query1.is('workers.lead_id', null);
    const r1 = await query1;

    if (!r1.error) {
      data = r1.data as unknown as typeof data;
    } else {
      // 回退方案2：使用旧字段（supabase-init.sql定义）
      console.log('[resume-reviews GET] New columns not found, falling back to old schema:', r1.error.message);
      const selectOld = 'id, worker_id, status, notes, reviewer_id, reviewed_at, created_at';
      let query2 = supabase
        .from('resume_reviews')
        .select(selectOld + ', workers(name, job_types, origin, lead_id)')
        .order('created_at', { ascending: false });
      if (rStatus) query2 = query2.eq('status', rStatus);
      if (workerId) query2 = query2.eq('worker_id', workerId);
      const r2 = await query2;
      
      if (r2.error) {
        error = r2.error;
        console.error('[resume-reviews GET] Old schema also failed:', r2.error);
      } else {
        data = r2.data as unknown as Record<string, unknown>[] | null;
        // 将旧字段映射为新字段名，保持前端兼容
        if (data) {
          data = data.map((r: Record<string, unknown>) => ({
            ...r,
            reviewer_id: r.reviewed_by || r.reviewer_id,
            review_note: r.notes || r.review_note,
          }));
        }
      }
    }

    if (error) {
      console.error('[resume-reviews GET] DB error:', error);
      return NextResponse.json({ error: '查询失败，请确认已在Supabase SQL Editor中执行 migration_p0_fixes.sql' }, { status: 500 });
    }

    // 补充phone信息（从users表）
    if (data && data.length > 0) {
      const workerIds = [...new Set(data.map((r: Record<string, unknown>) => r.worker_id as string).filter(Boolean))];
      if (workerIds.length > 0) {
        const { data: workersData } = await supabase
          .from('workers')
          .select('id, user_id')
          .in('id', workerIds);
        const userIds = [...new Set((workersData || []).map((w: Record<string, unknown>) => w.user_id as string).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, phone')
            .in('id', userIds);
          const userPhoneMap = new Map((usersData || []).map((u: Record<string, unknown>) => [u.id, u.phone]));
          const workerUserMap = new Map((workersData || []).map((w: Record<string, unknown>) => [w.id, w.user_id]));
          for (const review of data) {
            const wid = (review as Record<string, unknown>).worker_id as string;
            const uid = workerUserMap.get(wid) as string;
            (review as Record<string, unknown>).worker_phone = uid ? (userPhoneMap.get(uid) || '') : '';
          }
        }
      }
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[resume-reviews GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/resume-reviews — 创建审核记录（阿姨提交/修改简历时调用）
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'workers:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { worker_id, type, review_type, old_data, new_data, changes, proposed_data, original_data, changed_fields } = body as {
      worker_id: string;
      type: string;
      review_type?: string;
      old_data?: string;
      new_data?: string;
      changes?: string;
      proposed_data?: Record<string, unknown>;
      original_data?: Record<string, unknown>;
      changed_fields?: string[];
    };

    if (!worker_id || !type) {
      return NextResponse.json({ error: '缺少必要参数(worker_id, type)' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data: reviewData, error: reviewError } = await supabase
      .from('resume_reviews')
      .insert({
        worker_id,
        type,
        review_type: review_type || (type === 'create' ? 'create_resume' : 'update_resume'),
        old_data: old_data || null,
        new_data: new_data || null,
        proposed_data: proposed_data || null,
        original_data: original_data || null,
        changed_fields: changed_fields || null,
        changes: changes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (reviewError) {
      console.error('[resume-reviews POST] DB error:', reviewError);
      return NextResponse.json({ error: '创建审核记录失败' }, { status: 500 });
    }

    const { error: workerError } = await supabase
      .from('workers')
      .update({ resume_review_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', worker_id);

    if (workerError) {
      console.error('[resume-reviews POST] update worker error:', workerError);
    }

    return NextResponse.json({ success: true, data: reviewData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[resume-reviews POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/resume-reviews — 审核通过/拒绝
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'resume-reviews:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id, status, review_note } = body as {
      id: string;
      status: string;
      review_note?: string;
    };

    if (!id || !status) {
      return NextResponse.json({ error: '缺少必要参数(id, status)' }, { status: 400 });
    }

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status必须是approved或rejected' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data: reviewRecord, error: fetchError } = await supabase
      .from('resume_reviews')
      .select('id, worker_id, type, new_data, proposed_data, original_data, changed_fields, status')
      .eq('id', id)
      .single();

    if (fetchError || !reviewRecord) {
      return NextResponse.json({ error: '未找到该审核记录' }, { status: 404 });
    }

    if ((reviewRecord as Record<string, unknown>).status !== 'pending') {
      return NextResponse.json({ error: '该审核记录已处理' }, { status: 400 });
    }

    const { data: updatedReview, error: updateError } = await supabase
      .from('resume_reviews')
      .update({
        status,
        reviewer_id: session.userId,
        review_note: review_note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[resume-reviews PUT] update review error:', updateError);
      return NextResponse.json({ error: '更新审核记录失败' }, { status: 500 });
    }

    const workerUpdateData: Record<string, unknown> = {
      resume_review_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      const reviewType = (reviewRecord as Record<string, unknown>).type as string;
      const proposedData = (reviewRecord as Record<string, unknown>).proposed_data as Record<string, unknown> | null;

      if (proposedData) {
        // 优先使用 proposed_data（结构化JSONB），fallback 到 new_data（文本JSON）
        const allowedFields = [
          'name', 'phone', 'age', 'gender', 'origin', 'job_types', 'experience_years',
          'specialties', 'certifications', 'expected_salary_min', 'expected_salary_max',
          'available_date', 'remark', 'id_card', 'status', 'credit_score', 'deposit', 'points',
          'creator_id', 'creator_role', 'photo',
        ];

        for (const field of allowedFields) {
          if (proposedData[field] !== undefined) {
            workerUpdateData[field] = proposedData[field];
          }
        }
      } else if ((reviewRecord as Record<string, unknown>).new_data) {
        // 兼容旧的 new_data 文本字段
        try {
          const newData = JSON.parse((reviewRecord as Record<string, unknown>).new_data as string);
          const allowedFields = [
            'name', 'phone', 'age', 'origin', 'job_types', 'experience_years',
            'specialties', 'certifications', 'expected_salary_min', 'expected_salary_max',
            'available_date', 'remark'
          ];
          for (const field of allowedFields) {
            if (newData[field] !== undefined) {
              workerUpdateData[field] = newData[field];
            }
          }
        } catch (e) {
          console.error('[resume-reviews PUT] parse new_data error:', e);
        }
      }

      // type=create 时，如果有新的 worker 记录需要填充完整数据
      // type=update 时，直接 update workers 表
      // 两种情况都走 update（因为 POST 已创建空 workers 记录）

      // 审核通过时，确保 resume_review_status 更新为 approved
      workerUpdateData.resume_review_status = 'approved';
    }

    const { error: workerUpdateError } = await supabase
      .from('workers')
      .update(workerUpdateData)
      .eq('id', (reviewRecord as Record<string, unknown>).worker_id as string);

    if (workerUpdateError) {
      console.error('[resume-reviews PUT] update worker error:', workerUpdateError);
    }

    return NextResponse.json({ success: true, data: updatedReview });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[resume-reviews PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/workers/[id] — 公开获取阿姨详情（无需认证，用于简历分享页）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sharedBy = request.nextUrl.searchParams.get('sharedBy') || '';

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 1. 查阿姨信息
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, user_id, name, phone, age, gender, origin, job_types, experience_years, specialties, certifications, certificates, expected_salary_min, expected_salary_max, status, available_date, credit_score, deposit, points, resume_review_status, photo, created_at')
      .eq('id', id)
      .maybeSingle();

    if (workerErr || !worker) {
      return NextResponse.json({ error: '简历未找到' }, { status: 404 });
    }

    // 2. 查该阿姨的评价（公开可见的，非hidden）
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, reviewer_id, reviewer_role, rating, content, status, created_at')
      .eq('target_user_id', worker.user_id || worker.id)
      .eq('hidden', false)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(10);

    // 3. 查评价人信息
    const reviewerIds = (reviews || []).map((r: { reviewer_id: string }) => r.reviewer_id).filter(Boolean);
    const reviewerMap: Record<string, { name: string; role: string }> = {};
    if (reviewerIds.length > 0) {
      const { data: reviewers } = await supabase
        .from('users')
        .select('id, name, role')
        .in('id', reviewerIds);
      if (reviewers) {
        for (const u of reviewers) {
          reviewerMap[u.id] = { name: u.name, role: u.role };
        }
      }
    }

    // 4. 查分享人信息
    let sharedByUser = null;
    if (sharedBy) {
      const { data: user } = await supabase
        .from('users')
        .select('id, name, phone, role')
        .eq('id', sharedBy)
        .maybeSingle();
      if (user) {
        sharedByUser = {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          roleLabel: user.role === 'recruiter' ? '招生顾问' : user.role === 'agent' ? '经纪人' : user.role,
        };
      }
    }

    // 5. 查照片/视频（worker_media 表）
    const { data: media } = await supabase
      .from('worker_media')
      .select('id, type, category, url, sort_order, created_at')
      .eq('worker_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // 6. 查上户记录（worker_work_experience 表）
    const { data: workExperience } = await supabase
      .from('worker_work_experience')
      .select('id, period, employer, job_type, description, sort_order, contract_id, source, created_at')
      .eq('worker_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // 7. 查公开页可见性配置（system_settings.work_experience_public_visibility）
    const { data: visibilitySetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'work_experience_public_visibility')
      .maybeSingle();

    let expVisibility: Record<string, boolean> = { period: true, employer: false, jobType: true, description: true, salary: false };
    if (visibilitySetting?.value) {
      try {
        const parsed = typeof visibilitySetting.value === 'string'
          ? JSON.parse(visibilitySetting.value)
          : visibilitySetting.value;
        if (parsed && typeof parsed === 'object') expVisibility = parsed;
      } catch { /* keep defaults */ }
    }

    // 8. 格式化返回数据
    const avgRating = (reviews || []).length > 0
      ? ((reviews || []).reduce((s: number, r: { rating: number }) => s + (r.rating || 0), 0) / (reviews || []).length).toFixed(1)
      : '暂无';

    const formattedReviews = (reviews || []).map((r: { id: string; reviewer_id: string; reviewer_role: string; rating: number; content: string; status: string; created_at: string }) => ({
      id: r.id,
      reviewerName: reviewerMap[r.reviewer_id]?.name || '匿名用户',
      reviewerRole: r.reviewer_role,
      rating: r.rating,
      content: r.content,
      status: r.status,
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      data: {
        ...worker,
        jobTypes: worker.job_types ? (typeof worker.job_types === 'string' ? worker.job_types.split(',').filter(Boolean) : worker.job_types) : [],
        experienceYears: worker.experience_years || 0,
        expectedSalaryMin: worker.expected_salary_min || 0,
        expectedSalaryMax: worker.expected_salary_max || 0,
        creditScore: worker.credit_score || 1000,
        specialties: worker.specialties ? (typeof worker.specialties === 'string' ? worker.specialties.split(',').filter(Boolean) : worker.specialties) : [],
        certifications: worker.certifications ? (typeof worker.certifications === 'string' ? worker.certifications.split(',').filter(Boolean) : worker.certifications) : [],
        certificates: Array.isArray(worker.certificates) ? worker.certificates : [],
        reviews: formattedReviews,
        avgRating,
        reviewCount: (reviews || []).length,
        sharedByUser,
        expVisibility,
        photos: (media || []).filter((m: { type: string }) => m.type === 'photo'),
        videos: (media || []).filter((m: { type: string }) => m.type === 'video'),
        workExperience: (workExperience || []).map((exp: { id: string; period: string; employer: string; job_type: string; description: string; sort_order: number; contract_id: string; source: string }) => ({
          id: exp.id,
          period: exp.period,
          employer: exp.employer,
          jobType: exp.job_type,
          description: exp.description,
          sortOrder: exp.sort_order,
          contractId: exp.contract_id,
          source: exp.source || 'manual',
        })),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[workers/[id] GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/workers/[id] — 更新阿姨信息（提交审核或直接修改status等字段）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'workers:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status, available_date, resume_review_status, credit_score, deposit, points, remark, name, phone, age, gender, origin, job_types, experience_years, specialties, certifications, expected_salary_min, expected_salary_max, id_card, photo } = body as Record<string, unknown>;

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询当前记录
    const { data: worker, error: findErr } = await supabase
      .from('workers')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !worker) {
      return NextResponse.json({ error: '阿姨记录不存在' }, { status: 404 });
    }

    // 白名单字段（status 由 PATCH 审批接口控制，不在此处开放直改）
    const allowedFields = ['available_date', 'resume_review_status', 'credit_score', 'deposit', 'points', 'remark', 'name', 'phone', 'age', 'gender', 'origin', 'job_types', 'experience_years', 'specialties', 'certifications', 'certificates', 'expected_salary_min', 'expected_salary_max', 'id_card', 'photo'];
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of allowedFields) {
      if (key in body && body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    // 年龄边界校验
    if (updates.age !== undefined) {
      const ageVal = updates.age as number;
      if (typeof ageVal !== 'number' || ageVal < 18 || ageVal > 100) {
        return NextResponse.json({ error: '年龄需在18-100之间' }, { status: 400 });
      }
    }

    // 手机号唯一性校验
    if (updates.phone) {
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('id, name')
        .eq('phone', updates.phone as string)
        .neq('id', id)
        .limit(1);
      if (existingWorker && existingWorker.length > 0) {
        return NextResponse.json({ error: `该手机号已存在简历（${existingWorker[0].name}）` }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[workers/[id] PUT] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[workers/[id] PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/workers/[id] — admin审核pending worker（status改为available）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'workers:approve');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status: newStatus, remark } = body as { status?: string; remark?: string };

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查worker
    const { data: worker, error: findErr } = await supabase
      .from('workers')
      .select('*')
      .eq('id', id)
      .single();

    if (findErr || !worker) {
      return NextResponse.json({ error: '阿姨记录不存在' }, { status: 404 });
    }

    // 仅pending可审核
    if (worker.status !== 'pending') {
      return NextResponse.json({ error: '只有待审核状态才能审批' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: newStatus || 'available',
      resume_review_status: newStatus === 'rejected' ? 'rejected' : 'approved',
      remark: remark || worker.remark,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('workers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[workers/[id] PATCH] Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    console.error('[workers/[id] PATCH] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

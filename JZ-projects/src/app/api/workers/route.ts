import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-middleware';

// GET /api/workers — 获取阿姨列表（支持筛选）
// v7: 新增user_id查询参数 + 自动为登录worker创建记录
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'workers:read');
  if (!session) return unauthorizedResponse();
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const status = request.nextUrl.searchParams.get('status');
    const jobType = request.nextUrl.searchParams.get('job_type');
    const creatorId = request.nextUrl.searchParams.get('creator_id');
    const search = request.nextUrl.searchParams.get('search');
    // v7: 支持user_id查询
    const userId = request.nextUrl.searchParams.get('user_id');

    let query = supabase
      .from('workers')
      .select('id, user_id, name, phone, age, gender, origin, job_types, experience_years, specialties, certifications, expected_salary_min, expected_salary_max, status, available_date, creator_id, creator_role, credit_score, deposit, points, resume_review_status, photo, created_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (jobType) query = query.ilike('job_types', `%${jobType}%`);
    if (creatorId) query = query.eq('creator_id', creatorId);
    if (search) query = query.or(`name.ilike.%${search}%,origin.ilike.%${search}%`);
    // v7: 支持按user_id查询
    if (userId) query = query.eq('user_id', userId);

    // 非admin角色只返回审核通过的简历（管理员可以看到全部）
    const reviewStatus = request.nextUrl.searchParams.get('resume_review_status');
    if (reviewStatus) {
      query = query.eq('resume_review_status', reviewStatus);
    } else if (!creatorId && !userId && session.role !== 'admin') {
      query = query.eq('resume_review_status', 'approved');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[workers GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // v7: 如果指定了user_id但没找到workers记录，且当前用户是worker角色，自动创建一条
    if (userId && (!data || data.length === 0) && session.role === 'worker') {
      console.log('[workers GET] Auto-creating worker record for user:', userId);
      try {
        // 查找users表获取基本信息
        const { data: userInfo } = await supabase
          .from('users')
          .select('id, name, phone')
          .eq('id', userId)
          .single();

        const workerName = userInfo?.name || '新阿姨';
        const workerPhone = userInfo?.phone || '';

        const { data: newWorker, error: createError } = await supabase
          .from('workers')
          .insert({
            id: userId,
            user_id: userId,
            name: workerName,
            phone: workerPhone,
            status: 'idle',
            resume_review_status: 'none',
            gender: '女',
            experience_years: 0,
            expected_salary_min: 0,
            expected_salary_max: 0,
            credit_score: 1000,
            deposit: 0,
            points: 0,
          })
          .select()
          .single();

        if (!createError && newWorker) {
          return NextResponse.json({ data: [newWorker] });
        } else {
          console.error('[workers GET] Auto-create worker failed:', createError);
        }
      } catch (e) {
        console.error('[workers GET] Auto-create worker error:', e);
      }
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[workers GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/workers — 新建阿姨简历（提交审核，不直接写workers表）
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'workers:write');
  if (!session) return session === null ? unauthorizedResponse() : forbiddenResponse();
  try {
    const body = await request.json();
    const { name, phone, age, gender, origin, job_types, experience_years, specialties, certifications, expected_salary_min, expected_salary_max, idcard, intro } = body as {
      name: string; phone?: string; age?: number; gender?: string; origin?: string;
      job_types?: string[] | string; experience_years?: number; specialties?: string[];
      certifications?: string[]; expected_salary_min?: number; expected_salary_max?: number;
      idcard?: string; intro?: string;
    };

    if (!name) {
      return NextResponse.json({ error: '缺少必要参数(姓名)' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 手机号唯一性校验
    if (phone) {
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('id, name')
        .eq('phone', phone)
        .limit(1);
      if (existingWorker && existingWorker.length > 0) {
        return NextResponse.json({ error: `该手机号已存在简历（${existingWorker[0].name}），一个手机号只能有一份简历` }, { status: 409 });
      }
    }

    // 构造提议数据（proposed_data）
    const jobTypesStr = Array.isArray(job_types) ? job_types.join(',') : (job_types || '');
    const proposedData = {
      name,
      phone: phone || '',
      age: age || null,
      gender: gender || '女',
      origin: origin || null,
      id_card: idcard || null,
      job_types: jobTypesStr,
      experience_years: experience_years || 0,
      specialties: specialties ? (Array.isArray(specialties) ? specialties.join(',') : specialties) : '',
      certifications: certifications ? (Array.isArray(certifications) ? certifications.join(',') : certifications) : '',
      expected_salary_min: expected_salary_min || 0,
      expected_salary_max: expected_salary_max || 0,
      remark: intro || null,
      status: 'idle',
      credit_score: 1000,
      deposit: 0,
      points: 0,
      creator_id: session.userId,
      creator_role: session.role,
    };

    // 先创建关联用户
    const userId = `u_wk_${Date.now()}`;
    let resolvedUserId = userId;
    const { error: userErr } = await supabase
      .from('users')
      .insert({
        id: userId,
        name, phone: phone || '',
        role: 'worker',
        review_status: 'pending',
        is_active: true,
      });
    if (userErr) {
      console.warn('[workers POST] Create user skipped:', userErr.message);
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'worker')
        .limit(1);
      if (existingUser && existingUser.length > 0) {
        resolvedUserId = existingUser[0].id;
      } else {
        return NextResponse.json({ error: '创建关联用户失败' }, { status: 500 });
      }
    }

    // 创建一个空workers记录（审核通过后会填充数据）
    const workerId = `wk_${Date.now()}`;
    const { data: workerData, error: workerErr } = await supabase
      .from('workers')
      .insert({
        id: workerId,
        user_id: resolvedUserId,
        name,
        phone: phone || '',
        status: 'idle',
        resume_review_status: 'pending',
        gender: gender || '女',
        experience_years: 0,
        expected_salary_min: 0,
        expected_salary_max: 0,
        credit_score: 1000,
        deposit: 0,
        points: 0,
        creator_id: session.userId,
        creator_role: session.role,
      })
      .select()
      .single();

    if (workerErr) {
      console.error('[workers POST] Create worker error:', workerErr);
      return NextResponse.json({ error: '创建阿姨记录失败' }, { status: 500 });
    }

    // 提交审核记录（proposed_data存完整新值）
    const changedFields = Object.keys(proposedData);
    const { data: reviewData, error: reviewErr } = await supabase
      .from('resume_reviews')
      .insert({
        worker_id: workerId,
        type: 'create',
        review_type: 'create_resume',
        proposed_data: proposedData,
        original_data: null,
        changed_fields: changedFields,
        new_data: JSON.stringify(proposedData),
        status: 'pending',
      })
      .select()
      .single();

    if (reviewErr) {
      console.error('[workers POST] Create review error:', reviewErr);
      // 审核记录创建失败，但仍返回worker数据
    }

    return NextResponse.json({ success: true, data: workerData, review: reviewData || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[workers POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/workers — 更新阿姨信息（提交审核，不直接写workers表）
// v10: 改为提交resume_reviews审核，审核通过后自动更新workers
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'workers:write');
  if (!session) return unauthorizedResponse();
  try {
    const body = await request.json();
    const { id } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少阿姨ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询当前workers记录（用于original_data）
    const { data: currentWorker, error: fetchError } = await supabase
      .from('workers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentWorker) {
      return NextResponse.json({ error: '未找到该阿姨' }, { status: 404 });
    }

    // 显式白名单：只允许更新以下字段
    const allowedFields = ['name', 'phone', 'age', 'gender', 'origin', 'job_types', 'experience_years', 'specialties', 'certifications', 'expected_salary_min', 'expected_salary_max', 'status', 'available_date', 'credit_score', 'deposit', 'points', 'resume_review_status', 'photo', 'remark', 'id_card'];
    const proposedUpdates: Record<string, unknown> = {};
    const changedFields: string[] = [];
    for (const key of allowedFields) {
      if (key in body) {
        proposedUpdates[key] = body[key];
        changedFields.push(key);
      }
    }

    if (changedFields.length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 });
    }

    // 手机号唯一性校验（修改手机号时）
    if (proposedUpdates.phone) {
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('id, name')
        .eq('phone', proposedUpdates.phone as string)
        .neq('id', id)
        .limit(1);
      if (existingWorker && existingWorker.length > 0) {
        return NextResponse.json({ error: `该手机号已存在简历（${existingWorker[0].name}），一个手机号只能有一份简历` }, { status: 409 });
      }
    }

    // 构造original_data（只存变更字段的旧值）
    const originalData: Record<string, unknown> = {};
    for (const field of changedFields) {
      originalData[field] = (currentWorker as Record<string, unknown>)[field] ?? null;
    }

    // 提交审核记录
    const { data: reviewData, error: reviewErr } = await supabase
      .from('resume_reviews')
      .insert({
        worker_id: id,
        type: 'update',
        review_type: 'update_resume',
        proposed_data: proposedUpdates,
        original_data: originalData,
        changed_fields: changedFields,
        new_data: JSON.stringify(proposedUpdates),
        old_data: JSON.stringify(originalData),
        status: 'pending',
      })
      .select()
      .single();

    if (reviewErr) {
      console.error('[workers PUT] Create review error:', reviewErr);
      return NextResponse.json({ error: '提交审核失败' }, { status: 500 });
    }

    // 更新workers的审核状态为pending
    await supabase
      .from('workers')
      .update({ resume_review_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ success: true, data: reviewData, message: '已提交审核，等待管理员审批' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[workers PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

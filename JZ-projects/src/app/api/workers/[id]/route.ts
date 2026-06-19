import { NextRequest, NextResponse } from 'next/server';

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
      .select('id, user_id, name, phone, age, gender, origin, job_types, experience_years, specialties, certifications, expected_salary_min, expected_salary_max, status, available_date, credit_score, deposit, points, resume_review_status, photo, created_at')
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
    let reviewerMap: Record<string, { name: string; role: string }> = {};
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

    // 5. 格式化返回数据
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
        reviews: formattedReviews,
        avgRating,
        reviewCount: (reviews || []).length,
        sharedByUser,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[workers/[id] GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

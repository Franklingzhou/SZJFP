import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/workers/me — 当前登录用户获取自己的阿姨简历
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 通过 user_id 查找当前用户的 worker 记录
    const { data: worker, error } = await supabase
      .from('workers')
      .select('id, user_id, name, phone, age, gender, origin, job_types, experience_years, specialties, certifications, certificates, expected_salary_min, expected_salary_max, status, available_date, creator_id, creator_role, maintainer_id, credit_score, deposit, points, resume_review_status, photo, created_at')
      .eq('user_id', session.userId)
      .maybeSingle();

    if (error || !worker) {
      return NextResponse.json({ error: '简历未找到' }, { status: 404 });
    }

    // 查评价
    const { data: reviews } = await supabase
      .from('reviews')
      .select('id, reviewer_id, reviewer_role, rating, content, status, created_at')
      .eq('target_user_id', session.userId)
      .eq('hidden', false)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20);

    // 格式化评价
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
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[workers/me GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

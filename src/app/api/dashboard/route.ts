import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();

  try {
    // 并行查询所有统计数据
    const [
      workersResult,
      ordersResult,
      leadsResult,
      pendingResumeReviewsResult,
      pendingUserReviewsResult,
      signingsResult,
      usersResult,
      recommendationsResult,
    ] = await Promise.all([
      // 在职阿姨数
      supabase.from('workers').select('id', { count: 'exact', head: true }),
      // 待匹配订单
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'created'),
      // 今日新增线索
      supabase.from('leads').select('id, created_at').gte('created_at', new Date().toISOString().split('T')[0]),
      // 待审核简历
      supabase.from('workers').select('id', { count: 'exact', head: true }).eq('resume_review_status', 'pending'),
      // 待审核用户
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('review_status', 'pending'),
      // 本月签约
      supabase.from('orders').select('id').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).eq('status', 'signed'),
      // 用户总数
      supabase.from('users').select('role', { count: 'exact', head: true }),
      // 待审核推荐
      supabase.from('recommendations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    // 按角色统计用户
    const { data: usersByRole } = await supabase.from('users').select('role');
    const roleCounts: Record<string, number> = {};
    (usersByRole || []).forEach((u: { role: string }) => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      data: {
        totalWorkers: workersResult.count || 0,
        pendingMatchOrders: ordersResult.count || 0,
        todayLeads: leadsResult.count || 0,
        pendingResumeReviews: pendingResumeReviewsResult.count || 0,
        pendingUserReviews: pendingUserReviewsResult.count || 0,
        monthlySignings: signingsResult.count || 0,
        totalUsers: usersResult.count || 0,
        pendingRecommendations: recommendationsResult.count || 0,
        roleCounts,
      },
    });
  } catch (error) {
    console.error('[dashboard] error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}

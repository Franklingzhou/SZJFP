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
      // 待匹配订单（open=已发布待匹配，matching/interviewing 都算待处理）
      supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['open', 'interviewing']),
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

    // 新增：转化漏斗 — 各状态线索数
    const { data: leadStatuses } = await supabase.from('leads').select('status');
    const leadFunnel: Record<string, number> = { new: 0, following: 0, signed: 0, converted: 0, lost: 0 };
    (leadStatuses || []).forEach((l: { status: string }) => {
      if (leadFunnel.hasOwnProperty(l.status)) leadFunnel[l.status] = (leadFunnel[l.status] || 0) + 1;
    });

    // 新增：阿姨生命周期 — 各状态分布
    const { data: workerStatuses } = await supabase.from('workers').select('status');
    const workerLifecycle: Record<string, number> = {};
    (workerStatuses || []).forEach((w: { status: string }) => {
      workerLifecycle[w.status] = (workerLifecycle[w.status] || 0) + 1;
    });

    // 新增：Top经纪人（按订单数）
    const { data: topAgents } = await supabase
      .from('orders')
      .select('agent_id, users!orders_agent_id_fkey(name)')
      .not('agent_id', 'is', null);
    const agentOrderCounts: Record<string, { name: string; count: number }> = {};
    (topAgents || []).forEach((o: { agent_id: string; users?: { name?: string } | Array<{ name?: string }> }) => {
      const key = o.agent_id;
      if (!agentOrderCounts[key]) agentOrderCounts[key] = { name: '', count: 0 };
      agentOrderCounts[key].count++;
      if (o.users) {
        const u = Array.isArray(o.users) ? o.users[0] : o.users;
        if (u?.name) agentOrderCounts[key].name = u.name;
      }
    });
    const topAgentsRanking = Object.entries(agentOrderCounts)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

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
        // 新增字段
        leadFunnel,
        workerLifecycle,
        topAgentsRanking,
      },
    });
  } catch (error) {
    console.error('[dashboard] error:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}

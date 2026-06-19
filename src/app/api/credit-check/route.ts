import { NextRequest, NextResponse } from 'next/server';
import { requireRole, forbiddenResponse } from '@/lib/auth-middleware';

// 征信查询API
// 查询阿姨的诚信分+综合评分
// 真实征信接口需对接人行征信/百行征信等，此处为内部诚信体系查询
export async function GET(request: NextRequest) {
  // 权限校验：管理员、经纪人、培训主管可查询
  const session = await requireRole(request, ['admin', 'agent', 'training_supervisor']);
  if (!session) return forbiddenResponse();

  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('worker_id');
    const userId = searchParams.get('user_id');

    if (!workerId && !userId) {
      return NextResponse.json({ error: '请提供worker_id或user_id参数' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询阿姨信息
    let query = supabase
      .from('workers')
      .select('id, name, credit_score, deposit, points, status, resume_review_status, created_at');
    
    if (workerId) {
      query = query.eq('id', workerId);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data: worker, error: workerError } = await query.maybeSingle();

    if (workerError || !worker) {
      return NextResponse.json({ error: '未找到该阿姨信息' }, { status: 404 });
    }

    // 查询评价
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating, content, reviewer_role, created_at')
      .eq('target_user_id', worker.id)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // 查询订单完成情况
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('worker_id', worker.id);

    // 计算综合评分
    const completedOrders = orders?.filter(o => o.status === 'completed').length ?? 0;
    const totalOrders = orders?.length ?? 0;
    const avgRating = reviews?.length
      ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / reviews.length
      : 0;

    // 信用等级计算
    const creditLevel = getCreditLevel(worker.credit_score);

    // 综合评估
    const assessment = {
      worker_id: worker.id,
      name: worker.name,
      credit_score: worker.credit_score,
      credit_level: creditLevel,
      deposit: worker.deposit,
      points: worker.points,
      status: worker.status,
      resume_review_status: worker.resume_review_status,
      member_since: worker.created_at,
      order_stats: {
        total: totalOrders,
        completed: completedOrders,
        completion_rate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      },
      review_stats: {
        total: reviews?.length ?? 0,
        avg_rating: Math.round(avgRating * 10) / 10,
        recent_reviews: reviews?.slice(0, 5) ?? [],
      },
      risk_assessment: getRiskAssessment(worker.credit_score, completedOrders, avgRating),
      // 外部征信数据（需对接真实征信API）
      external_credit: {
        available: false,
        message: '外部征信查询需对接人行征信/百行征信API，请联系管理员配置',
      },
    };

    return NextResponse.json({ success: true, data: assessment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[credit-check] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 根据诚信分计算信用等级
function getCreditLevel(score: number): string {
  if (score >= 1200) return 'AAA'; // 极优
  if (score >= 1100) return 'AA';  // 优秀
  if (score >= 1000) return 'A';  // 良好
  if (score >= 900) return 'B';   // 一般
  if (score >= 800) return 'C';   // 较差
  return 'D';                     // 极差/黑名单
}

// 风险评估
function getRiskAssessment(creditScore: number, completedOrders: number, avgRating: number): {
  level: string;
  description: string;
} {
  let riskScore = 0;

  // 诚信分权重50%
  if (creditScore >= 1100) riskScore += 50;
  else if (creditScore >= 1000) riskScore += 40;
  else if (creditScore >= 900) riskScore += 25;
  else riskScore += 10;

  // 完成订单权重30%
  if (completedOrders >= 10) riskScore += 30;
  else if (completedOrders >= 5) riskScore += 20;
  else if (completedOrders >= 2) riskScore += 10;

  // 平均评分权重20%
  if (avgRating >= 4.5) riskScore += 20;
  else if (avgRating >= 4.0) riskScore += 15;
  else if (avgRating >= 3.0) riskScore += 10;

  if (riskScore >= 80) return { level: '低风险', description: '该阿姨信用良好，历史表现优秀，推荐使用' };
  if (riskScore >= 60) return { level: '中低风险', description: '该阿姨信用一般，建议关注后续表现' };
  if (riskScore >= 40) return { level: '中风险', description: '该阿姨信用偏低，建议谨慎使用并加强监督' };
  return { level: '高风险', description: '该阿姨信用较差，不建议使用，建议加入观察名单' };
}

import { NextRequest, NextResponse } from 'next/server';
import { unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/referral/my-referrals — 我推荐的人列表
export async function GET(request: NextRequest) {
  const token = request.headers.get('x-session') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return unauthorizedResponse();

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 解析 JWT token
    const { parseAndVerifyToken } = await import('@/lib/auth-token');
    const userId = parseAndVerifyToken(token);
    if (!userId) {
      return NextResponse.json({ error: '无效 token' }, { status: 401 });
    }

    // 查我推荐的线索（阿姨意向）
    const { data: leadReferrals, error: leadErr } = await supabase
      .from('leads')
      .select('id, name, phone, gender, interest_type, intent_level, status, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (leadErr) console.error('[my-referrals leads] Error:', leadErr);

    // 查我推荐的客户线索
    const { data: customerReferrals, error: custErr } = await supabase
      .from('customer_leads')
      .select('id, name, phone, intention, status, created_at')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (custErr) console.error('[my-referrals customer_leads] Error:', custErr);

    // 查我的奖励
    const { data: rewards, error: rewardErr } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (rewardErr) console.error('[my-referrals rewards] Error:', rewardErr);

    const totalReward = (rewards || [])
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0);
    const totalPoints = (rewards || [])
      .filter(r => r.status === 'paid')
      .reduce((sum, r) => sum + (r.reward_points || 0), 0);

    return NextResponse.json({
      leadReferrals: leadReferrals || [],
      customerReferrals: customerReferrals || [],
      rewards: rewards || [],
      stats: {
        totalLeads: (leadReferrals || []).length,
        totalCustomers: (customerReferrals || []).length,
        convertedLeads: (leadReferrals || []).filter(l => l.status === 'converted' || l.status === 'signed').length,
        convertedCustomers: (customerReferrals || []).filter(l => l.status === 'converted').length,
        totalReward,
        totalPoints,
      },
    });
  } catch (error) {
    console.error('[my-referrals] Error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

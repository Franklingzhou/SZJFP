import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/referral-rewards — 奖励记录列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'leads:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const status = request.nextUrl.searchParams.get('status');
    const referrerId = request.nextUrl.searchParams.get('referrer_id');

    let query = supabase
      .from('referral_rewards')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (referrerId) query = query.eq('referrer_id', referrerId);

    const { data, error } = await query;

    if (error) {
      console.error('[referral-rewards GET] Error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 汇总
    const totalPending = (data || []).filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.reward_amount || 0), 0);
    const totalPaid = (data || []).filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.reward_amount || 0), 0);

    return NextResponse.json({ data, stats: { totalPending, totalPaid, totalCount: (data || []).length } });
  } catch (error) {
    console.error('[referral-rewards GET] Error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// POST /api/referral-rewards — 发放奖励（仅管理员）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'leads:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  if (session.role !== 'admin') {
    return forbiddenResponse('仅管理员可发放奖励');
  }

  try {
    const body = await request.json();
    const { reward_id, referrer_id, referred_name, source_type, source_id, reward_type, reward_amount, reward_points, triggered_by } = body as {
      reward_id?: string; referrer_id: string; referred_name?: string;
      source_type: string; source_id?: string; reward_type?: string;
      reward_amount?: number; reward_points?: number; triggered_by?: string;
    };

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    if (reward_id) {
      // 发放已有奖励
      const { error } = await supabase
        .from('referral_rewards')
        .update({ status: 'paid', paid_at: new Date().toISOString(), reviewed_by: session.userId })
        .eq('id', reward_id);

      if (error) {
        console.error('[referral-rewards POST pay] Error:', error);
        return NextResponse.json({ error: '发放失败' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: '奖励已发放' });
    }

    // 新建奖励记录
    const { data: referrer } = await supabase
      .from('users')
      .select('name')
      .eq('id', referrer_id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('referral_rewards')
      .insert({
        referrer_id,
        referrer_name: referrer?.name || '',
        referred_name: referred_name || '',
        source_type,
        source_id: source_id || null,
        reward_type: reward_type || 'commission',
        reward_amount: reward_amount || 0,
        reward_points: reward_points || 0,
        status: 'pending',
        triggered_by: triggered_by || '',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[referral-rewards POST insert] Error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[referral-rewards POST] Error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

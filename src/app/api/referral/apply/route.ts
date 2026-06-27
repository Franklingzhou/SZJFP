import { NextRequest, NextResponse } from 'next/server';

// POST /api/referral/apply — 注册时填入推荐码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referral_code, new_user_id, new_user_name, new_user_phone, intention } = body as {
      referral_code: string;
      new_user_id: string;
      new_user_name: string;
      new_user_phone?: string;
      intention: 'worker' | 'customer'; // 老乡的意向
    };

    if (!referral_code || !new_user_id || !intention) {
      return NextResponse.json({ error: '缺少必要参数: referral_code, new_user_id, intention' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查推荐人（需要角色来分流客户推荐）
    const { data: referrer, error: refErr } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('referral_code', referral_code)
      .maybeSingle();

    if (refErr || !referrer) {
      return NextResponse.json({ error: '无效的推荐码' }, { status: 400 });
    }

    // 不能推荐自己
    if (referrer.id === new_user_id) {
      return NextResponse.json({ error: '不能推荐自己' }, { status: 400 });
    }

    if (intention === 'worker') {
      // 管道1：入线索池
      const { error: leadErr } = await supabase
        .from('leads')
        .insert({
          name: new_user_name,
          phone: new_user_phone || '',
          source: 'referral',
          referrer_id: referrer.id,
          is_public: true,
          status: 'new',
        });

      if (leadErr) {
        console.error('[referral apply leads] Error:', leadErr);
        return NextResponse.json({ error: '创建线索失败' }, { status: 500 });
      }
    } else {
      // 管道2：客户推荐 → 经纪人推荐→直归个人，非经纪人推荐→进平台公海
      const isAgent = referrer.role === 'agent';
      const { error: custErr } = await supabase
        .from('customer_leads')
        .insert({
          name: new_user_name,
          phone: new_user_phone || '',
          source: 'referral',
          customer_type: isAgent ? 'personal' : 'platform',
          referrer_id: referrer.id,
          assigned_to: isAgent ? referrer.id : null,
          is_public: !isAgent,
          status: 'new',
        });

      if (custErr) {
        console.error('[referral apply customer_leads] Error:', custErr);
        return NextResponse.json({ error: '创建客户线索失败' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: intention === 'worker'
        ? '已加入阿姨线索池，招生老师会尽快联系您'
        : referrer.role === 'agent'
          ? '已加入推荐经纪人的客户列表，经纪人会尽快联系您'
          : '已加入平台客户公海，经纪人会尽快联系您',
      referrer_name: referrer.name,
    });
  } catch (error) {
    console.error('[referral apply] Error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

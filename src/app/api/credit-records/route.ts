import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/credit-records — 查询诚信记录列表
// admin可查询所有人的诚信记录；非admin角色只能查看自己的
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'credit:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');
    const event = searchParams.get('event');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    let query = supabase
      .from('credit_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500));

    // 非管理员角色：强制只查自己的诚信记录
    if (result.session.role !== 'admin') {
      query = query.eq('user_id', result.session.userId);
    } else if (userId) {
      // 管理员可按user_id筛选
      query = query.eq('user_id', userId);
    }
    if (event) query = query.ilike('event', `%${event}%`);

    const { data, error } = await query;

    if (error) {
      console.error('[credit-records GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[credit-records GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/credit-records — 手动调整诚信分（创建记录+更新用户总分）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'credit:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { user_id, event, score_change, related_order_id } = body as {
      user_id: string;
      event: string;
      score_change: number;
      related_order_id?: string;
    };

    if (!user_id || !event || score_change === undefined) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：user_id, event, score_change' }, { status: 400 });
    }

    const recordId = `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id: recordId,
      user_id,
      event,
      score_change: Math.round(score_change),
      related_order_id: related_order_id || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('credit_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('[credit-records POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 同步更新用户诚信分
    const { error: updateErr } = await supabase.rpc('add_credit_score', {
      p_user_id: user_id,
      p_score_change: Math.round(score_change),
    });

    if (updateErr) {
      // RPC 可能不存在，回退到直接更新
      const { data: userData } = await supabase
        .from('users')
        .select('credit_score')
        .eq('id', user_id)
        .maybeSingle();
      const currentScore = Number(userData?.credit_score) || 1000;
      const newScore = Math.max(0, currentScore + Math.round(score_change));
      await supabase
        .from('users')
        .update({ credit_score: newScore, updated_at: new Date().toISOString() })
        .eq('id', user_id);
      // 同步 workers 表
      await supabase
        .from('workers')
        .update({ credit_score: newScore, updated_at: new Date().toISOString() })
        .eq('user_id', user_id);
    }

    console.log('[credit-records] Created:', recordId, 'user=', user_id, 'change=', score_change);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[credit-records POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

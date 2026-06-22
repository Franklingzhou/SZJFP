import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/refunds — 查询退款列表（admin全看，其他角色看自己发起的）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'refunds:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const refundType = searchParams.get('refund_type');
    const relatedType = searchParams.get('related_type');
    const relatedId = searchParams.get('related_id');

    let query = supabase
      .from('refunds')
      .select('*')
      .order('created_at', { ascending: false });

    // admin看全部，其他角色只看自己发起的
    if (session.role !== 'admin') {
      query = query.eq('requester_id', session.userId);
    }

    if (status) query = query.eq('status', status);
    if (refundType) query = query.eq('refund_type', refundType);
    if (relatedType) query = query.eq('related_type', relatedType);
    if (relatedId) query = query.eq('related_id', relatedId);

    const { data, error } = await query;

    if (error) {
      console.error('[refunds GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[refunds GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/refunds — 发起退款
// 权限：招生(培训费)、经纪人(中介费)、运营(保证金)
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'refunds:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const {
      refund_type,
      amount,
      reason,
      related_type,
      related_id,
      related_name,
    } = body as {
      refund_type: string;
      amount: number;
      reason?: string;
      related_type: string;
      related_id: string;
      related_name?: string;
    };

    // 参数校验
    if (!refund_type || !['training_fee', 'agency_fee', 'deposit'].includes(refund_type)) {
      return NextResponse.json({ ok: false, error: '退款类型无效，可选: training_fee, agency_fee, deposit' }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: '退款金额必须大于0' }, { status: 400 });
    }
    if (!related_type || !['lead_contract', 'contract', 'order', 'worker'].includes(related_type)) {
      return NextResponse.json({ ok: false, error: '关联类型无效' }, { status: 400 });
    }
    if (!related_id) {
      return NextResponse.json({ ok: false, error: '缺少关联记录ID' }, { status: 400 });
    }

    // 角色权限校验：培训费→招生、中介费→经纪人、保证金→运营
    if (session.role !== 'admin') {
      if (refund_type === 'training_fee' && session.role !== 'recruiter') {
        return NextResponse.json({ ok: false, error: '培训费退款仅限招生发起' }, { status: 403 });
      }
      if (refund_type === 'agency_fee' && session.role !== 'agent') {
        return NextResponse.json({ ok: false, error: '中介费退款仅限经纪人发起' }, { status: 403 });
      }
      if (refund_type === 'deposit' && session.role !== 'worker_operator') {
        return NextResponse.json({ ok: false, error: '保证金退款仅限运营发起' }, { status: 403 });
      }
    }

    // 检查同一关联记录是否有进行中的退款
    const { data: pendingRefund } = await supabase
      .from('refunds')
      .select('id')
      .eq('related_type', related_type)
      .eq('related_id', related_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingRefund) {
      return NextResponse.json({
        ok: false,
        error: '该记录已有待审核的退款申请，请勿重复提交',
      }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('refunds')
      .insert({
        refund_type,
        amount,
        reason: reason || null,
        related_type,
        related_id,
        related_name: related_name || null,
        requester_id: session.userId,
        requester_role: session.role,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[refunds POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '发起退款失败';
    console.error('[refunds POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// 合同流程(v7)：招生发起(draft) → 学员签署(signed) → 主管确认到账(active=已签约)
// 驳回：rejected

// GET /api/contracts — 获取合同列表
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'contracts:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const status = request.nextUrl.searchParams.get('status');
    const partyAId = request.nextUrl.searchParams.get('party_a_id');
    const partyBId = request.nextUrl.searchParams.get('party_b_id');
    let type = request.nextUrl.searchParams.get('type');

    // 根据角色自动过滤合同类型
    // agent/customer → service, recruiter/ts → training, worker/admin → 不自动过滤
    if (!type) {
      if (session.role === 'agent' || session.role === 'customer') {
        type = 'service';
      } else if (session.role === 'recruiter' || session.role === 'training_supervisor') {
        type = 'training';
      }
    }

    let query = supabase
      .from('contracts')
      .select('id, title, type, party_a_id, party_b_id, party_b_name, party_b_phone, party_b_id_card, course_id, price, start_date, end_date, status, approved_by, approved_at, signed_at, created_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (partyAId) query = query.eq('party_a_id', partyAId);
    if (partyBId) query = query.eq('party_b_id', partyBId);
    if (type) query = query.eq('type', type);

    // 数据权限过滤：非admin只看自己相关的合同
    if (session.role !== 'admin') {
      if (session.role === 'agent') {
        // 经纪人只看中介合同
        query = query.eq('type', 'service').eq('party_a_id', session.userId);
      } else if (session.role === 'recruiter') {
        // 招生只看培训合同
        query = query.eq('type', 'training');
      } else if (session.role === 'training_supervisor') {
        // 培训主管只看培训合同
        query = query.eq('type', 'training');
      } else if (session.role === 'worker') {
        // 阿姨只看自己是乙方的合同
        query = query.eq('party_b_id', session.userId);
      } else if (session.role === 'customer') {
        // 客户只看自己是甲方的合同
        query = query.eq('party_a_id', session.userId);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[contracts GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'contracts');
    let filteredData = data || [];
    
    if (visibility === 'own') {
      // 只能看自己相关的合同
      filteredData = filteredData.filter(contract => 
        contract.party_a_id === session.userId || 
        contract.party_b_id === session.userId
      );
    }
    // 'all' 权限返回全部数据，'hidden' 返回空数组

    return NextResponse.json({ data: filteredData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[contracts GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/contracts — 创建合同（招生发起，状态=draft待学员签署）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    // 同时支持 type 和 contract_type 参数名
    const { title, type, contract_type, party_b_name, party_b_phone, party_b_id_card, party_a_id, course_id, price, start_date, end_date } = body as {
      title: string;
      type?: string;
      contract_type?: string;
      party_b_name: string;
      party_b_phone: string;
      party_b_id_card?: string;
      party_a_id?: string;
      course_id?: string;
      price?: number;
      start_date?: string;
      end_date?: string;
    };

    // 优先使用 type，fallback 到 contract_type
    const finalType = type || contract_type;
    if (!title || !finalType) {
      return NextResponse.json({ error: '缺少必要参数(title, type或contract_type)' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        title,
        type: finalType,
        party_a_id: party_a_id || session.userId,
        party_b_id: null,
        party_b_name,
        party_b_phone,
        party_b_id_card: party_b_id_card || null,
        course_id: course_id || null,
        price: price || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: 'draft', // 招生发起，待学员签署
      })
      .select()
      .single();

    if (error) {
      console.error('[contracts POST] DB error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[contracts POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/contracts — 更新合同
// v7状态流转：draft→signed(学员签署) → signed→active(主管确认到账) / signed→rejected(主管驳回)
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { id, title, type, party_b_name, party_b_phone, party_b_id_card, party_a_id, party_b_id, course_id, price, start_date, end_date, status, approved_by, approved_at, signed_at } = body as {
      id: string;
      title?: string;
      type?: string;
      party_b_name?: string;
      party_b_phone?: string;
      party_b_id_card?: string;
      party_a_id?: string;
      party_b_id?: string;
      course_id?: string;
      price?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
      approved_by?: string;
      approved_at?: string;
      signed_at?: string;
    };

    if (!id) {
      return NextResponse.json({ error: '缺少合同ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // v7: 状态流转校验
    if (status) {
      const { data: current } = await supabase
        .from('contracts')
        .select('id, status')
        .eq('id', id)
        .single();

      if (current) {
        const validTransitions: Record<string, string[]> = {
          draft: ['signed', 'rejected'],           // 招生发起 → 学员签署 或 驳回
          signed: ['active', 'rejected'],          // 学员已签 → 主管确认到账 或 驳回
          active: [],                               // 已签约，不可再改
          rejected: ['draft'],                      // 驳回可重新发起
        };
        const allowed = validTransitions[current.status] || [];
        if (!allowed.includes(status)) {
          return NextResponse.json({
            error: `不允许从"${current.status}"变更为"${status}"，合法流转：${allowed.join('/') || '无'}`,
          }, { status: 400 });
        }
      }

      // 学员签署时自动填signed_at
      if (status === 'signed') {
        if (!signed_at) {
          body.signed_at = new Date().toISOString();
        }
        // 如果合同还没有party_b_id，自动关联当前用户
        if (!party_b_id) {
          body.party_b_id = session.userId;
        }
      }
      // 主管确认到账时自动填approved_by和approved_at
      if (status === 'active') {
        body.approved_by = session.userId;
        if (!approved_at) body.approved_at = new Date().toISOString();
      }
    }

    // 显式白名单更新
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (type !== undefined) updates.type = type;
    if (party_b_name !== undefined) updates.party_b_name = party_b_name;
    if (party_b_phone !== undefined) updates.party_b_phone = party_b_phone;
    if (party_b_id_card !== undefined) updates.party_b_id_card = party_b_id_card;
    if (party_a_id !== undefined) updates.party_a_id = party_a_id;
    if (party_b_id !== undefined || body.party_b_id !== undefined) updates.party_b_id = party_b_id || body.party_b_id;
    if (course_id !== undefined) updates.course_id = course_id;
    if (price !== undefined) updates.price = price;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (status !== undefined) updates.status = status;
    if (approved_by !== undefined || body.approved_by !== undefined) updates.approved_by = approved_by || body.approved_by;
    if (approved_at !== undefined || body.approved_at !== undefined) updates.approved_at = approved_at || body.approved_at;
    if (signed_at !== undefined || body.signed_at !== undefined) updates.signed_at = signed_at || body.signed_at;

    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[contracts PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '未找到该合同' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[contracts PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

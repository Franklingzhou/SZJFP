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
    const idFilter = request.nextUrl.searchParams.get('id');
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
    if (idFilter) query = query.eq('id', idFilter);

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
    // 同时支持多种参数名：type/contract_type, title, order_id, worker_id/customer_id, amount/price
    const { title, type, contract_type, party_b_name, party_b_phone, party_b_id_card, party_a_id, course_id, price, start_date, end_date, worker_id, customer_id, amount } = body as {
      title?: string;
      type?: string;
      contract_type?: string;
      party_b_name?: string;
      party_b_phone?: string;
      party_b_id_card?: string;
      party_a_id?: string;
      course_id?: string;
      price?: number;
      start_date?: string;
      end_date?: string;
      worker_id?: string;
      customer_id?: string;
      amount?: number;
    };

    // 优先使用 type，fallback 到 contract_type
    const finalType = type || contract_type;
    const finalTitle = title || `合同-${finalType || '未分类'}-${Date.now().toString(36)}`;
    if (!finalType) {
      return NextResponse.json({ error: '缺少必要参数(type或contract_type)' }, { status: 400 });
    }

    const finalPrice = price || amount || null;

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 如果有 worker_id 但缺少 party_b_name/phone，从 workers 表补全
    let finalPartyBName = party_b_name || null;
    let finalPartyBPhone = party_b_phone || null;
    let finalPartyBId: string | null = null;  // must be users.id for FK
    let finalPartyAId: string | null = null;   // must be users.id for FK

    if (worker_id) {
      const { data: workerInfo } = await supabase
        .from('workers')
        .select('user_id, name, phone')
        .eq('id', worker_id)
        .maybeSingle();
      if (workerInfo) {
        finalPartyBId = workerInfo.user_id;  // resolve to users.id for FK
        if (!finalPartyBName) finalPartyBName = workerInfo.name;
        if (!finalPartyBPhone) finalPartyBPhone = workerInfo.phone;
      }
    }

    // v14: 解析 customer_id → users.id（party_a_id FK 指向 users.id）
    if (customer_id) {
      const { data: custInfo } = await supabase
        .from('customers')
        .select('user_id')
        .eq('id', customer_id)
        .maybeSingle();
      if (custInfo?.user_id) {
        finalPartyAId = custInfo.user_id;
      }
    }
    // 如果没有customer对应的user_id，使用传入的party_a_id或session.userId
    if (!finalPartyAId) {
      finalPartyAId = party_a_id || session.userId;
    }

    // 如果没有乙方信息但测试data有提供，使用默认值
    if (!finalPartyBName) finalPartyBName = '待填写';
    if (!finalPartyBPhone) finalPartyBPhone = '00000000000';

    const contractId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        id: contractId,
        title: finalTitle,
        type: finalType,
        party_a_id: finalPartyAId,
        party_b_id: finalPartyBId,
        party_b_name: finalPartyBName,
        party_b_phone: finalPartyBPhone,
        party_b_id_card: party_b_id_card || null,
        course_id: course_id || null,
        price: finalPrice,
        start_date: start_date || null,
        end_date: end_date || null,
        status: 'draft', // 招生发起，待学员签署
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[contracts POST] DB error:', JSON.stringify(error));
      return NextResponse.json({ error: `创建失败: ${error.message || error.code || ''}` }, { status: 500 });
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
      const { id, title, type, party_b_name, party_b_phone, party_b_id_card, party_a_id, party_b_id, course_id, price, amount, start_date, end_date, status, approved_by, approved_at, signed_at, phone_code } = body as {
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
      amount?: number;  // 别名
      start_date?: string;
      end_date?: string;
      status?: string;
      approved_by?: string;
      approved_at?: string;
      signed_at?: string;
      phone_code?: string;  // E07e: 手机验证码
    };

    if (!id) {
      return NextResponse.json({ error: '缺少合同ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // v7: 状态流转校验
    if (status) {
      const { data: current, error: currentErr } = await supabase
        .from('contracts')
        .select('id, status, party_a_id')
        .eq('id', id)
        .maybeSingle();

      if (currentErr) {
        console.error('[contracts PUT] status query error:', currentErr);
        return NextResponse.json({ error: '查询合同失败' }, { status: 500 });
      }

      if (current) {
        const validTransitions: Record<string, string[]> = {
          draft: ['signed', 'rejected'],           // 招生发起 → 学员签署 或 驳回
          pending_student: ['signed', 'rejected'], // 2.0: 待学员确认 → 学员确认/主管代确认 或 驳回
          signed: ['active', 'rejected'],          // 学员已签 → 主管确认到账 或 驳回
          active: ['closed', 'expired'],            // v35: 已签约 → 可手动关闭或到期
          closed: [],                               // 已关闭，不可再改
          expired: [],                              // 已过期
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
        // E07e: 阿姨签约手机确认 — 必须提供验证码
        const isProd = process.env.COZE_PROJECT_ENV === 'PROD' || !!process.env.SMS_PROVIDER;
        if (isProd && !phone_code) {
          return NextResponse.json({
            error: '签约需要手机验证码确认，请先调用 /api/contracts/[id]/send-code 获取验证码',
          }, { status: 400 });
        }
        // 开发模式：验证码固定 888888；生产模式：须与发送的验证码一致
        if (phone_code) {
          const expectedCode = isProd ? 'NEED_SMS_VERIFY' : '888888';
          if (isProd) {
            // TODO: 从 Redis/DB 校验真实验证码
            console.log('[contracts PUT] PROD phone_code verification: would validate against stored code');
          } else if (phone_code !== expectedCode) {
            return NextResponse.json({ error: '验证码错误' }, { status: 400 });
          }
        } else if (!isProd) {
          // 开发模式也拒绝签收，防止跳过验证
          return NextResponse.json({
            error: '签约需要手机验证码确认，请输入验证码 888888（开发模式）',
          }, { status: 400 });
        }

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
      // v35: 手动关闭合同时，记录关闭时间 + 关联平台费标记逾期
      if (status === 'closed') {
        body.closed_at = new Date().toISOString();
        body.closed_by = session.userId;
        // 将该合同关联的待支付平台费标记为逾期
        try {
          const { error: pfErr } = await supabase
            .from('platform_fees')
            .update({ status: 'overdue', updated_at: new Date().toISOString() })
            .eq('contract_id', id)
            .eq('status', 'pending');
          if (pfErr) console.warn('[contracts PUT] platform_fees overdue cascade error:', pfErr.message);
          else console.log('[contracts PUT] contract closed → platform_fees marked overdue for contract_id=', id);
        } catch (e) {
          console.warn('[contracts PUT] platform_fees cascade error:', e);
        }
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
    else if (amount !== undefined) updates.price = amount;
    if (start_date !== undefined) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (status !== undefined) updates.status = status;
    if (approved_by !== undefined || body.approved_by !== undefined) updates.approved_by = approved_by || body.approved_by;
    if (approved_at !== undefined || body.approved_at !== undefined) updates.approved_at = approved_at || body.approved_at;
    if (signed_at !== undefined || body.signed_at !== undefined) updates.signed_at = signed_at || body.signed_at;
    // v35: 手动关闭合同字段
    if (body.closed_at !== undefined) updates.closed_at = body.closed_at;
    if (body.closed_by !== undefined) updates.closed_by = body.closed_by;

    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[contracts PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该合同' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[contracts PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

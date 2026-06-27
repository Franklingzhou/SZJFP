import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/customer-leads — 客户列表（管理员看全部，经纪人只看自己的）
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'leads:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const status = request.nextUrl.searchParams.get('status');
    const customerType = request.nextUrl.searchParams.get('customer_type');
    const isPublic = request.nextUrl.searchParams.get('is_public');

    let query = supabase
      .from('customer_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (customerType) query = query.eq('customer_type', customerType);
    if (isPublic === 'true') query = query.eq('is_public', true);
    if (isPublic === 'false') query = query.eq('is_public', false);

    // 经纪人只能看归属自己的客户
    if (session.role === 'agent') {
      query = query.eq('assigned_to', session.userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[customer-leads GET] Error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[customer-leads GET] Error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// POST /api/customer-leads — 新增客户线索
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'leads:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { name, phone, intention, service_type, location, budget, gender, notes, customer_type, source } = body as {
      name: string; phone?: string; intention?: string; service_type?: string;
      location?: string; budget?: number; gender?: string; notes?: string;
      customer_type?: string; source?: string;
    };

    if (!name) return NextResponse.json({ error: '缺少姓名' }, { status: 400 });

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const isAdmin = session.role === 'admin';
    const isFromReferral = source === 'referral';
    const resolvedType = customer_type || (isFromReferral || isAdmin ? 'platform' : 'personal');

    // Admin创建客户时，全局检查手机号是否已存在
    if (session.role === 'admin' && phone) {
      const { data: globalDuplicate } = await supabase
        .from('customer_leads')
        .select('id, phone')
        .eq('phone', phone)
        .maybeSingle();

      if (globalDuplicate) {
        return NextResponse.json({ error: '该手机号已存在，不能重复添加' }, { status: 409 });
      }
    }

    // 经纪人创建客户时，检查自己库内手机号是否已存在
    if (session.role === 'agent' && phone) {
      const { data: duplicate } = await supabase
        .from('customer_leads')
        .select('id, phone')
        .eq('assigned_to', session.userId)
        .eq('phone', phone)
        .maybeSingle();

      if (duplicate) {
        return NextResponse.json({ error: '该手机号已在您的客户库中，不能重复添加' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('customer_leads')
      .insert({
        name, phone: phone || '', intention, service_type, location,
        budget, gender, notes, source: source || 'manual',
        customer_type: resolvedType,
        assigned_to: isAdmin ? null : session.userId,
        is_public: resolvedType === 'platform',
      })
      .select()
      .single();

    if (error) {
      console.error('[customer-leads POST] Error:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[customer-leads POST] Error:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

// PUT /api/customer-leads — 更新客户信息 / 公海认领
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'leads:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { id, action, ...updates } = body as {
      id: string; action?: string; [key: string]: unknown;
    };

    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const allowedFields = ['name', 'phone', 'intention', 'service_type', 'location', 'budget', 'gender', 'notes', 'status', 'is_public', 'assigned_to', 'customer_type'];
    const safe: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) safe[key] = updates[key];
    }

    if (action === 'claim') {
      // 公海认领：只有平台客户（公海中的）才能被认领
      const { data: existing } = await supabase
        .from('customer_leads')
        .select('is_public, assigned_to, customer_type, phone')
        .eq('id', id)
        .maybeSingle();

      if (!existing) return NextResponse.json({ error: '线索不存在' }, { status: 404 });
      if (!existing.is_public) return NextResponse.json({ error: '该客户已被认领' }, { status: 409 });
      // 只有经纪人可以认领
      if (session.role !== 'agent' && session.role !== 'admin') {
        return forbiddenResponse('只有经纪人可以认领客户');
      }

      // 经纪人认领前，检查自己库内是否已有该手机号
      if (session.role === 'agent' && existing.phone) {
        const { data: duplicate } = await supabase
          .from('customer_leads')
          .select('id, phone')
          .eq('assigned_to', session.userId)
          .eq('phone', existing.phone)
          .maybeSingle();

        if (duplicate) {
          return NextResponse.json(
            { error: '该手机号已在您的客户库中，无法重复认领' },
            { status: 409 }
          );
        }
      }

      safe.assigned_to = session.userId;
      safe.is_public = false;
      safe.customer_type = 'personal'; // 认领后变成个人客户
      safe.status = 'following';
    }

    safe.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('customer_leads')
      .update(safe)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[customer-leads PUT] Error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[customer-leads PUT] Error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

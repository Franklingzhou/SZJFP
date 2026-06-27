import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getDataVisibilitySync } from '@/lib/data-permissions';

// GET /api/leads — 获取线索列表
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
    const recruiterId = request.nextUrl.searchParams.get('recruiter_id');
    const level = request.nextUrl.searchParams.get('level');

    // v10: 先尝试完整列查询，失败则用基础列（兼容迁移状态）
    const fullColumns = 'id, name, phone, age, origin, intention, source, gender, level, is_public, status, note, recruiter_id, signed_at, signed_by, sign_worker_id, want_training, created_at, updated_at';
    const basicColumns = 'id, name, phone, source, gender, is_public, status, recruiter_id, created_at, updated_at';
    
    // 先试完整列
    let { data, error } = await supabase
      .from('leads')
      .select(fullColumns)
      .order('created_at', { ascending: false });

    // 如果完整列失败（可能缺少迁移列），用基础列重试
    if (error) {
      console.warn('[leads GET] full columns failed, falling back to basic:', error.message);
      const retry = await supabase
        .from('leads')
        .select(basicColumns)
        .order('created_at', { ascending: false });
      // 基础列回退（兼容旧DB schema），类型断言因字段不完整
      data = retry.data as any as typeof data;
      error = retry.error;
    }

    if (error) {
      console.error('[leads GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 过滤逻辑：一律走宽松 Record 类型，再用 any 断解释回 data 类型
    if (status) {
      const baseData = (data || []) as Record<string, unknown>[];
      data = baseData.filter(d => d.status === status) as unknown as typeof data;
    }
    if (recruiterId) {
      const baseData = (data || []) as Record<string, unknown>[];
      data = baseData.filter(d => d.recruiter_id === recruiterId) as unknown as typeof data;
    }
    if (level) {
      const baseData = (data || []) as Record<string, unknown>[];
      data = baseData.filter(d => d.level === level) as unknown as typeof data;
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'leads');
    let filteredData = data || [];
    
    if (visibility === 'own') {
      // 只能看自己录入/负责的线索
      filteredData = filteredData.filter(lead => 
        (lead as Record<string, unknown>).recruiter_id === session.userId
      );
    }
    // 'all' 权限返回全部数据，'hidden' 返回空数组

    return NextResponse.json({ data: filteredData });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[leads GET] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/leads — 新增线索
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'leads:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { name, phone, age, origin, intention, source, gender, level, recruiter_id, recruiter_name, remark, note } = body as {
      name: string; phone?: string; age?: number; origin?: string; intention?: string;
      source?: string; gender?: string; level?: string; recruiter_id?: string; recruiter_name?: string; remark?: string; note?: string;
    };

    if (!name) {
      return NextResponse.json({ error: '缺少必要参数(姓名)' }, { status: 400 });
    }
    // v13: validate max name length to avoid DB varchar constraint errors
    if (name.length > 50) {
      return NextResponse.json({ error: '姓名长度不能超过50个字符' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 防撞单检查：手机号已存在则拒绝
    if (phone) {
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, name')
        .eq('phone', phone)
        .maybeSingle();
      if (existingLead) {
        return NextResponse.json({ 
          error: '该手机号已存在线索中', 
          code: 'DUPLICATE_PHONE',
          existing: existingLead 
        }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name, phone: phone || '', age, origin, intention, source: source || 'manual', gender,
        level: level || 'C',
        status: 'new',
        recruiter_id: recruiter_id || session.userId,
        note: remark || note || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[leads POST] DB error:', error);
      return NextResponse.json({ error: `创建失败: ${error.message || '数据库错误'}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    console.error('[leads POST] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/leads — 更新线索
// v9: 加显式字段白名单，禁止{...updates}直接写入
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'leads:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;
  try {
    const body = await request.json();
    const { id } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ error: '缺少线索ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 显式白名单：只允许更新以下字段（含签约相关字段）
    const allowedFields = ['name', 'phone', 'age', 'origin', 'intention', 'source', 'gender', 'level', 'is_public', 'status', 'note', 'recruiter_id', 'want_training', 'signed_at', 'signed_by', 'sign_worker_id'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeUpdates[key] = body[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

    // 2.0: 校验状态值合法性
    const VALID_LEAD_STATUSES = ['new', 'following', 'signed', 'converted', 'lost'];
    if (safeUpdates.status && !VALID_LEAD_STATUSES.includes(safeUpdates.status as string)) {
      return NextResponse.json({ error: `无效的状态值，合法值：${VALID_LEAD_STATUSES.join(', ')}` }, { status: 400 });
    }

    // 签约状态必须关联阿姨（防御 BUG-3 反复）
    if (safeUpdates.status === 'signed' && !safeUpdates.sign_worker_id) {
      return NextResponse.json({ error: '签约状态必须关联阿姨(sign_worker_id)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leads')
      .update(safeUpdates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[leads PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: '未找到该线索' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[leads PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

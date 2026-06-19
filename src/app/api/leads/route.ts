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

    let query = supabase
      .from('leads')
      .select('id, name, phone, age, origin, intention, source, gender, level, is_public, status, note, recruiter_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (recruiterId) query = query.eq('recruiter_id', recruiterId);
    if (level) query = query.eq('level', level);

    const { data, error } = await query;

    if (error) {
      console.error('[leads GET] DB error:', error);
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    // 应用数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'leads');
    let filteredData = data || [];
    
    if (visibility === 'own') {
      // 只能看自己录入/负责的线索
      filteredData = filteredData.filter(lead => lead.recruiter_id === session.userId);
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

    // 显式白名单：只允许更新以下字段
    const allowedFields = ['name', 'phone', 'age', 'origin', 'intention', 'source', 'gender', 'level', 'is_public', 'status', 'note', 'recruiter_id'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) safeUpdates[key] = body[key];
    }
    safeUpdates.updated_at = new Date().toISOString();

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

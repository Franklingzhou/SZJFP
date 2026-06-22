import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/certificates — 获取证书列表
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'certificates:read');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get('user_id');
    const workerId = searchParams.get('worker_id');
    const courseId = searchParams.get('course_id');

    let query = supabase
      .from('certificates')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (workerId) query = query.eq('worker_id', workerId);
    if (courseId) query = query.eq('course_id', courseId);

    const { data, error } = await query;

    if (error) {
      // 表不存在 → 返回空列表（等待迁移）
      if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.warn('[certificates GET] Table not yet created, returning empty');
        return NextResponse.json({ ok: true, data: [] });
      }
      console.error('[certificates GET] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    console.error('[certificates GET] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/certificates — 颁发证书
export async function POST(request: NextRequest) {
  const session = await checkPermission(request, 'certificates:write');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { user_id, course_id, title, certificate_url } = body as {
      user_id: string;
      course_id: string;
      title: string;
      certificate_url?: string;
    };

    if (!user_id || !course_id || !title) {
      return NextResponse.json({ ok: false, error: '缺少必填字段：user_id, course_id, title' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('certificates')
      .insert({
        user_id,
        course_id,
        title,
        certificate_url: certificate_url || null,
        issued_by: session.userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[certificates POST] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '颁发失败';
    console.error('[certificates POST] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/certificates — 更新证书
export async function PUT(request: NextRequest) {
  const session = await checkPermission(request, 'certificates:write');
  if (!session) return unauthorizedResponse();

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { id, ...updates } = body as { id: string; [key: string]: unknown };

    if (!id) {
      return NextResponse.json({ ok: false, error: '缺少证书ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('certificates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[certificates PUT] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[certificates PUT] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getDataVisibilitySync } from '@/lib/data-permissions';

/**
 * 培训线索 API — 专门管理带培训意向的线索
 *
 * GET  /api/training-leads — 查询培训线索（want_training=true 或 status=signed/converted）
 * POST /api/training-leads — 创建培训线索（自动设 want_training=true，可从普通线索转化）
 *
 * 权限：training_leads:read / training_leads:write
 *       （admin, recruiter, training_supervisor）
 */

// GET /api/training-leads — 查询培训线索
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'training_leads:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const recruiterId = searchParams.get('recruiter_id');
    const level = searchParams.get('level');
    const wantTraining = searchParams.get('want_training');

    const supabase = getSupabaseClient();

    // 查询线索表，过滤培训相关
    const fullColumns = 'id, name, phone, age, origin, intention, source, gender, level, is_public, status, note, recruiter_id, signed_at, signed_by, sign_worker_id, want_training, created_at, updated_at';
    const basicColumns = 'id, name, phone, source, gender, is_public, status, recruiter_id, created_at, updated_at';

    let { data, error } = await supabase
      .from('leads')
      .select(fullColumns)
      .order('created_at', { ascending: false });

    if (error) {
      const retry = await supabase
        .from('leads')
        .select(basicColumns)
        .order('created_at', { ascending: false });
      data = retry.data as any as typeof data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 过滤：只保留培训相关线索
    const allLeads = (data || []) as Record<string, unknown>[];
    let filtered = allLeads.filter(lead => {
      const wt = lead.want_training;
      const st = lead.status;
      // 满足任一条件即为培训线索
      if (wt === true || wt === 'true') return true;
      if (st === 'signed' || st === 'converted') return true;
      return false;
    });

    // 额外筛选
    if (status) {
      filtered = filtered.filter(l => l.status === status);
    }
    if (recruiterId) {
      filtered = filtered.filter(l => l.recruiter_id === recruiterId);
    }
    if (level) {
      filtered = filtered.filter(l => l.level === level);
    }
    if (wantTraining === 'true') {
      filtered = filtered.filter(l => l.want_training === true || l.want_training === 'true');
    }
    if (wantTraining === 'false') {
      filtered = filtered.filter(l => !l.want_training || l.want_training === false || l.want_training === 'false');
    }

    // 数据权限过滤
    const visibility = getDataVisibilitySync(session.role, 'leads');
    if (visibility === 'own') {
      filtered = filtered.filter(l => l.recruiter_id === session.userId);
    }

    return NextResponse.json({
      ok: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// POST /api/training-leads — 创建培训线索
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'training_leads:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const {
      name, phone, age, origin, intention, source, gender, level,
      recruiter_id, note, remark,
      // 从已有线索 ID 转化
      lead_id,
    } = body as {
      name?: string; phone?: string; age?: number; origin?: string; intention?: string;
      source?: string; gender?: string; level?: string; recruiter_id?: string;
      note?: string; remark?: string; lead_id?: string;
    };

    const supabase = getSupabaseClient();

    // 模式1：从已有线索转化为培训线索
    if (lead_id && !name) {
      const { data: existing, error: lookupErr } = await supabase
        .from('leads')
        .select('id, name, want_training, status')
        .eq('id', lead_id)
        .single();

      if (lookupErr || !existing) {
        return NextResponse.json({ ok: false, error: '线索不存在' }, { status: 404 });
      }

      const { data: updated, error: updateErr } = await supabase
        .from('leads')
        .update({
          want_training: true,
          status: existing.status === 'new' ? 'following' : existing.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead_id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        success: true,
        data: updated,
        message: '已将线索转化为培训线索',
      });
    }

    // 模式2：新建培训线索
    if (!name) {
      return NextResponse.json({ ok: false, error: '缺少姓名' }, { status: 400 });
    }
    if (name.length > 50) {
      return NextResponse.json({ ok: false, error: '姓名长度不能超过50个字符' }, { status: 400 });
    }

    // 防撞单
    if (phone) {
      const { data: dup } = await supabase
        .from('leads')
        .select('id, name')
        .eq('phone', phone)
        .maybeSingle();
      if (dup) {
        return NextResponse.json({
          ok: false,
          error: '该手机号已存在线索中',
          code: 'DUPLICATE_PHONE',
          existing: dup,
        }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name,
        phone: phone || '',
        age: age || null,
        origin: origin || null,
        intention: intention || null,
        source: source || 'manual',
        gender: gender || null,
        level: level || 'C',
        status: 'new',
        recruiter_id: recruiter_id || session.userId,
        note: note || remark || null,
        want_training: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      data,
      message: '已创建培训线索',
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '创建失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

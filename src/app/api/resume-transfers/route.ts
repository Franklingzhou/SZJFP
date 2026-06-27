import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';

// POST /api/resume-transfers — 简历转移（阿姨从一个经纪人/招生代理转给另一个）
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'workers:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const body = await request.json();
    const { worker_id, target_user_id, reason } = body as {
      worker_id: string;
      target_user_id: string;
      reason?: string;
    };

    if (!worker_id || !target_user_id) {
      return NextResponse.json({ error: '缺少必填参数: worker_id, target_user_id' }, { status: 400 });
    }

    if (worker_id === target_user_id) {
      return NextResponse.json({ error: '不能转移给自己' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 校验阿姨存在
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, creator_id, maintainer_id, name')
      .eq('id', worker_id)
      .maybeSingle();

    if (workerErr || !worker) {
      return NextResponse.json({ error: '阿姨不存在' }, { status: 404 });
    }

    // 校验目标用户存在且角色合法
    const { data: targetUser, error: targetErr } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', target_user_id)
      .maybeSingle();

    if (targetErr || !targetUser) {
      return NextResponse.json({ error: '目标用户不存在' }, { status: 404 });
    }

    const validTargetRoles = ['agent', 'recruiter', 'worker_operator', 'training_supervisor'];
    if (!validTargetRoles.includes(targetUser.role)) {
      return NextResponse.json({ error: `目标用户角色 ${targetUser.role} 不接受简历转移` }, { status: 400 });
    }

    // 非admin只能转移自己名下的
    if (session.role !== 'admin') {
      const wData = worker as Record<string, unknown>;
      const isOwner = wData.creator_id === session.userId || wData.maintainer_id === session.userId;
      if (!isOwner) {
        return forbiddenResponse('只能转移自己名下的阿姨');
      }
    }

    // 执行转移：更新 maintainer_id（维护人变更）
    const { data, error } = await supabase
      .from('workers')
      .update({
        maintainer_id: target_user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', worker_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '转移失败', detail: error.message }, { status: 500 });
    }

    // 记录转移日志到 operation_logs
    await supabase.from('operation_logs').insert({
      action: 'resume_transfer',
      operator_id: session.userId,
      target_type: 'worker',
      target_id: worker_id,
      detail: JSON.stringify({
        worker_name: (worker as Record<string, unknown>).name,
        from_user_id: (worker as Record<string, unknown>).maintainer_id || (worker as Record<string, unknown>).creator_id,
        to_user_id: target_user_id,
        to_user_name: targetUser.name,
        reason: reason || null,
      }),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        transfer_from: (worker as Record<string, unknown>).maintainer_id || (worker as Record<string, unknown>).creator_id,
        transfer_to: target_user_id,
        target_name: targetUser.name,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '转移失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/resume-transfers — 查询转移记录
export async function GET(request: NextRequest) {
  const session = await checkPermissionDetailed(request, 'workers:read');
  if (!session.ok) {
    if (session.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('operation_logs')
      .select('*')
      .eq('action', 'resume_transfer')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

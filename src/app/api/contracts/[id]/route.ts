import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// PUT /api/contracts/[id] — 更新合同状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'contracts:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '缺少合同ID' }, { status: 400 });
    }

    const body = await request.json();
    const { status, approved_by, approved_at, signed_at, reject_reason } = body;

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查询当前合同状态
    const { data: currentContract } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('id', id)
      .single();

    if (!currentContract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    // 状态流转校验
    const validTransitions: Record<string, string[]> = {
      draft: ['signed', 'rejected'],
      signed: ['active', 'rejected'],
      active: [],
      rejected: ['draft'],
    };

    if (status && !validTransitions[currentContract.status]?.includes(status)) {
      return NextResponse.json({
        error: `不允许从"${currentContract.status}"变更为"${status}"`,
        allowed: validTransitions[currentContract.status] || [],
      }, { status: 400 });
    }

    // 构建更新数据
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (approved_by !== undefined) updates.approved_by = approved_by;
    if (approved_at !== undefined) updates.approved_at = approved_at;
    if (signed_at !== undefined) updates.signed_at = signed_at;
    if (reject_reason !== undefined) updates.reject_reason = reject_reason;

    // 签约时自动设置signed_at
    if (status === 'signed' && !signed_at) {
      updates.signed_at = new Date().toISOString();
    }

    // 激活时自动设置approved_by和approved_at
    if (status === 'active') {
      updates.approved_by = approved_by || session.userId;
      if (!approved_at) updates.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('contracts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[contracts PUT] DB error:', error);
      return NextResponse.json({ error: '更新失败', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    console.error('[contracts PUT] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/contracts/[id] — 部分更新合同
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

// GET /api/contracts/[id] — 获取单个合同详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'contracts:read');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: '缺少合同ID' }, { status: 400 });
    }

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
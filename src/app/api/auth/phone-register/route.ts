import { NextRequest, NextResponse } from 'next/server';

// 手机号注册新用户
// v7: 注册时同时创建角色表记录（workers/agents等）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, role, name } = body as { phone: string; role: string; name?: string };

    if (!phone || !role) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const validRoles = ['worker', 'agent', 'recruiter', 'instructor', 'customer', 'training_supervisor', 'worker_operator'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: '无效的角色类型' }, { status: 400 });
    }

    const roleLabels: Record<string, string> = {
      worker: '新阿姨',
      agent: '新经纪人',
      recruiter: '新招生',
      instructor: '新讲师',
      customer: '新客户',
      training_supervisor: '新主管',
      worker_operator: '新运营',
    };

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 检查该手机号是否已注册
    const { data: existing } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      // 已有该手机号的用户，直接返回
      const token = generateToken(existing.id);
      return NextResponse.json({
        success: true,
        user: {
          id: existing.id,
          name: existing.name,
          phone: existing.phone,
          role: existing.role,
          reviewStatus: existing.review_status,
        },
        token,
      });
    }

    // 外部角色（阿姨/客户）注册自动通过，内部角色需管理员审核
    const externalRoles = ['worker', 'customer'];
    const isExternal = externalRoles.includes(role);
    const autoApproved = isExternal;
    const initReviewStatus = autoApproved ? 'approved' : 'pending';
    const initIsActive = autoApproved;

    // 创建新用户
    const newUserId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newUserName = name || roleLabels[role] || '新用户';

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        name: newUserName,
        phone,
        role,
        review_status: initReviewStatus,
        is_active: initIsActive,
        register_source: 'self',
        password_hash: '123456',
      })
      .select('id, name, phone, role, review_status')
      .single();

    if (error) {
      console.error('[phone-register] DB insert error:', error);
      return NextResponse.json({ error: '注册失败，请重试' }, { status: 500 });
    }

    // v7: 同时创建角色表记录
    try {
      if (role === 'worker') {
        await supabase.from('workers').insert({
          id: newUserId,
          name: newUserName,
          phone,
          status: isExternal ? 'available' : 'pending',
          resume_review_status: isExternal ? 'none' : 'pending',
          created_at: new Date().toISOString(),
        });
        console.log('[phone-register] Created worker record:', newUserId);
      }
    } catch (roleErr) {
      console.error('[phone-register] Role record creation failed (non-fatal):', roleErr);
      // 角色记录创建失败不阻断注册流程
    }

    // 外部角色自动通过，直接返回token；内部角色需等待审核
    if (autoApproved) {
      const token = generateToken(newUserId);
      return NextResponse.json({
        success: true,
        needs_review: false,
        user: {
          id: newUserId,
          name: newUserName,
          phone,
          role,
          reviewStatus: initReviewStatus,
        },
        token,
      });
    }

    return NextResponse.json({
      success: true,
      needs_review: true,
      message: '注册成功，请等待管理员审核',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '注册失败';
    console.error('[phone-register] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  const timestamp = Date.now();
  const hash = Buffer.from(`${userId}:${timestamp}:${secret}`).toString('base64url');
  return Buffer.from(`${userId}:${timestamp}`).toString('base64url') + '.' + hash.substring(0, 16);
}

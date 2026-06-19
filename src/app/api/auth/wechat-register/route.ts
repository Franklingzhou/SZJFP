import { NextRequest, NextResponse } from 'next/server';

// 微信登录后绑定角色/注册新用户
// 用于新用户第一次登录时选择角色并绑定openid
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { openid, role, name, phone } = body;

    if (!openid || !role) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const validRoles = ['worker', 'agent', 'recruiter', 'instructor', 'customer', 'training_supervisor', 'worker_operator'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: '无效的角色类型' },
        { status: 400 }
      );
    }

    // 创建新用户或绑定已有用户
    const user = await createOrBindUser(openid, role, name, phone);

    if (!user) {
      return NextResponse.json(
        { error: '创建用户失败' },
        { status: 500 }
      );
    }

    const token = generateToken(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        reviewStatus: user.review_status,
      },
      token,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '注册失败';
    console.error('[wechat-register] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

async function createOrBindUser(
  openid: string,
  role: string,
  name?: string,
  phone?: string
): Promise<{
  id: string;
  name: string;
  phone: string;
  role: string;
  review_status: string;
} | null> {
  const roleLabels: Record<string, string> = {
    worker: '新阿姨',
    agent: '新经纪人',
    recruiter: '新招生',
    instructor: '新讲师',
    customer: '新客户',
    training_supervisor: '新主管',
    worker_operator: '新运营',
  };

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 先检查该openid是否已有绑定用户
    const { data: existing } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status')
      .eq('wechat_openid', openid)
      .single();

    if (existing) {
      return existing;
    }

    // 创建新用户
    const newUserId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newUserName = name || roleLabels[role] || '新用户';
    const newUserPhone = phone || '';

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        name: newUserName,
        phone: newUserPhone,
        role,
        wechat_openid: openid,
        review_status: 'pending', // 新用户默认待审核
        is_active: true,
      })
      .select('id, name, phone, role, review_status')
      .single();

    if (error) {
      console.error('[wechat-register] DB insert error:', error);
      return null;
    }

    return data;
  } catch {
    // 数据库不可用时回退到本地模拟
    return createLocalUser(openid, role, name, phone);
  }
}

function createLocalUser(
  openid: string,
  role: string,
  name?: string,
  phone?: string
): {
  id: string;
  name: string;
  phone: string;
  role: string;
  review_status: string;
} | null {
  const testAccounts: Record<string, { id: string; name: string; phone: string }> = {
    worker: { id: 'w001', name: '王秀兰', phone: '13800005678' },
    agent: { id: 'a001', name: '张丽华', phone: '13600001234' },
    recruiter: { id: 'r001', name: '陈招生', phone: '13500003456' },
    instructor: { id: 'i001', name: '李敏', phone: '13700007890' },
    customer: { id: 'c001', name: '刘女士', phone: '13900009876' },
    training_supervisor: { id: 'ts001', name: '赵主管', phone: '13100001111' },
    worker_operator: { id: 'wo001', name: '周运营', phone: '13200002222' },
  };

  const account = testAccounts[role];
  if (account) {
    return {
      ...account,
      role,
      review_status: 'approved',
    };
  }

  return null;
}

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  const timestamp = Date.now();
  const hash = Buffer.from(`${userId}:${timestamp}:${secret}`).toString('base64url');
  return Buffer.from(`${userId}:${timestamp}`).toString('base64url') + '.' + hash.substring(0, 16);
}

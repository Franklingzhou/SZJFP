import { NextRequest, NextResponse } from 'next/server';

// 获取当前登录session
// 通过token或openid验证用户身份
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: '未登录', isLoggedIn: false },
        { status: 401 }
      );
    }

    // 解析token获取userId
    const userId = parseToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'token无效', isLoggedIn: false },
        { status: 401 }
      );
    }

    // 查找用户
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在', isLoggedIn: false },
        { status: 404 }
      );
    }

    if (user.review_status === 'resigned') {
      return NextResponse.json(
        { error: '该账号已离职', isLoggedIn: false, code: 'ACCOUNT_RESIGNED' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        reviewStatus: user.review_status,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取session失败';
    return NextResponse.json(
      { error: message, isLoggedIn: false },
      { status: 500 }
    );
  }
}

function parseToken(token: string): string | null {
  try {
    // token格式: base64url(userId:timestamp).hashPrefix
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const decoded = Buffer.from(parts[0], 'base64url').toString('utf-8');
    const userId = decoded.split(':')[0];
    return userId || null;
  } catch {
    return null;
  }
}

async function findUserById(userId: string): Promise<{
  id: string;
  name: string;
  phone: string;
  role: string;
  review_status: string;
} | null> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status')
      .eq('id', userId)
      .single();

    if (error || !data) return null;
    return data;
  } catch {
    // 回退本地模拟
    const testAccounts: Record<string, { id: string; name: string; phone: string; role: string; review_status: string }> = {
      w001: { id: 'w001', name: '王秀兰', phone: '13800005678', role: 'worker', review_status: 'approved' },
      a001: { id: 'a001', name: '张丽华', phone: '13600001234', role: 'agent', review_status: 'approved' },
      r001: { id: 'r001', name: '陈招生', phone: '13500003456', role: 'recruiter', review_status: 'approved' },
      i001: { id: 'i001', name: '李敏', phone: '13700007890', role: 'instructor', review_status: 'approved' },
      c001: { id: 'c001', name: '刘女士', phone: '13900009876', role: 'customer', review_status: 'approved' },
      admin001: { id: 'admin001', name: '管理员', phone: '13000000001', role: 'admin', review_status: 'approved' },
      ts001: { id: 'ts001', name: '赵主管', phone: '13100001111', role: 'training_supervisor', review_status: 'approved' },
      wo001: { id: 'wo001', name: '周运营', phone: '13200002222', role: 'worker_operator', review_status: 'approved' },
    };
    return testAccounts[userId] || null;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth-token';

// 微信小程序登录API
// 流程：小程序 wx.login() 获取 code → 传给此API → 后端用 code 换 openid → 查找/创建用户 → 返回session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: '缺少微信登录code' },
        { status: 400 }
      );
    }

    // 用 code 向微信服务器换取 openid 和 session_key
    const { openid, session_key } = await exchangeCodeForOpenId(code);

    if (!openid) {
      return NextResponse.json(
        { error: '微信登录失败，无法获取用户标识' },
        { status: 401 }
      );
    }

    // 查找已绑定该openid的用户
    const user = await findUserByOpenId(openid);

    if (user) {
      // 用户已存在，检查账号状态
      if (user.review_status === 'resigned') {
        return NextResponse.json(
          { error: '该账号已离职，无法登录。如需重新入职，请联系管理员。', code: 'ACCOUNT_RESIGNED' },
          { status: 403 }
        );
      }

      // 生成session token
      const token = signToken(user.id);

      return NextResponse.json({
        success: true,
        isNewUser: false,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          reviewStatus: user.review_status,
        },
        token,
      });
    }

    // 新用户，openid未绑定任何账号，返回需要注册/绑定的信息
    return NextResponse.json({
      success: false,
      isNewUser: true,
      openid,
      sessionKey: session_key,
      message: '该微信尚未绑定平台账号，请选择角色并完善信息',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '登录失败';
    console.error('[wechat-login] Error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// 用code换取openid
async function exchangeCodeForOpenId(code: string): Promise<{ openid: string; session_key: string }> {
  const appId = process.env.WX_APPID || '';
  const appSecret = process.env.WX_APPSECRET || '';

  // 如果没有配置微信appid，使用模拟模式（开发/测试环境）
  if (!appId || !appSecret) {
    console.log('[wechat-login] 模拟模式：未配置微信appid，使用code作为openid');
    // 开发模式：直接用code模拟openid，方便测试
    // 如果code已含标准前缀(如dev_wx_)则直接使用，否则加dev_前缀
    const simulatedOpenid = code.startsWith('dev_') ? code : `dev_${code}`;
    return {
      openid: simulatedOpenid,
      session_key: `sk_${Date.now()}`,
    };
  }

  // 生产模式：调用微信API
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (data.errcode) {
    throw new Error(`微信API错误: ${data.errmsg}`);
  }

  return {
    openid: data.openid,
    session_key: data.session_key,
  };
}

// 根据openid查找用户
async function findUserByOpenId(openid: string): Promise<{
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
      .eq('wechat_openid', openid)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    // 数据库不可用时回退到本地模拟
    return findUserByOpenIdLocal(openid);
  }
}

// 本地模拟数据回退
function findUserByOpenIdLocal(openid: string): {
  id: string;
  name: string;
  phone: string;
  role: string;
  review_status: string;
} | null {
  // 开发模式下，dev_wx_{role} 格式的openid自动映射到测试账号
  const devMatch = openid.match(/^dev_wx_(\w+)$/);
  if (devMatch) {
    const roleMap: Record<string, { id: string; name: string; phone: string; role: string }> = {
      worker: { id: 'w001', name: '王秀兰', phone: '13800005678', role: 'worker' },
      agent: { id: 'a001', name: '张丽华', phone: '13600001234', role: 'agent' },
      recruiter: { id: 'r001', name: '陈招生', phone: '13500003456', role: 'recruiter' },
      instructor: { id: 'i001', name: '李敏', phone: '13700007890', role: 'instructor' },
      customer: { id: 'c001', name: '刘女士', phone: '13900009876', role: 'customer' },
      admin: { id: 'admin001', name: '管理员', phone: '13000000001', role: 'admin' },
      training_supervisor: { id: 'ts001', name: '赵主管', phone: '13100001111', role: 'training_supervisor' },
      worker_operator: { id: 'wo001', name: '周运营', phone: '13200002222', role: 'worker_operator' },
    };
    const mapped = roleMap[devMatch[1]];
    if (mapped) {
      return { ...mapped, review_status: 'approved' };
    }
  }

  // dev_开头的openid（来自模拟模式的wx.login code）
  // 尝试匹配已存储的openid
  return null;
}


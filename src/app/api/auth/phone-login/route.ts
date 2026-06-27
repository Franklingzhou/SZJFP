import { NextRequest, NextResponse } from 'next/server';

// 手机号+验证码登录API（v3 统一版）
// 不管什么角色，同一个登录入口：
//   验证码通过 → 查users表 → 找到了+已审核 → 登录，返回role
//                      → 找到了+待审核 → 提示等待
//                      → 没找到 → 尝试预注册认领 → 有则登录
//                               → 都没有 → 返回isNewUser，引导注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = body as { phone: string; code: string };

    if (!phone || !code) {
      return NextResponse.json({ error: '请输入手机号和验证码' }, { status: 400 });
    }

    // 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: '手机号格式不正确，请输入有效的11位手机号', code: 'INVALID_PHONE' }, { status: 400 });
    }

    // 验证码校验
    const isValidCode = await verifyCode(phone, code);
    if (!isValidCode) {
      return NextResponse.json({ error: '验证码错误或已过期' }, { status: 401 });
    }

    // 1. 按手机号查用户（不区分角色）
    const user = await findUserByPhone(phone);

    if (user) {
      // 找到用户，检查账号状态
      if (user.review_status === 'pending' && user.register_source === 'pre_registered') {
        // 预注册用户自动激活
        await activatePreRegisteredUser(user.id);
      } else if (user.review_status === 'pending') {
        // 外部角色（阿姨/客户）自动激活，内部角色提示等待审核
        if (user.role === 'worker' || user.role === 'customer') {
          await activateUser(user.id);
        } else {
          return NextResponse.json(
            { error: '您的注册申请正在审核中，请耐心等待', code: 'ACCOUNT_PENDING' },
            { status: 403 }
          );
        }
      }

      if (user.review_status === 'resigned') {
        return NextResponse.json(
          { error: '该账号已离职，无法登录', code: 'ACCOUNT_RESIGNED' },
          { status: 403 }
        );
      }

      if (user.review_status === 'rejected') {
        return NextResponse.json(
          { error: '账号审核未通过，请联系管理员', code: 'ACCOUNT_REJECTED' },
          { status: 403 }
        );
      }

      if (!user.is_active) {
        return NextResponse.json(
          { error: '该账号已被禁用，请联系管理员', code: 'ACCOUNT_DISABLED' },
          { status: 403 }
        );
      }

      // 转岗申请中的用户也能正常登录（用当前角色）
      const token = generateToken(user.id);
      return NextResponse.json({
        success: true,
        isNewUser: false,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          reviewStatus: user.review_status,
          is_active: user.is_active,
          pendingRole: user.pending_role || null,
          pendingRoleStatus: user.pending_role_status || null,
        },
        token,
      });
    }

    // 2. 没找到用户 → 尝试认领预注册的阿姨记录
    const claimedResult = await tryClaimPreRegistered(phone);

    if (claimedResult) {
      const token = generateToken(claimedResult.userId);
      return NextResponse.json({
        success: true,
        isNewUser: false,
        claimed: true,
        claimType: claimedResult.type,
        user: {
          id: claimedResult.userId,
          name: claimedResult.name,
          phone,
          role: claimedResult.role,
          reviewStatus: 'approved',
          is_active: true,
        },
        token,
      });
    }

    // 3. 完全没记录 → 新用户，引导注册
    return NextResponse.json({
      success: false,
      isNewUser: true,
      phone,
      message: '该手机号尚未注册，请选择角色并完善信息',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '登录失败';
    console.error('[phone-login] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 验证码校验
async function verifyCode(phone: string, code: string): Promise<boolean> {
  const isDev = !process.env.SMS_PROVIDER;
  if (isDev) {
    return code === '888888';
  }

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('sms_codes')
      .select('code, expires_at')
      .eq('phone', phone)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return false;
    if (new Date(data.expires_at) < new Date()) return false;
    if (data.code !== code) return false;

    await supabase.from('sms_codes').update({ used: true }).eq('phone', phone).eq('code', code);
    return true;
  } catch {
    return code === '888888';
  }
}

// 根据手机号查找用户（不区分角色，返回全字段）
async function findUserByPhone(phone: string): Promise<{
  id: string; name: string; phone: string; role: string;
  review_status: string; is_active: boolean; register_source?: string;
  pending_role?: string; pending_role_status?: string;
} | null> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active, register_source, pending_role, pending_role_status')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

// 激活预注册用户（pending → approved）
async function activatePreRegisteredUser(userId: string): Promise<boolean> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .update({
        review_status: 'approved',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('review_status', 'pending');

    if (error) {
      console.error('[activatePreRegisteredUser] Error:', error);
      return false;
    }
    console.log('[phone-login] Pre-registered user activated:', userId);
    return true;
  } catch (err) {
    console.error('[activatePreRegisteredUser] Error:', err);
    return false;
  }
}

// 激活用户（外部角色自动通过）
async function activateUser(userId: string): Promise<boolean> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('users')
      .update({
        review_status: 'approved',
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('review_status', 'pending');

    if (error) {
      console.error('[activateUser] Error:', error);
      return false;
    }
    console.log('[phone-login] External user auto-activated:', userId);
    return true;
  } catch (err) {
    console.error('[activateUser] Error:', err);
    return false;
  }
}

// 尝试认领预注册记录（业务规则第十六条核心逻辑）
// 查workers表phone=xxx AND user_id IS NULL → 有待认领worker
// 查leads表phone=xxx → 有待认领线索（线索关联的worker未绑定user）
// 如果只有一种 → 自动创建user并绑定
// 如果两种都有 → 优先认领worker
async function tryClaimPreRegistered(phone: string): Promise<{
  userId: string; name: string; role: string; type: string;
} | null> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 查workers表中未认领的记录
    const { data: unclaimedWorkers } = await supabase
      .from('workers')
      .select('id, name, phone, status, creator_id, creator_role, lead_id')
      .eq('phone', phone)
      .is('user_id', null);

    // 查leads表中该手机号的线索
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, phone, status, recruiter_id, sign_worker_id')
      .eq('phone', phone);

    const unclaimedWorker = unclaimedWorkers && unclaimedWorkers.length > 0 ? unclaimedWorkers[0] : null;
    const lead = leads && leads.length > 0 ? leads[0] : null;

    if (!unclaimedWorker && !lead) {
      return null; // 无待认领记录
    }

    // 创建新用户
    const userId = `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const userName = unclaimedWorker?.name || lead?.name || '新用户';
    const userRole = 'worker'; // 预注册认领的都是阿姨

    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: userName,
        phone,
        role: userRole,
        review_status: 'approved',
        is_active: true,
        register_source: 'pre_registered',
        password_hash: '123456',
      })
      .select('id, name, phone, role')
      .single();

    if (userErr) {
      console.error('[tryClaimPreRegistered] Create user error:', userErr);
      return null;
    }

    // 绑定worker的user_id
    if (unclaimedWorker) {
      const { error: bindErr } = await supabase
        .from('workers')
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq('id', unclaimedWorker.id)
        .is('user_id', null);

      if (bindErr) {
        console.error('[tryClaimPreRegistered] Bind worker error:', bindErr);
      } else {
        console.log('[phone-login] Claimed worker:', unclaimedWorker.id, '→ user:', userId);
      }
    }

    // 如果线索的sign_worker_id匹配未认领worker，也更新线索关联
    if (lead && unclaimedWorker && lead.sign_worker_id === unclaimedWorker.id) {
      // 线索已签约的worker被认领，更新线索相关字段
    }

    return {
      userId: newUser.id,
      name: newUser.name,
      role: newUser.role,
      type: unclaimedWorker ? 'worker' : 'lead',
    };
  } catch (err) {
    console.error('[tryClaimPreRegistered] Error:', err);
    return null;
  }
}

// 生成简单token
function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret-key';
  const timestamp = Date.now();
  const hash = Buffer.from(`${userId}:${timestamp}:${secret}`).toString('base64url');
  return Buffer.from(`${userId}:${timestamp}`).toString('base64url') + '.' + hash.substring(0, 16);
}

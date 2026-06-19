/**
 * API 认证中间件
 * 校验登录态 + 角色权限
 * 
 * 用法:
 *   import { requireAuth, requireRole } from '@/lib/auth-middleware';
 *   
 *   // 只需登录
 *   const session = await requireAuth(request);
 *   if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
 *   
 *   // 需要特定角色
 *   const session = await requireRole(request, ['admin', 'agent']);
 *   if (!session) return NextResponse.json({ error: '无权限' }, { status: 403 });
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AuthSession {
  userId: string;
  role: string;
  name: string;
  phone: string;
  reviewStatus: string;
}

// 角色权限矩阵：每个API资源允许哪些角色操作
// 按页面权限文档(28页×8角色)配置
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // === 订单相关 ===
  'orders:read':    ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor', 'worker'],
  'orders:write':   ['agent'],  // 仅经纪人能发单！admin也不能！

  // === 客户管理 ===
  'customers:read':  ['admin', 'agent'],
  'customers:write': ['admin', 'agent'], // 管理员和经纪人可创建客户

  // === 线索管理 ===
  'leads:read':  ['admin', 'recruiter', 'training_supervisor'],
  'leads:write': ['admin', 'recruiter', 'training_supervisor'],

  // === 学员管理 ===
  'students:read':  ['admin', 'recruiter', 'instructor', 'training_supervisor'],
  'students:write': ['admin', 'recruiter', 'instructor', 'training_supervisor'],

  // === 阿姨简历库 ===
  'workers:read':  ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor'],
  'workers:write': ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor'],

  // === 课程管理 ===
  'courses:read':  ['admin', 'recruiter', 'instructor', 'training_supervisor', 'worker'],
  'courses:write': ['admin', 'recruiter', 'instructor', 'training_supervisor'],

  // === 评价相关 ===
  'reviews:read': ['admin', 'agent', 'worker', 'customer', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor'],
  'reviews:write': ['admin', 'agent', 'worker', 'customer', 'recruiter', 'instructor', 'worker_operator'],

  // === 推荐相关 ===
  'recommendations:read': ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator', 'worker'],
  'recommendations:write': ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor'],

  // === 报名/学员相关 ===
  'enrollments:read':  ['admin', 'recruiter', 'instructor', 'training_supervisor', 'worker'],
  'enrollments:write': ['admin', 'recruiter', 'instructor', 'training_supervisor', 'worker'],  // 阿姨能自助报名

  // === 考核打分相关 ===
  'grading:read': ['admin', 'instructor', 'training_supervisor'],
  'grading:write': ['admin', 'instructor', 'training_supervisor'],  // 仅讲师和培训主管能打分

  // === 排课表相关 ===
  'course_schedules:read': ['admin', 'instructor', 'training_supervisor'],
  'course_schedules:write': ['admin', 'instructor', 'training_supervisor'],  // 仅讲师和培训主管能创建排课

  // === 合同相关 ===
  'contracts:read': ['admin', 'agent', 'recruiter', 'training_supervisor', 'worker', 'customer'],
  'contracts:write': ['admin', 'agent', 'recruiter', 'training_supervisor'],
  'contracts:approve': ['admin', 'training_supervisor'],

  // === 培训合同 ===
  'training-contracts:read': ['admin', 'training_supervisor', 'recruiter', 'worker', 'customer'],
  'training-contracts:write': ['admin', 'training_supervisor'],

  // === 中介合同 ===
  'agency-contracts:read': ['admin', 'agent', 'worker', 'customer'],
  'agency-contracts:write': ['admin', 'agent'],

  // === 合同模板相关 ===
  'contract-templates:read': ['admin'],
  'contract-templates:write': ['admin'],

  // === 简历审核相关 ===
  'resume-reviews:read': ['admin'],
  'resume-reviews:write': ['admin'],

  // === 订单签约相关 ===
  'order-signings:read': ['admin', 'agent', 'customer', 'worker', 'recruiter', 'training_supervisor'],
  'order-signings:write': ['admin', 'agent'],
  'order-signings:confirm': ['admin', 'agent'],
  'order-signings:create': ['admin', 'agent'],
  'order-signings:update': ['admin', 'agent'],

  // === 阿姨状态/诚信分 ===
  'workers:status': ['admin', 'agent', 'worker_operator', 'training_supervisor'],
  'workers:credit': ['admin'],
  'workers:blacklist': ['admin'],

  // === 用户管理 ===
  'users:read': ['admin'],
  'users:write': ['admin'],

  // === 系统设置 ===
  'settings:read': ['admin'],  // 仅管理员
  'settings:write': ['admin'],

  // === 通知相关 ===
  'notifications:read': ['admin', 'agent', 'recruiter', 'instructor', 'worker', 'customer', 'training_supervisor', 'worker_operator'],
  'notifications:write': ['admin'],

  // === 佣金/分账/保证金/积分 ===
  'commission:read': ['admin', 'agent'],
  'commission:write': ['admin'],
  'commission:settle': ['admin'],
  'settlement:read': ['admin'],
  'settlement:write': ['admin'],
  'deposit:read': ['admin'],
  'deposit:write': ['admin'],
  'points:read': ['admin', 'worker'],
  'points:write': ['admin'],

  // === 平台费用相关 ===
  'platform_fees:read': ['admin'],
  'platform_fees:write': ['admin'],

  // === 证书 ===
  'certificates:read': ['admin', 'instructor', 'training_supervisor', 'worker'],
  'certificates:write': ['admin', 'instructor'],

  // === 报名扩展 ===
  'enrollments:grade': ['admin', 'instructor', 'training_supervisor'],
  'enrollments:transfer': ['admin', 'training_supervisor'],

  // === 分账结算 ===
  'commission-settlements:read': ['admin', 'agent'],
  'commission-settlements:write': ['admin'],
  'commission-records:read': ['admin', 'agent'],

  // === 个人设置 ===
  'profile:write': ['admin', 'agent', 'recruiter', 'instructor', 'customer', 'worker', 'training_supervisor', 'worker_operator'],

  // === 订单取消 ===
  'orders:cancel': ['admin', 'agent'],
  'orders:accept': ['admin', 'worker'],
};

/**
 * 从请求中解析token获取userId
 */
function parseToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    // 优先尝试 JWT 格式：解码 payload（第二段）
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
        if (payload.userId) return payload.userId;
      } catch {
        // 不是 JWT，继续尝试自定义格式
      }
    }

    // 自定义 token 格式：base64url(userId:timestamp)
    const decoded = Buffer.from(parts[0], 'base64url').toString('utf-8');
    const userId = decoded.split(':')[0];
    return userId || null;
  } catch {
    return null;
  }
}

/**
 * 从请求头中提取token
 */
function extractToken(request: NextRequest): string | null {
  // 1. Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    return authHeader.replace('Bearer ', '');
  }
  
  // 2. x-session header (微信小程序端)
  const xSession = request.headers.get('x-session');
  if (xSession) {
    return xSession;
  }
  
  return null;
}

/**
 * 验证token并返回用户信息
 */
async function verifyToken(token: string): Promise<AuthSession | null> {
  const userId = parseToken(token);
  if (!userId) return null;
  
  try {
    // 使用 anon key 查询 users 表（RLS 已配置允许读取）
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    
    // 离职/禁用账号
    if (data.review_status === 'resigned' || !data.is_active) return null;
    
    return {
      userId: data.id,
      role: data.role,
      name: data.name,
      phone: data.phone || '',
      reviewStatus: data.review_status,
    };
  } catch {
    return null;
  }
}

/**
 * 要求登录 - 返回session或null
 * 注意：开发模式下(没有SMS_PROVIDER环境变量)允许无token访问，方便调试
 * 注意：COZE_PROJECT_ENV=PROD 时强制验证，不管SMS_PROVIDER
 */
export async function requireAuth(request: NextRequest): Promise<AuthSession | null> {
  // 生产模式：强制验证，不返回默认session
  const isProd = process.env.COZE_PROJECT_ENV === 'PROD' || !!process.env.SMS_PROVIDER;
  const token = extractToken(request);
  
  if (!token) {
    // 生产环境必须登录，有环境变量SMS_PROVIDER且非PROD时才用dev mode
    const isDev = !isProd;
    if (isDev) {
      return { userId: 'admin001', role: 'admin', name: '管理员', phone: '13000000001', reviewStatus: 'approved' };
    }
    return null;
  }
  
  const session = await verifyToken(token);
  if (!session && !isProd) {
    return { userId: 'admin001', role: 'admin', name: '管理员', phone: '13000000001', reviewStatus: 'approved' };
  }
  
  return session;
}

/**
 * 要求特定角色 - 返回session或null
 */
export async function requireRole(request: NextRequest, allowedRoles: string[]): Promise<AuthSession | null> {
  const session = await requireAuth(request);
  if (!session) return null;
  
  if (!allowedRoles.includes(session.role)) return null;
  
  return session;
}

/**
 * 检查权限 - 通过权限key
 */
export async function checkPermission(request: NextRequest, permissionKey: string): Promise<AuthSession | null> {
  const allowedRoles = ROLE_PERMISSIONS[permissionKey];
  if (!allowedRoles) {
    // 未定义权限key，默认需admin
    return requireRole(request, ['admin']);
  }
  return requireRole(request, allowedRoles);
}

/** 权限检查结果 */
export type PermissionResult =
  | { ok: true; session: AuthSession }
  | { ok: false; reason: 'unauthorized' | 'forbidden' };

/**
 * 检查权限（带原因）- 区分未登录和无权限
 */
export async function checkPermissionDetailed(
  request: NextRequest,
  permissionKey: string
): Promise<PermissionResult> {
  const allowedRoles = ROLE_PERMISSIONS[permissionKey];
  const roles = allowedRoles || ['admin'];

  const session = await requireAuth(request);
  if (!session) {
    return { ok: false, reason: 'unauthorized' };
  }

  if (!roles.includes(session.role)) {
    return { ok: false, reason: 'forbidden' };
  }

  return { ok: true, session };
}

/**
 * 创建未认证响应
 */
export function unauthorizedResponse(message: string = '未登录，请先登录') {
  return NextResponse.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 });
}

/**
 * 创建无权限响应
 */
export function forbiddenResponse(message: string = '无操作权限') {
  return NextResponse.json({ error: message, code: 'FORBIDDEN' }, { status: 403 });
}

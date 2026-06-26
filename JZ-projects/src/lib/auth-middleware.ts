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
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  // 阿姨相关
  'workers:read': ['admin', 'agent', 'recruiter', 'instructor', 'customer', 'worker_operator', 'training_supervisor', 'worker'],
  'workers:write': ['admin', 'agent', 'recruiter', 'worker_operator', 'training_supervisor'],
  'workers:status': ['admin', 'agent', 'worker_operator', 'training_supervisor'],  // 改阿姨状态
  'workers:credit': ['admin'],  // 改诚信分
  
  // 线索相关
  'leads:read': ['admin', 'recruiter', 'agent', 'worker_operator', 'training_supervisor'],
  'leads:write': ['admin', 'recruiter', 'agent', 'worker_operator', 'training_supervisor'],
  
  // 订单相关
  'orders:read': ['admin', 'agent', 'customer', 'worker', 'worker_operator', 'recruiter', 'training_supervisor'],
  'orders:write': ['admin', 'agent', 'recruiter', 'worker_operator', 'training_supervisor'],
  'orders:accept': ['admin', 'worker'],  // 阿姨接单
  
  // 课程相关
  'courses:read': ['admin', 'instructor', 'recruiter', 'training_supervisor'],
  'courses:write': ['admin', 'instructor', 'training_supervisor', 'recruiter'],
  'courses:approve': ['admin', 'training_supervisor'],
  
  // 合同相关
  'contracts:read': ['admin', 'training_supervisor', 'recruiter', 'agent', 'worker', 'customer'],
  'contracts:write': ['admin', 'agent', 'recruiter', 'training_supervisor'],
  'contracts:approve': ['admin', 'training_supervisor'],

  // 合同模板相关
  'contract-templates:read': ['admin', 'training_supervisor', 'recruiter'],
  'contract-templates:write': ['admin'],

  // 简历审核相关
  'resume-reviews:read': ['admin', 'training_supervisor', 'worker_operator'],
  'resume-reviews:write': ['admin', 'training_supervisor', 'worker_operator'],

  // 评价相关
  'reviews:read': ['admin', 'agent', 'worker', 'customer', 'recruiter', 'instructor', 'worker_operator'],
  'reviews:write': ['admin', 'agent', 'worker', 'customer', 'recruiter', 'instructor', 'worker_operator'],

  // 推荐相关
  'recommendations:read': ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor', 'worker'],
  'recommendations:write': ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'worker', 'training_supervisor'],

  // 客户管理相关
  'customers:read': ['admin', 'agent', 'recruiter', 'worker_operator', 'training_supervisor'],
  'customers:write': ['admin', 'agent', 'worker_operator'],

  // 订单签约相关
  'order-signings:read': ['admin', 'agent', 'customer', 'worker', 'recruiter', 'training_supervisor'],
  'order-signings:write': ['admin', 'agent'],

  // 报名/学员相关
  'enrollments:read': ['admin', 'instructor', 'training_supervisor', 'recruiter'],
  'enrollments:write': ['admin', 'recruiter', 'instructor'],
  
  // 用户管理
  'users:read': ['admin'],
  'users:write': ['admin'],
  
  // 系统设置
  'settings:read': ['admin', 'agent', 'recruiter', 'instructor', 'customer', 'worker', 'training_supervisor', 'worker_operator'],
  'settings:write': ['admin'],
  
  // 佣金/分账/保证金/积分
  'commission:read': ['admin', 'agent'],
  'commission:write': ['admin'],
  'settlement:read': ['admin'],
  'settlement:write': ['admin'],
  'deposit:read': ['admin'],
  'deposit:write': ['admin'],
  'points:read': ['admin', 'worker'],
  'points:write': ['admin'],
  
  // 排课表相关
  'course_schedules:read': ['admin', 'instructor', 'training_supervisor'],
  'course_schedules:write': ['admin', 'instructor', 'training_supervisor'],
  
  // 平台费用相关
  'platform_fees:read': ['admin'],
  'platform_fees:write': ['admin'],

  // 个人设置
  'profile:write': ['admin', 'agent', 'recruiter', 'instructor', 'customer', 'worker', 'training_supervisor', 'worker_operator'],

  // 分账结算
  'commission-settlements:read': ['admin', 'agent'],
  'commission-settlements:write': ['admin'],

  // 佣金记录
  'commission-records:read': ['admin', 'agent'],

  // 证书
  'certificates:read': ['admin', 'instructor', 'training_supervisor'],
  'certificates:write': ['admin', 'instructor'],

  // 报名/学员扩展
  'enrollments:grade': ['admin', 'instructor', 'training_supervisor'],
  'enrollments:transfer': ['admin', 'training_supervisor'],

  // 阿姨黑名单
  'workers:blacklist': ['admin'],

  // 佣金结算
  'commission:settle': ['admin'],

  // 订单签约扩展
  'order-signings:confirm': ['admin', 'agent'],
  'order-signings:create': ['admin', 'agent'],
  'order-signings:update': ['admin', 'agent'],

  // 订单取消
  'orders:cancel': ['admin', 'agent'],

  // 培训合同
  'training-contracts:read': ['admin', 'training_supervisor', 'recruiter'],
  'training-contracts:write': ['admin', 'training_supervisor'],

  // 通知 (BUG-32修复: 扩权到所有角色)
  'notifications:read': ['admin', 'agent', 'recruiter', 'instructor', 'customer', 'worker', 'training_supervisor', 'worker_operator'],
  'notifications:write': ['admin'],

  // DELETE 操作仅管理员
  'orders:delete': ['admin'],
  'leads:delete': ['admin'],
  'courses:delete': ['admin'],
  'contracts:delete': ['admin'],
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
    // 查 users VIEW
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, phone, role, review_status, is_active')
      .eq('id', userId)
      .single();
    
    if (error || !data) return null;
    
    // 禁用账号
    if (!data.is_active) return null;
    
    return {
      userId: data.id,
      role: data.role,
      name: data.name,
      phone: data.phone || '',
      reviewStatus: data.review_status || 'approved',
    };
  } catch {
    return null;
  }
}

/**
 * 要求登录 - 返回session或null
 * 注意：开发模式下(没有SMS_PROVIDER环境变量)允许无token访问，方便调试
 */
export async function requireAuth(request: NextRequest): Promise<AuthSession | null> {
  // 开发模式：无SMS_PROVIDER时，允许无token访问（方便调试）
  const isDev = !process.env.SMS_PROVIDER && process.env.COZE_PROJECT_ENV !== 'PROD';
  const token = extractToken(request);
  
  if (!token) {
    return isDev ? { userId: 'admin001', role: 'admin', name: '管理员', phone: '13000000001', reviewStatus: 'approved' } : null;
  }
  
  const session = await verifyToken(token);
  if (!session && isDev) {
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

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  UserCircle,
  PhoneCall,
  Handshake,
  FilePenLine,
  MessageSquare,
  DollarSign,
  Wallet,
  ClipboardList,
  GraduationCap,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  FileSignature,
  Settings,
  KeyRound,
  UserCog,
  LogOut,
  Calendar,
  Bell,
  Shield,
  Award,
  CreditCard,
  Gift,
  Banknote,
  FileCheck,
  CheckCircle,
  Database,
  Columns,
} from 'lucide-react';

// 页面ID到侧边栏href的映射
const PAGE_ID_TO_HREF: Record<string, string> = {
  dashboard: '/admin/dashboard',
  hall: '/admin/hall',
  clients: '/admin/clients',
  leads: '/admin/leads',
  students: '/admin/students',
  workers: '/admin/workers',
  courses: '/admin/courses',
  'course-schedules': '/admin/course-schedules',
  'course-grading': '/admin/course-grading',
  contracts: '/admin/contracts',
  'contract-templates': '/admin/contract-templates',
  'lead-contracts': '/admin/lead-contracts',
  'agency-contracts': '/admin/agency-contracts',
  'resume-reviews': '/admin/resume-reviews',
  orders: '/admin/orders',
  recommendations: '/admin/recommendations',
  reviews: '/admin/reviews',
  commission: '/admin/commission',
  settlement: '/admin/settlement',
  credit: '/admin/credit',
  deposits: '/admin/deposit',

  refunds: '/admin/refunds',
  'platform-fees': '/admin/platform-fees',
  certificates: '/admin/certificates',
  users: '/admin/users',
  'role-reviews': '/admin/role-reviews',
  settings: '/admin/settings',
  'role-permissions': '/admin/role-permissions',
  'data-permissions': '/admin/data-permissions',
  'field-permissions': '/admin/field-permissions',
  notifications: '/admin/notifications',
  venues: '/admin/venues',
  'profile-settings': '/admin/profile-settings',
  'my-resume': '/admin/my-resume',
  'my-contracts': '/admin/my-contracts',
};

// 硬编码默认角色（API不可用时的回退）
const DEFAULT_ROLES: Record<string, string[]> = {
  dashboard: ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor', 'worker', 'customer'],
  hall: ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor', 'worker'],
  clients: ['admin', 'agent'],
  leads: ['admin', 'recruiter', 'training_supervisor'],
  students: ['admin', 'recruiter', 'instructor', 'training_supervisor'],
  workers: ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor'],
  courses: ['admin', 'recruiter', 'instructor', 'training_supervisor', 'worker'],
  contracts: ['admin', 'training_supervisor'],
  'contract-templates': ['admin'],
  'lead-contracts': ['admin', 'recruiter', 'training_supervisor'],
  'agency-contracts': ['admin', 'agent'],
  'course-schedules': ['admin', 'instructor', 'training_supervisor'],
  'course-grading': ['admin', 'instructor', 'training_supervisor'],
  'resume-reviews': ['admin'],
  orders: ['admin', 'agent'],
  recommendations: ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor', 'worker'],
  reviews: ['admin', 'agent', 'recruiter', 'instructor', 'worker_operator', 'training_supervisor', 'worker', 'customer'],
  commission: ['admin'],
  settlement: ['admin'],
  credit: ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator', 'worker'],
  deposits: ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator', 'worker'],

  'platform-fees': ['admin'],
  refunds: ['admin'],
  certificates: ['admin', 'instructor', 'training_supervisor'],
  users: ['admin'],
  'role-reviews': ['admin'],
  settings: ['admin'],
  'role-permissions': ['admin'],
  'data-permissions': ['admin'],
  'field-permissions': ['admin'],
  notifications: ['admin'],
  venues: ['admin'],
  'profile-settings': ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator', 'worker', 'customer'],
  'my-resume': ['worker'],
  'my-contracts': ['admin', 'agent', 'recruiter', 'training_supervisor', 'worker', 'customer'],
};

// 页面标签和图标
const PAGE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  dashboard: { label: '仪表盘', icon: LayoutDashboard },
  hall: { label: '订单大厅', icon: ClipboardList },
  clients: { label: '客户管理', icon: UserCircle },
  leads: { label: '线索管理', icon: PhoneCall },
  students: { label: '学员管理', icon: Users },
  workers: { label: '阿姨简历库', icon: Users },
  courses: { label: '课程管理', icon: GraduationCap },
  'course-schedules': { label: '排课管理', icon: Calendar },
  'course-grading': { label: '考核打分', icon: CheckCircle },
  contracts: { label: '合同审核', icon: FileSignature },
  'contract-templates': { label: '合同模板', icon: FileText },
  'lead-contracts': { label: '培训合同', icon: FileText },
  'agency-contracts': { label: '中介合同', icon: Handshake },
  'resume-reviews': { label: '简历审核', icon: FileCheck },
  orders: { label: '订单管理', icon: ClipboardList },
  recommendations: { label: '推荐记录', icon: Handshake },
  reviews: { label: '评价', icon: MessageSquare },
  commission: { label: '佣金配置', icon: DollarSign },
  settlement: { label: '分账管理', icon: Wallet },
  credit: { label: '诚信分管理', icon: Shield },
  deposits: { label: '保证金管理', icon: CreditCard },

  'platform-fees': { label: '平台收费', icon: Banknote },
  refunds: { label: '退款管理', icon: Banknote },
  certificates: { label: '证书管理', icon: Award },
  users: { label: '用户管理', icon: Users },
  'role-reviews': { label: '角色审核', icon: UserCheck },
  settings: { label: '系统设置', icon: Settings },
  'role-permissions': { label: '角色权限', icon: KeyRound },
  'data-permissions': { label: '数据权限', icon: Database },
  'field-permissions': { label: '字段权限', icon: Columns },
  notifications: { label: '通知管理', icon: Bell },
  venues: { label: '场地管理', icon: MapPin },
  'profile-settings': { label: '个人中心', icon: UserCog },
  'my-resume': { label: '我的简历', icon: FileText },
  'my-contracts': { label: '我的合同', icon: FileSignature },
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState<string>('');
  const [pageAccess, setPageAccess] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(true);

  // 客户端挂载后读取角色
  useEffect(() => {
    const role = localStorage.getItem('miniapp_role') || localStorage.getItem('auth_role') || '';
    setCurrentRole(role);
  }, []);

  // 从API加载页面权限配置
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    if (!token) { setLoading(false); return; }
    fetch('/api/settings?key=page_access', { headers: { 'x-session': token } })
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        if (data?.ok && data?.data?.value && typeof data.data.value === 'object') {
          setPageAccess(data.data.value as Record<string, string[]>);
        }
      })
      .catch(() => { /* 使用默认值 */ })
      .finally(() => setLoading(false));
  }, []);

  // 构建过滤后的菜单项
  const filteredItems = Object.entries(PAGE_ID_TO_HREF)
    .filter(([pageId]) => {
      // 未加载完成时显示全部（避免闪烁空白）
      if (loading) return true;
      // 未登录或无角色时显示全部
      if (!currentRole) return true;
      // 管理员永远看全部
      if (currentRole === 'admin') return true;
      // 优先用API配置，回退到硬编码默认值；两者都无则隐藏
      const allowedRoles = pageAccess?.[pageId] ?? DEFAULT_ROLES[pageId];
      if (!allowedRoles || allowedRoles.length === 0) return false;
      return allowedRoles.includes(currentRole);
    })
    .map(([pageId, href]) => {
      const meta = PAGE_META[pageId];
      return { href, label: meta?.label ?? pageId, icon: meta?.icon ?? LayoutDashboard };
    });

  const handleLogout = () => {
    localStorage.removeItem('miniapp_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('miniapp_role');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('miniapp_userid');
    localStorage.removeItem('auth_userid');
    router.push('/admin/login');
  };

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 text-white transition-all duration-300 h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-700">
        <Link href="/" className="flex items-center gap-2">
          <Home className="h-6 w-6 text-amber-400 shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg whitespace-nowrap">家政共创平台</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm',
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout + Collapse toggle */}
      <div className="border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">退出登录</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 hover:bg-slate-800 transition-colors w-full"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

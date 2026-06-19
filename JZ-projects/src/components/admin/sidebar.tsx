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
} from 'lucide-react';

// 页面ID到侧边栏href的映射
const PAGE_ID_TO_HREF: Record<string, string> = {
  dashboard: '/admin/dashboard',
  reviews: '/admin/reviews',
  users: '/admin/users',
  workers: '/admin/workers',
  clients: '/admin/clients',
  leads: '/admin/leads',
  audits: '/admin/audits',
  'review-audits': '/admin/review-audits',
  commission: '/admin/commission',
  settlement: '/admin/settlement',
  hall: '/admin/hall',
  orders: '/admin/orders',
  recommendations: '/admin/recommendations',
  students: '/admin/students',
  courses: '/admin/courses',
  'course-schedules': '/admin/course-schedules',
  'course-grading': '/admin/course-grading',
  notifications: '/admin/notifications',
  contracts: '/admin/contracts',
  'contract-templates': '/admin/contract-templates',
  'lead-contracts': '/admin/lead-contracts',
  'training-contracts': '/admin/training-contracts',
  team: '/admin/team',
  venues: '/admin/venues',
  settings: '/admin/settings',
  'profile-settings': '/admin/profile-settings',
  'reset-password': '/admin/reset-password',
};

// 硬编码默认角色（API不可用时的回退）
const DEFAULT_ROLES: Record<string, string[]> = {
  dashboard: ['admin', 'worker_operator', 'training_supervisor'],
  reviews: ['admin'],
  users: ['admin'],
  workers: ['admin', 'worker_operator', 'training_supervisor'],
  clients: ['admin', 'worker_operator'],
  leads: ['admin', 'worker_operator'],
  audits: ['admin'],
  'review-audits': ['admin'],
  commission: ['admin'],
  settlement: ['admin'],
  hall: ['admin', 'worker_operator', 'agent'],
  orders: ['admin', 'worker_operator', 'agent'],
  recommendations: ['admin', 'worker_operator', 'agent'],
  students: ['admin', 'training_supervisor'],
  courses: ['admin', 'training_supervisor'],
  'course-schedules': ['admin', 'training_supervisor'],
  'course-grading': ['admin', 'training_supervisor'],
  notifications: ['admin', 'worker_operator', 'training_supervisor', 'agent'],
  contracts: ['admin', 'worker_operator'],
  'contract-templates': ['admin'],
  'lead-contracts': ['admin', 'training_supervisor'],
  'training-contracts': ['admin', 'training_supervisor'],
  team: ['admin', 'training_supervisor'],
  venues: ['admin'],
  settings: ['admin'],
  'profile-settings': ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator'],
  'reset-password': ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator'],
};

// 页面标签和图标
const PAGE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  dashboard: { label: '仪表盘', icon: LayoutDashboard },
  reviews: { label: '角色审核', icon: UserCheck },
  users: { label: '用户管理', icon: Users },
  workers: { label: '阿姨库管理', icon: Users },
  clients: { label: '客户管理', icon: UserCircle },
  leads: { label: '线索管理', icon: PhoneCall },
  audits: { label: '简历审核', icon: FilePenLine },
  'review-audits': { label: '评价审核', icon: MessageSquare },
  commission: { label: '佣金配置', icon: DollarSign },
  settlement: { label: '分账管理', icon: Wallet },
  hall: { label: '订单大厅', icon: Home },
  orders: { label: '订单管理', icon: ClipboardList },
  recommendations: { label: '推荐记录', icon: Handshake },
  students: { label: '学员管理', icon: Users },
  courses: { label: '课程管理', icon: GraduationCap },
  'course-schedules': { label: '课表管理', icon: Calendar },
  'course-grading': { label: '课程考核', icon: ClipboardList },
  notifications: { label: '消息通知', icon: Bell },
  contracts: { label: '合同管理', icon: FileSignature },
  'contract-templates': { label: '合同模板', icon: FileText },
  'lead-contracts': { label: '学员合同', icon: FileSignature },
  'training-contracts': { label: '培训合同', icon: FileText },
  team: { label: '团队管理', icon: Users },
  venues: { label: '场地管理', icon: MapPin },
  settings: { label: '系统设置', icon: Settings },
  'profile-settings': { label: '个人设置', icon: UserCog },
  'reset-password': { label: '重置密码', icon: KeyRound },
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

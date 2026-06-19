'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Star,
  Bell,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/client/orders', label: '我的订单', icon: ClipboardList },
  { href: '/client/reviews', label: '评价管理', icon: Star },
  { href: '/client/notifications', label: '消息通知', icon: Bell },
  { href: '/admin/profile-settings', label: '个人设置', icon: UserCog },
];

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_userid');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('miniapp_token');
    localStorage.removeItem('miniapp_userid');
    localStorage.removeItem('miniapp_role');
    router.push('/admin/login');
  };

  return (
    <aside className={cn(
      'flex flex-col border-r border-slate-200 bg-white transition-all duration-200',
      collapsed ? 'w-16' : 'w-56'
    )}>
      <div className="flex items-center justify-between h-14 px-4 border-b border-slate-200">
        {!collapsed && <span className="font-semibold text-sm text-[#1e3a5f]">客户中心</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-slate-100 rounded">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative',
                isActive
                  ? 'text-[#1e3a5f] bg-slate-100 font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#1e3a5f]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>退出登录</span>}
        </button>
      </div>
    </aside>
  );
}

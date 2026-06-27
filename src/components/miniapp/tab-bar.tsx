'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useMiniApp } from './context';
import {
  Home,
  Briefcase,
  User,
  MessageSquare,
  Star,
  Users,
  FileText,
  ClipboardList,
  UserCheck,
} from 'lucide-react';

interface TabItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleTabs: Record<string, TabItem[]> = {
  worker: [
    { href: '/m/worker', label: '首页', icon: Home },
    { href: '/m/worker/jobs', label: '接单', icon: Briefcase },
    { href: '/m/worker/customers', label: '客户', icon: Users },
    { href: '/m/worker/reviews', label: '评价', icon: Star },
    { href: '/m/worker/profile', label: '我的', icon: User },
  ],
  agent: [
    { href: '/m/agent', label: '首页', icon: Home },
    { href: '/m/agent/workers', label: '阿姨', icon: Users },
    { href: '/m/agent/customers', label: '客户', icon: UserCheck },
    { href: '/m/agent/reviews', label: '评价', icon: Star },
    { href: '/m/agent/profile', label: '我的', icon: User },
  ],
  recruiter: [
    { href: '/m/recruiter', label: '首页', icon: Home },
    { href: '/m/recruiter/follow', label: '线索', icon: ClipboardList },
    { href: '/m/recruiter/workers', label: '阿姨', icon: Users },
    { href: '/m/recruiter/reviews', label: '评价', icon: Star },
    { href: '/m/recruiter/profile', label: '我的', icon: User },
  ],
  instructor: [
    { href: '/m/instructor', label: '首页', icon: Home },
    { href: '/m/instructor/follow', label: '课程', icon: ClipboardList },
    { href: '/m/instructor/workers', label: '阿姨', icon: Users },
    { href: '/m/instructor/reviews', label: '评价', icon: Star },
    { href: '/m/instructor/profile', label: '我的', icon: User },
  ],
  customer: [
    { href: '/m/customer', label: '首页', icon: Home },
    { href: '/m/customer/orders', label: '订单', icon: Briefcase },
    { href: '/m/customer/contracts', label: '合同', icon: FileText },
    { href: '/m/customer/reviews', label: '评价', icon: Star },
    { href: '/m/customer/profile', label: '我的', icon: User },
  ],
  worker_operator: [
    { href: '/m/worker_operator', label: '首页', icon: Home },
    { href: '/m/worker_operator/workers', label: '阿姨', icon: Users },
    { href: '/m/worker_operator/hall', label: '合单大厅', icon: Briefcase },
    { href: '/m/worker_operator/reviews', label: '评价', icon: Star },
    { href: '/m/worker_operator/profile', label: '我的', icon: User },
  ],
  training_supervisor: [
    { href: '/m/training_supervisor', label: '首页', icon: Home },
    { href: '/m/training_supervisor/leads', label: '线索', icon: Users },
    { href: '/m/training_supervisor/courses', label: '课程', icon: FileText },
    { href: '/m/training_supervisor/reviews', label: '评价', icon: Star },
    { href: '/m/training_supervisor/profile', label: '我的', icon: User },
  ],
};

export default function MiniAppTabBar() {
  const pathname = usePathname();
  const { currentRole } = useMiniApp();

  if (!currentRole) return null;

  const tabs = roleTabs[currentRole] || [];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex items-center justify-around h-14 z-50 max-w-lg mx-auto">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== `/m/${currentRole}` && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1 px-3 text-xs transition-colors',
              isActive ? 'text-amber-600' : 'text-slate-400'
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

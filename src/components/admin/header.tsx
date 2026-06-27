'use client';

import React from 'react';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import NotificationBell from './notification-bell';

const roleLabels: Record<string, string> = {
  admin: '平台管理',
  agent: '经纪人',
  recruiter: '招生代理',
  instructor: '讲师',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
  worker: '阿姨',
};

export default function AdminHeader() {
  const userName = typeof window !== 'undefined' ? localStorage.getItem('auth_username') || localStorage.getItem('miniapp_username') || '管理员' : '管理员';
  const userRole = typeof window !== 'undefined' ? localStorage.getItem('auth_role') || localStorage.getItem('miniapp_role') || 'admin' : 'admin';

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索阿姨、经纪人、订单..."
            className="pl-9 w-80"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-2 pl-4 border-l">
          <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="text-sm">
            <div className="font-medium">{userName}</div>
            <div className="text-xs text-muted-foreground">{roleLabels[userRole] || userRole}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

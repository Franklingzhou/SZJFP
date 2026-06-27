'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Clock, Info, ShoppingBag, BookOpen, FileCheck, Megaphone, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  system: <Info className="h-3.5 w-3.5" />,
  order: <ShoppingBag className="h-3.5 w-3.5" />,
  course: <BookOpen className="h-3.5 w-3.5" />,
  review: <FileCheck className="h-3.5 w-3.5" />,
  resume_review: <FileCheck className="h-3.5 w-3.5" />,
  contract: <FileCheck className="h-3.5 w-3.5" />,
  worker: <Megaphone className="h-3.5 w-3.5" />,
  referral: <Gift className="h-3.5 w-3.5" />,
};

const TYPE_BG: Record<string, string> = {
  system: 'bg-slate-100 text-slate-700',
  order: 'bg-blue-100 text-blue-700',
  course: 'bg-indigo-100 text-indigo-700',
  review: 'bg-purple-100 text-purple-700',
  resume_review: 'bg-purple-100 text-purple-700',
  contract: 'bg-amber-100 text-amber-700',
  worker: 'bg-green-100 text-green-700',
  referral: 'bg-pink-100 text-pink-700',
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return d.toLocaleDateString();
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.ok) {
        setNotifications(data.data || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadNotifications();
    // 定时刷新（每30秒）
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: true }),
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n =>
        fetch(`/api/notifications/${n.id}`, {
          method: 'PATCH',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read: true }),
        })
      ));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  const handleOpenAll = () => {
    setOpen(false);
    router.push('/admin/notifications');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">消息通知</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-amber-600 hover:text-amber-700"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  全部已读
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleOpenAll}
              >
                查看全部
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400">加载中...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">暂无通知</p>
              </div>
            ) : (
              notifications.slice(0, 10).map(notif => {
                const typeClass = TYPE_BG[notif.type] || 'bg-gray-100 text-gray-700';
                const typeIcon = TYPE_ICONS[notif.type] || <Info className="h-3.5 w-3.5" />;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      'px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors',
                      !notif.is_read && 'bg-amber-50/50'
                    )}
                    onClick={() => !notif.is_read && handleMarkRead(notif.id, {} as React.MouseEvent)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn('p-1.5 rounded-md shrink-0', typeClass)}>
                        {typeIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', !notif.is_read && 'text-slate-900')}>
                          {notif.title}
                        </p>
                        {notif.content && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.content}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {formatTime(notif.created_at)}
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-1" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

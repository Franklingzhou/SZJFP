'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Clock, Info, ShoppingBag, BookOpen, FileCheck, Megaphone } from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

type TypeTab = 'all' | 'system' | 'order' | 'course' | 'review' | 'contract' | 'worker';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  system: { label: '系统', icon: <Info className="h-3.5 w-3.5" />, color: 'bg-slate-100 text-slate-700' },
  order: { label: '订单', icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-700' },
  course: { label: '课程', icon: <BookOpen className="h-3.5 w-3.5" />, color: 'bg-indigo-100 text-indigo-700' },
  course_review: { label: '审核', icon: <FileCheck className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700' },
  review: { label: '审核', icon: <FileCheck className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700' },
  resume_review: { label: '审核', icon: <FileCheck className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-700' },
  contract: { label: '合同', icon: <FileCheck className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700' },
  contract_expiring: { label: '合同', icon: <FileCheck className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-700' },
  worker: { label: '阿姨', icon: <Megaphone className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700' },
  worker_pause_request: { label: '阿姨', icon: <Megaphone className="h-3.5 w-3.5" />, color: 'bg-green-100 text-green-700' },
  fee_overdue: { label: '费用', icon: <Info className="h-3.5 w-3.5" />, color: 'bg-red-100 text-red-700' },
};

const TYPE_TABS: { key: TypeTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'system', label: '系统' },
  { key: 'order', label: '订单' },
  { key: 'course', label: '课程' },
  { key: 'review', label: '审核' },
  { key: 'contract', label: '合同' },
  { key: 'worker', label: '阿姨' },
];

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

function getTypeDisplay(type: string): { label: string; icon: React.ReactNode; color: string } {
  // 先精确匹配
  if (TYPE_CONFIG[type]) return TYPE_CONFIG[type];
  // 前缀匹配
  for (const [key, config] of Object.entries(TYPE_CONFIG)) {
    if (type.startsWith(key)) return config;
  }
  return { label: type, icon: <Info className="h-3.5 w-3.5" />, color: 'bg-slate-100 text-slate-700' };
}

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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeTab, setTypeTab] = useState<TypeTab>('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders(false) });
      const result = await res.json();
      if (result.success && result.data) {
        setNotifications(result.data);
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error('加载通知失败:', e);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_read: true }),
      });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (e) {
      console.error('标记已读失败:', e);
    }
  }

  async function handleMarkAllRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    setMarkingAll(true);
    try {
      await Promise.all(
        unreadIds.map(id =>
          fetch(`/api/notifications/${id}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_read: true }),
          })
        )
      );
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error('全部已读失败:', e);
    } finally {
      setMarkingAll(false);
    }
  }

  // 筛选
  const filtered = notifications.filter(n => {
    if (typeTab === 'all') return true;
    if (typeTab === 'review') return n.type === 'review' || n.type === 'course_review' || n.type === 'resume_review';
    if (typeTab === 'contract') return n.type === 'contract' || n.type === 'contract_expiring';
    if (typeTab === 'worker') return n.type === 'worker' || n.type === 'worker_pause_request';
    return n.type === typeTab || n.type.startsWith(typeTab);
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const tabCounts: Record<TypeTab, number> = {
    all: notifications.length,
    system: notifications.filter(n => n.type === 'system').length,
    order: notifications.filter(n => n.type === 'order').length,
    course: notifications.filter(n => n.type === 'course').length,
    review: notifications.filter(n => n.type === 'review' || n.type === 'course_review' || n.type === 'resume_review').length,
    contract: notifications.filter(n => n.type === 'contract' || n.type === 'contract_expiring').length,
    worker: notifications.filter(n => n.type === 'worker' || n.type === 'worker_pause_request').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">消息通知</h1>
          <p className="text-sm text-muted-foreground mt-1">
            查看系统通知、订单消息、课程提醒等
            {unreadCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">{unreadCount} 条未读</span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || markingAll}
        >
          <CheckCheck className="h-4 w-4" />
          {markingAll ? '处理中...' : '全部已读'}
        </Button>
      </div>

      {/* 类型Tab */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTypeTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              typeTab === tab.key
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white text-slate-600 border hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {/* 通知列表 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            暂无通知消息
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const typeInfo = getTypeDisplay(notif.type);
            return (
              <Card
                key={notif.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !notif.is_read
                    ? 'border-l-4 border-l-amber-400 bg-amber-50/30'
                    : 'opacity-75'
                }`}
                onClick={() => !notif.is_read && handleMarkRead(notif.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 类型图标 */}
                    <div className={`p-2 rounded-lg shrink-0 ${typeInfo.color}`}>
                      {typeInfo.icon}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notif.title}
                        </span>
                        <Badge className={`text-xs ${typeInfo.color}`}>
                          {typeInfo.label}
                        </Badge>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </div>
                      {notif.content && (
                        <p className={`text-sm mt-1 ${!notif.is_read ? 'text-slate-700' : 'text-slate-400'}`}>
                          {notif.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(notif.created_at)}</span>
                      </div>
                    </div>

                    {/* 操作 */}
                    {!notif.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                      >
                        标为已读
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

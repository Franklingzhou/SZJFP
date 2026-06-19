'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bell, Check, MessageSquare, FileText, ShoppingCart, Shield } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Notification { id: string; type: string; title: string; content?: string; is_read: boolean; link?: string; created_at: string; }

export default function WorkerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.success) setNotifications(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ is_read: true }) });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(notifications.filter(n => !n.is_read).map(n =>
        fetch(`/api/notifications/${n.id}`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ is_read: true }) })
      ));
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };

  const typeMap: Record<string, { icon: React.ReactNode; color: string }> = {
    system: { icon: <Bell className="w-4 h-4" />, color: 'text-blue-500' },
    order: { icon: <ShoppingCart className="w-4 h-4" />, color: 'text-amber-500' },
    review: { icon: <MessageSquare className="w-4 h-4" />, color: 'text-green-500' },
    contract: { icon: <FileText className="w-4 h-4" />, color: 'text-purple-500' },
    application: { icon: <Shield className="w-4 h-4" />, color: 'text-orange-500' },
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1e3a5f]">消息通知</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-[#1e3a5f] hover:underline">全部标为已读 ({unreadCount})</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无消息</div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const t = typeMap[n.type] || typeMap.system;
            return (
              <div key={n.id}
                className={cn('bg-white rounded-lg border p-4 flex items-start gap-3 cursor-pointer hover:shadow-sm transition-shadow',
                  n.is_read ? 'border-slate-100' : 'border-[#1e3a5f]/20 bg-blue-50/30'
                )}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className={cn('mt-0.5', t.color)}>{t.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm', n.is_read ? 'text-slate-600' : 'font-medium text-slate-900')}>{n.title}</span>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  {n.content && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.content}</p>}
                  <div className="text-xs text-slate-300 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.is_read && <Check className="w-4 h-4 text-slate-300 hover:text-green-500" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

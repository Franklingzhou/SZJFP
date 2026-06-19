'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bell, Check, MessageSquare, FileText, Package, Star } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Notification { id: string; type: string; title: string; content: string | null; is_read: boolean; link: string | null; created_at: string; }

export default function ClientNotificationsPage() {
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

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ is_read: true }) });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      for (const n of notifications.filter(n => !n.is_read)) { await markAsRead(n.id); }
    } catch (e) { console.error(e); }
  };

  const typeIcons: Record<string, React.ReactNode> = {
    system: <Bell className="w-4 h-4 text-blue-500" />,
    order: <Package className="w-4 h-4 text-amber-500" />,
    review: <Star className="w-4 h-4 text-green-500" />,
    contract: <FileText className="w-4 h-4 text-purple-500" />,
    application: <MessageSquare className="w-4 h-4 text-cyan-500" />,
  };

  const unread = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#1e3a5f]">消息通知 {unread > 0 && <span className="text-sm font-normal text-amber-600">({unread}条未读)</span>}</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm text-[#1e3a5f] hover:underline flex items-center gap-1">
            <Check className="w-4 h-4" />全部已读
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无消息</div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={cn('bg-white rounded-lg border p-4 cursor-pointer transition-colors',
                n.is_read ? 'border-slate-100' : 'border-amber-200 bg-amber-50/30'
              )}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcons[n.type] || typeIcons.system}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={cn('text-sm', n.is_read ? 'text-slate-600' : 'text-slate-900 font-medium')}>{n.title}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-2">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  {n.content && <p className="text-xs text-slate-500 mt-1">{n.content}</p>}
                </div>
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-amber-500 mt-2 shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

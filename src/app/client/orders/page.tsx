'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Package, Star, Clock, CheckCircle } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Order { id: string; title: string; job_type: string; status: string; salary_min?: number; salary_max?: number; location?: string; created_at: string; }

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const loadOrders = async () => {
    try {
      const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
      const res = await fetch(`/api/orders?customer_id=${userId}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.data) setOrders(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadOrders(); }, []);

  const filtered = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab);

  const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    created: { label: '待匹配', color: 'text-amber-600 bg-amber-50', icon: <Clock className="w-3.5 h-3.5" /> },
    matching: { label: '匹配中', color: 'text-blue-600 bg-blue-50', icon: <Package className="w-3.5 h-3.5" /> },
    signed: { label: '已签约', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    completed: { label: '已完成', color: 'text-slate-500 bg-slate-50', icon: <Star className="w-3.5 h-3.5" /> },
  };

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'created', label: '待匹配' },
    { key: 'matching', label: '匹配中' },
    { key: 'signed', label: '已签约' },
    { key: 'completed', label: '已完成' },
  ];

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6">我的订单</h1>

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={cn('px-3 py-1.5 rounded-full text-sm transition-colors',
              activeTab === t.key ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}>{t.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无订单</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const s = statusMap[o.status] || statusMap.created;
            return (
              <div key={o.id} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{o.title}</h3>
                  <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs', s.color)}>{s.icon}{s.label}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-500">
                  <div>工种: {o.job_type}</div>
                  {o.salary_min && <div>薪资: {o.salary_min}{o.salary_max ? `-${o.salary_max}` : '+'}元</div>}
                  {o.location && <div>地点: {o.location}</div>}
                  <div>创建: {new Date(o.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Briefcase, DollarSign, Send, Clock, CheckCircle, XCircle } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Order { id: string; title: string; job_type: string; salary_min?: number; salary_max?: number; location?: string; description?: string; status: string; created_at: string; }

const jobTypes = ['全部', '保姆', '月嫂', '育儿嫂', '钟点工', '护工', '保洁', '早教'];

export default function WorkerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [jobFilter, setJobFilter] = useState('全部');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams({ status: 'created' });
      if (jobFilter !== '全部') params.set('job_type', jobFilter);
      const res = await fetch(`/api/orders?${params}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.success) setOrders(data.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadOrders(); }, [jobFilter]);

  const handleApply = async (orderId: string) => {
    try {
      const res = await fetch('/api/worker-applications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ order_id: orderId, message }),
      });
      const data = await res.json();
      if (data.success) {
        alert('投递成功');
        setApplyingId(null);
        setMessage('');
      } else {
        alert('投递失败: ' + (data.error || ''));
      }
    } catch { alert('投递失败'); }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6">订单大厅</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {jobTypes.map(jt => (
          <button key={jt} onClick={() => setJobFilter(jt)}
            className={cn('px-3 py-1.5 rounded-full text-sm transition-colors',
              jobFilter === jt ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}>{jt}</button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无可投递订单</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-sm">{order.title}</h3>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{order.job_type}</span>
              </div>
              {order.salary_min && <div className="flex items-center gap-1 text-sm text-[#f59e0b] mb-1"><DollarSign className="w-3.5 h-3.5" />{order.salary_min}-{order.salary_max || '?'}元/月</div>}
              {order.location && <div className="flex items-center gap-1 text-sm text-slate-500 mb-1"><MapPin className="w-3.5 h-3.5" />{order.location}</div>}
              {order.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{order.description}</p>}
              <div className="mt-3 flex justify-end">
                {applyingId === order.id ? (
                  <div className="w-full space-y-2">
                    <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="留言（可选）" className="w-full px-3 py-2 border rounded-md text-sm" rows={2} />
                    <div className="flex gap-2">
                      <button onClick={() => handleApply(order.id)} className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded-md text-xs hover:bg-[#163050]">确认投递</button>
                      <button onClick={() => { setApplyingId(null); setMessage(''); }} className="px-3 py-1.5 border rounded-md text-xs hover:bg-slate-50">取消</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setApplyingId(order.id)} className="px-3 py-1.5 bg-[#f59e0b] text-white rounded-md text-xs hover:bg-[#d97706] flex items-center gap-1">
                    <Send className="w-3.5 h-3.5" />投递
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

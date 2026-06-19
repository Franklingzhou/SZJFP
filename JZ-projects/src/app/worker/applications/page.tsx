'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Application { id: string; order_id: string; order_title?: string; status: string; message?: string; created_at: string; }
interface Signing { id: string; order_id: string; order_title?: string; salary: number; service_fee: number; contract_start_date: string; contract_end_date: string; status: string; signed_at: string; }

export default function WorkerApplicationsPage() {
  const [tab, setTab] = useState<'applications' | 'signings'>('applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [signings, setSignings] = useState<Signing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
      const [appRes, signRes] = await Promise.all([
        fetch(`/api/worker-applications?worker_id=${userId}`, { headers: getAuthHeaders(false) }),
        fetch(`/api/order-signings?worker_id=${userId}`, { headers: getAuthHeaders(false) }),
      ]);
      const appData = await appRes.json();
      const signData = await signRes.json();
      if (appData.success) setApplications(appData.data || []);
      if (signData.success) setSignings(signData.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: '待处理', color: 'text-amber-600 bg-amber-50', icon: <Clock className="w-3.5 h-3.5" /> },
    accepted: { label: '已接受', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    rejected: { label: '已拒绝', color: 'text-red-600 bg-red-50', icon: <XCircle className="w-3.5 h-3.5" /> },
    withdrawn: { label: '已撤回', color: 'text-slate-500 bg-slate-100', icon: <XCircle className="w-3.5 h-3.5" /> },
    active: { label: '生效中', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    replaced: { label: '已替换', color: 'text-slate-500 bg-slate-100', icon: <XCircle className="w-3.5 h-3.5" /> },
    terminated: { label: '已终止', color: 'text-red-600 bg-red-50', icon: <XCircle className="w-3.5 h-3.5" /> },
  };

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6">投递记录</h1>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(['applications', 'signings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm rounded-md transition-colors',
              tab === t ? 'bg-white text-[#1e3a5f] font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>{t === 'applications' ? '我的投递' : '我的签约'}</button>
        ))}
      </div>

      {tab === 'applications' && (
        applications.length === 0 ? <div className="text-center py-12 text-slate-400">暂无投递记录</div> : (
          <div className="space-y-3">
            {applications.map(app => {
              const s = statusMap[app.status] || statusMap.pending;
              return (
                <div key={app.id} className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{app.order_title || `订单 ${app.order_id.slice(0, 8)}`}</div>
                    {app.message && <div className="text-xs text-slate-400 mt-1">留言: {app.message}</div>}
                    <div className="text-xs text-slate-400 mt-1">{new Date(app.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs', s.color)}>{s.icon}{s.label}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === 'signings' && (
        signings.length === 0 ? <div className="text-center py-12 text-slate-400">暂无签约记录</div> : (
          <div className="space-y-3">
            {signings.map(sg => {
              const s = statusMap[sg.status] || statusMap.active;
              return (
                <div key={sg.id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{sg.order_title || `订单 ${sg.order_id.slice(0, 8)}`}</span>
                    <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs', s.color)}>{s.icon}{s.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                    <div><FileText className="w-3 h-3 inline mr-1" />薪资: {sg.salary}元</div>
                    <div>服务费: {sg.service_fee}元</div>
                    <div>{sg.contract_start_date} ~ {sg.contract_end_date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Contract { id: string; title: string; contract_type?: string; party_b?: string; status: string; start_date?: string; end_date?: string; amount?: number; created_at: string; }

export default function WorkerContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadContracts(); }, []);

  const loadContracts = async () => {
    try {
      const res = await fetch('/api/contracts', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.success) setContracts(data.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: '草稿', color: 'text-slate-500 bg-slate-100', icon: <FileText className="w-3.5 h-3.5" /> },
    signed: { label: '已签署', color: 'text-blue-600 bg-blue-50', icon: <Clock className="w-3.5 h-3.5" /> },
    active: { label: '生效中', color: 'text-green-600 bg-green-50', icon: <CheckCircle className="w-3.5 h-3.5" /> },
    terminated: { label: '已终止', color: 'text-red-600 bg-red-50', icon: <XCircle className="w-3.5 h-3.5" /> },
    expired: { label: '已到期', color: 'text-slate-400 bg-slate-50', icon: <Clock className="w-3.5 h-3.5" /> },
  };

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6">我的合同</h1>

      {contracts.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无合同记录</div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => {
            const s = statusMap[c.status] || statusMap.draft;
            return (
              <div key={c.id} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-sm">{c.title}</h3>
                  <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs', s.color)}>{s.icon}{s.label}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
                  {c.contract_type && <div>类型: {c.contract_type}</div>}
                  {c.party_b && <div>乙方: {c.party_b}</div>}
                  {c.amount && <div>金额: {c.amount}元</div>}
                  {c.start_date && <div>{c.start_date} ~ {c.end_date || '长期'}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

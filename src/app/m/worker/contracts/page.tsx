'use client';

import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  platform_agent: '平台-经纪人合同',
  platform_recruiter: '平台-招生代理合同',
  platform_instructor: '平台-讲师合同',
  recruiter_student: '招生-学员合同',
};

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  platform_agent: 'bg-blue-100 text-blue-800',
  platform_recruiter: 'bg-purple-100 text-purple-800',
  platform_instructor: 'bg-green-100 text-green-800',
  recruiter_student: 'bg-amber-100 text-amber-800',
};

interface Contract {
  id: string;
  title: string;
  type: string;
  party_b_name: string;
  party_b_phone: string;
  signed_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export default function WorkerContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
    if (token) headers['x-session'] = token;
    return headers;
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts?status=signed', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.data) {
        setContracts(result.data);
      } else {
        setContracts([]);
      }
    } catch (err) {
      console.error('加载合同失败:', err);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }

  const selected = contracts.find(c => c.id === selectedId);

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-400">加载中...</div>;
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">我的合同</h1>

      {contracts.length === 0 ? (
        <div className="text-center py-10">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">暂无已签署合同</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedId(c.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-slate-800 text-sm">{c.title || '未命名合同'}</p>
                  <Badge className={`text-xs mt-1 ${CONTRACT_TYPE_COLORS[c.type] || 'bg-slate-100 text-slate-700'}`}>
                    {CONTRACT_TYPE_LABELS[c.type] || c.type}
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div>乙方：{c.party_b_name || '-'}</div>
                {c.signed_at && <div>签署日期：{new Date(c.signed_at).toLocaleDateString()}</div>}
                {c.end_date && <div>到期日期：{new Date(c.end_date).toLocaleDateString()}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>合同详情</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-xs">合同标题</span>
                  <p className="font-medium">{selected.title || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">合同类型</span>
                  <p><Badge className={`text-xs ${CONTRACT_TYPE_COLORS[selected.type] || 'bg-slate-100 text-slate-700'}`}>{CONTRACT_TYPE_LABELS[selected.type] || selected.type}</Badge></p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">乙方姓名</span>
                  <p className="font-medium">{selected.party_b_name || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">乙方电话</span>
                  <p className="font-medium">{selected.party_b_phone || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">签署日期</span>
                  <p>{selected.signed_at ? new Date(selected.signed_at).toLocaleDateString() : '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">到期日期</span>
                  <p>{selected.end_date ? new Date(selected.end_date).toLocaleDateString() : '-'}</p>
                </div>
                {selected.start_date && (
                  <div>
                    <span className="text-slate-400 text-xs">开始日期</span>
                    <p>{new Date(selected.start_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

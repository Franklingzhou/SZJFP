'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: '已通过', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

export default function WorkerRecommendationsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecords(); }, []);

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
    if (token) headers['x-session'] = token;
    return headers;
  }

  async function loadRecords() {
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations', { headers: getAuthHeaders() });
      const result = await res.json();
      setRecords(result.data || result.recommendations || []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">自荐记录</h1>

      {loading ? (
        <div className="text-center py-10 text-slate-400">加载中...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-10">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">暂无自荐记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800 text-sm">
                    {rec.order_title || rec.order_id || '未知订单'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {rec.notes || rec.rejection_reason || '-'}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : '-'}
                  </div>
                </div>
                <Badge className={STATUS_CONFIG[rec.status]?.color || 'bg-slate-100'}>
                  {rec.status === 'accepted' ? <CheckCircle className="h-3 w-3 mr-1" /> : 
                   rec.status === 'rejected' ? <XCircle className="h-3 w-3 mr-1" /> : null}
                  {STATUS_CONFIG[rec.status]?.label || rec.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

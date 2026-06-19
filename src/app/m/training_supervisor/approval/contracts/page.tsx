'use client';

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Phone, BookOpen, RefreshCw, DollarSign } from 'lucide-react';

// v7: 合同审批页 - 改用API加载真实合同数据
// 合同流程：招生发起(draft) → 学员签署(signed) → 主管确认到账(active) = 已签约
// 驳回：rejected

interface Contract {
  id: string;
  title: string;
  type: string;
  party_a_id: string;
  party_b_name: string;
  party_b_phone: string;
  party_b_id_card: string;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  signed_at: string | null;
}

export default function TrainingSupervisorContractApprovalPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'signed' | 'active' | 'rejected'>('signed');

  async function loadContracts() {
    setLoading(true);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/contracts', { headers });
      const result = await res.json();
      if (result.data) {
        setContracts(result.data);
      }
    } catch (e) {
      console.error('加载合同失败:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadContracts(); }, []);

  // 待审批 = 学员已签署，等主管确认到账
  const pendingContracts = contracts.filter(c => c.status === 'signed');
  // 已签约 = 主管确认费用到账
  const activeContracts = contracts.filter(c => c.status === 'active');
  // 已驳回
  const rejectedContracts = contracts.filter(c => c.status === 'rejected');

  const displayContracts = tab === 'signed' ? pendingContracts : tab === 'active' ? activeContracts : rejectedContracts;

  const handleConfirm = async (contractId: string, approved: boolean) => {
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/contracts', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          id: contractId,
          status: approved ? 'active' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null,
        }),
      });
      await loadContracts();
      alert(approved ? '已确认费用到账，合同已签约' : '合同已驳回');
    } catch (e) {
      console.error('审批失败:', e);
      alert('操作失败，请重试');
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: '待学员签署',
      signed: '学员已签-待确认到账',
      active: '已签约',
      rejected: '已驳回',
    };
    return map[status] || status;
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-blue-50 text-blue-700',
      signed: 'bg-amber-50 text-amber-700',
      active: 'bg-green-50 text-green-700',
      rejected: 'bg-red-50 text-red-700',
    };
    return map[status] || 'bg-slate-50 text-slate-600';
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-slate-400">加载中...</div>;
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-slate-800">合同审批</h1>
        <button onClick={loadContracts} className="text-slate-400 hover:text-slate-600">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('signed')} className={`px-3 py-1.5 rounded-full text-xs ${tab === 'signed' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-white text-slate-500 border border-slate-200'}`}>
          待确认到账 {pendingContracts.length > 0 && `(${pendingContracts.length})`}
        </button>
        <button onClick={() => setTab('active')} className={`px-3 py-1.5 rounded-full text-xs ${tab === 'active' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white text-slate-500 border border-slate-200'}`}>
          已签约
        </button>
        <button onClick={() => setTab('rejected')} className={`px-3 py-1.5 rounded-full text-xs ${tab === 'rejected' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-white text-slate-500 border border-slate-200'}`}>
          已驳回
        </button>
      </div>

      <div className="space-y-3">
        {displayContracts.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-slate-800">{c.title || c.party_b_name || '未命名合同'}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.party_b_phone || '-'}</span>
                  {c.type && <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {c.type}</span>}
                  {c.signed_at && <span className="text-green-600">学员已签 {c.signed_at.split('T')[0]}</span>}
                </div>
              </div>
              {c.price != null && <span className="text-sm font-semibold text-amber-600">¥{c.price}</span>}
            </div>

            {c.status === 'signed' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleConfirm(c.id, true)}
                  className="flex-1 py-2 bg-green-500 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                >
                  <DollarSign className="h-3.5 w-3.5" /> 确认到账
                </button>
                <button
                  onClick={() => handleConfirm(c.id, false)}
                  className="flex-1 py-2 bg-red-500 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" /> 驳回
                </button>
              </div>
            )}
          </div>
        ))}
        {displayContracts.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">
            {tab === 'signed' ? '暂无待确认到账的合同' : tab === 'active' ? '暂无已签约合同' : '暂无已驳回合同'}
          </p>
        )}
      </div>
    </div>
  );
}

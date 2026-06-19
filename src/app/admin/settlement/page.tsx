'use client';

import React, { useState, useEffect } from 'react';
import { Search, DollarSign, Users, Percent, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn, formatCurrency } from '@/lib/utils';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

const SETTLEMENT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: '待分账', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  settled: { label: '已分账', color: 'bg-green-100 text-green-800 border-green-200' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-800 border-red-200' },
};

const DEFAULT_RATES = { creator: 30, maintainer: 40, recommender: 30 };

export default function SettlementPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchOrder, setSearchOrder] = useState('');

  const [editRecord, setEditRecord] = useState<any>(null);
  const [editRates, setEditRates] = useState({ creator: 30, maintainer: 40, recommender: 30 });
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/commission-settlements'
        : `/api/commission-settlements?status=${statusFilter}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();
      setRecords(result.ok ? result.data : []);
    } catch (err) {
      console.error('[settlement load] error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [statusFilter]);

  const filtered = records.filter(r =>
    !searchOrder || r.order_title?.includes(searchOrder) || r.order_id?.includes(searchOrder)
  );

  const handleEdit = (record: any) => {
    setEditRecord(record);
    setEditRates({
      creator: Number(record.creator_rate) || DEFAULT_RATES.creator,
      maintainer: Number(record.maintainer_rate) || DEFAULT_RATES.maintainer,
      recommender: Number(record.recommender_rate) || DEFAULT_RATES.recommender,
    });
    setShowEdit(true);
  };

  const handleSaveRates = async () => {
    if (!editRecord) return;
    const total = editRates.creator + editRates.maintainer + editRates.recommender;
    if (Math.abs(total - 100) > 0.01) {
      alert('分账比例总和必须为100%');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/commission-settlements/${editRecord.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          creator_rate: editRates.creator,
          maintainer_rate: editRates.maintainer,
          recommender_rate: editRates.recommender,
          status: 'settled',
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setShowEdit(false);
        loadData();
      } else {
        alert(result.error || '保存失败');
      }
    } catch (err) {
      console.error('[settlement save] error:', err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('确认取消该分账记录？')) return;
    try {
      const res = await fetch(`/api/commission-settlements/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      });
      const result = await res.json();
      if (result.ok) loadData();
      else alert(result.error || '操作失败');
    } catch (err) {
      console.error('[settlement cancel] error:', err);
    }
  };

  const tabs = [
    { key: 'all', label: '全部', count: records.length },
    { key: 'pending', label: '待分账', count: records.filter(r => r.status === 'pending').length },
    { key: 'settled', label: '已分账', count: records.filter(r => r.status === 'settled').length },
    { key: 'cancelled', label: '已取消', count: records.filter(r => r.status === 'cancelled').length },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">分账管理</h1>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <DollarSign className="w-4 h-4 text-amber-500" />
          默认比例：创建人30% / 维护人40% / 推荐人30%
        </div>
      </div>

      {/* Tab筛选 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              statusFilter === tab.key
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="搜索订单号/名称..."
          value={searchOrder}
          onChange={e => setSearchOrder(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无分账记录</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(record => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    {/* 头部 */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-slate-800">
                        {record.order_title || record.order_id || '未知订单'}
                      </h3>
                      <Badge className={cn(
                        'text-xs px-2 py-0.5 rounded-full border',
                        SETTLEMENT_STATUS[record.status]?.color || 'bg-slate-100'
                      )}>
                        {SETTLEMENT_STATUS[record.status]?.label || record.status}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(record.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* 订单信息 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">订单号</div>
                        <div className="text-sm font-mono text-slate-600 truncate">{record.order_id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">阿姨</div>
                        <div className="text-sm text-slate-700">{record.worker_name || '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">总金额</div>
                        <div className="text-sm font-semibold text-slate-800">
                          {formatCurrency(record.total_amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">结算时间</div>
                        <div className="text-sm text-slate-600">
                          {record.settled_at ? new Date(record.settled_at).toLocaleDateString() : '-'}
                        </div>
                      </div>
                    </div>

                    {/* 分账明细 */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-slate-700">分账明细</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-xs text-slate-400 mb-1">创建人</div>
                          <div className="text-sm font-semibold text-blue-600">{record.creator_rate || DEFAULT_RATES.creator}%</div>
                          <div className="text-xs text-slate-500 mt-0.5">{record.creator_name || '—'}</div>
                          <div className="text-xs text-slate-500">
                            {formatCurrency(record.total_amount * (record.creator_rate || DEFAULT_RATES.creator) / 100)}
                          </div>
                        </div>
                        <div className="text-center border-x border-slate-200">
                          <div className="text-xs text-slate-400 mb-1">维护人</div>
                          <div className="text-sm font-semibold text-emerald-600">{record.maintainer_rate || DEFAULT_RATES.maintainer}%</div>
                          <div className="text-xs text-slate-500 mt-0.5">{record.maintainer_name || '—'}</div>
                          <div className="text-xs text-slate-500">
                            {formatCurrency(record.total_amount * (record.maintainer_rate || DEFAULT_RATES.maintainer) / 100)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-400 mb-1">推荐人</div>
                          <div className="text-sm font-semibold text-purple-600">{record.recommender_rate || DEFAULT_RATES.recommender}%</div>
                          <div className="text-xs text-slate-500 mt-0.5">{record.recommender_name || '—'}</div>
                          <div className="text-xs text-slate-500">
                            {formatCurrency(record.total_amount * (record.recommender_rate || DEFAULT_RATES.recommender) / 100)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex flex-col gap-2 ml-4">
                    {record.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => handleEdit(record)}>
                          <Percent className="w-3.5 h-3.5 mr-1" /> 分账
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200"
                          onClick={() => handleCancel(record.id)}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> 取消
                        </Button>
                      </>
                    )}
                    {record.status === 'settled' && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> 已分账
                      </Badge>
                    )}
                    {record.status === 'cancelled' && (
                      <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1">
                        <XCircle className="w-3.5 h-3.5 mr-1" /> 已取消
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分账编辑弹窗 */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-500" />
              调整分账比例
            </DialogTitle>
          </DialogHeader>
          {editRecord && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-slate-500">
                订单：{editRecord.order_title || editRecord.order_id}
              </div>
              <div className="text-sm text-slate-500">
                总金额：{formatCurrency(editRecord.total_amount)}
              </div>

              {/* 比例滑块 */}
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-600">创建人比例</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="number" min={0} max={100}
                      value={editRates.creator}
                      onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        setEditRates(prev => ({ ...prev, creator: Math.min(100, Math.max(0, v)) }));
                      }}
                      className="w-24 text-center" />
                    <span className="text-slate-500">%</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${editRates.creator}%` }} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-600">维护人比例</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="number" min={0} max={100}
                      value={editRates.maintainer}
                      onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        setEditRates(prev => ({ ...prev, maintainer: Math.min(100, Math.max(0, v)) }));
                      }}
                      className="w-24 text-center" />
                    <span className="text-slate-500">%</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${editRates.maintainer}%` }} />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-600">推荐人比例</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input type="number" min={0} max={100}
                      value={editRates.recommender}
                      onChange={e => {
                        const v = parseInt(e.target.value) || 0;
                        setEditRates(prev => ({ ...prev, recommender: Math.min(100, Math.max(0, v)) }));
                      }}
                      className="w-24 text-center" />
                    <span className="text-slate-500">%</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${editRates.recommender}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 总和 */}
              <div className={cn(
                'p-3 rounded-lg text-center font-semibold',
                Math.abs(editRates.creator + editRates.maintainer + editRates.recommender - 100) < 0.01
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              )}>
                总和：{editRates.creator + editRates.maintainer + editRates.recommender}%
                {Math.abs(editRates.creator + editRates.maintainer + editRates.recommender - 100) < 0.01
                  ? ' ✓ 等于100%'
                  : ' ✗ 必须等于100%'}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleSaveRates} disabled={saving}>
              {saving ? '保存中...' : '确认分账'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
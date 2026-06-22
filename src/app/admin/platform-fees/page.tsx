'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Banknote, CheckCircle, Clock, AlertCircle, Send, Plus, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';

interface PlatformFee {
  id: string;
  order_id: string;
  contract_id: string | null;
  contract_type: string | null;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  payer_id?: string | null;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

const FEE_TYPE_LABELS: Record<string, string> = {
  agency: '中介费 (20%)',
  training: '培训费 (20%)',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: '待支付', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
  confirmed: { label: '已到账', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  overdue: { label: '已逾期', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
};

export default function PlatformFeesPage() {
  const [fees, setFees] = useState<PlatformFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchOrder, setSearchOrder] = useState('');
  const [message, setMessage] = useState('');

  // Create fee dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    order_id: '',
    contract_id: '',
    contract_type: 'agency',
    amount: 0,
  });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/platform-fees'
        : `/api/platform-fees?status=${statusFilter}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();
      setFees(result.ok ? result.data : []);
    } catch (err) {
      console.error('[platform-fees] load error:', err);
      setFees([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleConfirm = async (id: string) => {
    if (!confirm('确认该笔费用已到账？')) return;
    try {
      const res = await fetch(`/api/platform-fees/${id}/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (result.ok) {
        setMessage('确认到账成功');
        loadData();
      } else {
        setMessage(result.error || '操作失败');
      }
    } catch (err) {
      setMessage('网络错误');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreate = async () => {
    if (!createForm.order_id) { setMessage('请输入订单号'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/platform-fees', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(createForm),
      });
      const result = await res.json();
      if (result.ok) {
        setShowCreate(false);
        setCreateForm({ order_id: '', contract_id: '', contract_type: 'agency', amount: 0 });
        setMessage('平台费创建成功');
        loadData();
      } else {
        setMessage(result.error || '创建失败');
      }
    } catch (err) {
      setMessage('网络错误');
    } finally {
      setCreating(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRemind = async (fee: PlatformFee) => {
    try {
      // 查询关联订单获取实际应付人
      let payerId: string | null = fee.payer_id || null;
      if (fee.order_id && !payerId) {
        try {
          const orderRes = await fetch(`/api/orders?id=${fee.order_id}`, { headers: getAuthHeaders() });
          const orderResult = await orderRes.json();
          const orders = orderResult.ok ? (orderResult.data || []) : [];
          if (orders.length > 0) {
            payerId = orders[0].customer_id || orders[0].agent_id || orders[0].worker_id || null;
          }
        } catch { /* 查询失败忽略 */ }
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: payerId || 'admin001',  // 有应付人则发给他，否则发给管理员
          type: 'fee_reminder',
          title: `平台费催缴提醒`,
          content: `订单 ${fee.order_id} 的${FEE_TYPE_LABELS[fee.contract_type || 'agency']}尚未支付（金额：${formatCurrency(fee.amount)}），请尽快处理。`,
          related_id: fee.id,
          related_type: 'platform_fee',
        }),
      });
      const result = await res.json();
      setMessage(result.ok ? (payerId ? '催缴通知已发送至应缴费用户' : '催缴通知已发送') : (result.error || '发送失败'));
    } catch (err) {
      setMessage('网络错误');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const filtered = fees.filter(f =>
    !searchOrder || f.order_id?.includes(searchOrder) || f.contract_id?.includes(searchOrder)
  );

  // Stats
  const totalAmount = fees.reduce((s, f) => s + Number(f.amount), 0);
  const pendingAmount = fees.filter(f => f.status === 'pending').reduce((s, f) => s + Number(f.amount), 0);
  const confirmedAmount = fees.filter(f => f.status === 'confirmed').reduce((s, f) => s + Number(f.amount), 0);
  const overdueCount = fees.filter(f => f.status === 'overdue').length;

  const tabs = [
    { key: 'all', label: '全部', count: fees.length },
    { key: 'pending', label: '待支付', count: fees.filter(r => r.status === 'pending').length },
    { key: 'confirmed', label: '已到账', count: fees.filter(r => r.status === 'confirmed').length },
    { key: 'overdue', label: '已逾期', count: fees.filter(r => r.status === 'overdue').length },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">平台收费管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理培训费（20%）和中介费（20%）的收取与核销</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> 新增平台费
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">总金额</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">待收取</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">已到账</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(confirmedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">已逾期</p>
            <p className="text-xl font-bold text-red-600">{overdueCount}<span className="text-sm font-normal text-red-400"> 笔</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Message */}
      {message && (
        <div className={cn('p-3 rounded-lg text-sm', message.includes('成功') || message.includes('已发送') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message}
        </div>
      )}

      {/* Tabs */}
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="搜索订单号/合同号..."
          value={searchOrder}
          onChange={e => setSearchOrder(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无平台收费记录</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(fee => {
            const StatusIcon = STATUS_CONFIG[fee.status]?.icon || Clock;
            return (
              <Card key={fee.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Banknote className="w-5 h-5 text-amber-500" />
                        <h3 className="font-semibold text-slate-800">
                          {FEE_TYPE_LABELS[fee.contract_type || 'agency'] || fee.contract_type}
                        </h3>
                        <Badge className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_CONFIG[fee.status]?.color || 'bg-slate-100')}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {STATUS_CONFIG[fee.status]?.label || fee.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">订单号</div>
                          <div className="text-sm font-mono text-slate-600 truncate">{fee.order_id}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">合同号</div>
                          <div className="text-sm text-slate-600">{fee.contract_id || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">金额</div>
                          <div className="text-sm font-semibold text-amber-600">{formatCurrency(fee.amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">创建时间</div>
                          <div className="text-sm text-slate-600">
                            {new Date(fee.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {fee.status === 'confirmed' && fee.paid_at && (
                        <div className="text-xs text-green-600">
                          到账时间：{new Date(fee.paid_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {fee.status === 'pending' && (
                        <>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => handleConfirm(fee.id)}>
                            <CheckCircle className="w-3.5 h-3.5 mr-1" /> 确认到账
                          </Button>
                          <Button size="sm" variant="outline" className="text-amber-600 border-amber-300"
                            onClick={() => handleRemind(fee)}>
                            <Send className="w-3.5 h-3.5 mr-1" /> 催缴
                          </Button>
                        </>
                      )}
                      {fee.status === 'confirmed' && (
                        <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> 已到账
                        </Badge>
                      )}
                      {fee.status === 'overdue' && (
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200"
                          onClick={() => handleRemind(fee)}>
                          <Send className="w-3.5 h-3.5 mr-1" /> 催缴
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              新增平台收费
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="order_id">订单号 *</Label>
              <Input
                id="order_id"
                placeholder="输入订单ID"
                value={createForm.order_id}
                onChange={e => setCreateForm(prev => ({ ...prev, order_id: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="contract_id">合同号</Label>
              <Input
                id="contract_id"
                placeholder="关联合同号（选填）"
                value={createForm.contract_id}
                onChange={e => setCreateForm(prev => ({ ...prev, contract_id: e.target.value }))}
              />
            </div>
            <div>
              <Label>费用类型</Label>
              <Select
                value={createForm.contract_type}
                onValueChange={v => setCreateForm(prev => ({ ...prev, contract_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">中介费 (20%)</SelectItem>
                  <SelectItem value="training">培训费 (20%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">金额</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={0.01}
                placeholder="输入金额"
                value={createForm.amount || ''}
                onChange={e => setCreateForm(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleCreate} disabled={creating || !createForm.order_id}>
              {creating ? '创建中...' : '确认创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

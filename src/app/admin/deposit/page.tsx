'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, CreditCard, Plus, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  note: string | null;
  created_at: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
  phone: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

const DEPOSIT_TYPE_LABELS: Record<string, string> = {
  deposit: '保证金缴纳',
  additional: '追加保证金',
  refund: '退还保证金',
  freeze: '冻结保证金',
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: '已缴纳', color: 'bg-green-100 text-green-800 border-green-200' },
  refunded: { label: '已退还', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  frozen: { label: '已冻结', color: 'bg-orange-100 text-orange-800 border-orange-200' },
};

export default function DepositPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [message, setMessage] = useState('');

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ user_id: '', amount: 0, type: 'deposit', note: '' });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all'
        ? '/api/deposits?limit=500'
        : `/api/deposits?status=${statusFilter}&limit=500`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();
      setDeposits(result.ok ? result.data : []);
    } catch (err) {
      console.error('[deposits] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=500', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.ok) setUsers(result.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleStatusChange = async (id: string, newStatus: string, note?: string) => {
    try {
      const res = await fetch('/api/deposits', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: newStatus, note }),
      });
      const result = await res.json();
      if (result.ok) {
        setMessage(`${STATUS_CONFIG[newStatus]?.label || newStatus} 操作成功`);
        loadData();
      } else {
        setMessage(result.error || '操作失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreate = async () => {
    if (!createForm.user_id || !createForm.amount) {
      setMessage('请选择用户并输入金额');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(createForm),
      });
      const result = await res.json();
      if (result.ok) {
        setShowCreate(false);
        setCreateForm({ user_id: '', amount: 0, type: 'deposit', note: '' });
        setMessage('保证金创建成功');
        loadData();
      } else {
        setMessage(result.error || '创建失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setCreating(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getUserInfo = (userId: string) => users.find(u => u.id === userId);

  const filtered = deposits.filter(d =>
    !searchText || d.user_id?.includes(searchText) || d.id?.includes(searchText) || d.note?.includes(searchText)
  );

  // Stats
  const totalAmount = deposits.reduce((s, d) => s + Number(d.amount), 0);
  const paidAmount = deposits.filter(d => d.status === 'paid').reduce((s, d) => s + Number(d.amount), 0);
  const refundedAmount = deposits.filter(d => d.status === 'refunded').reduce((s, d) => s + Number(d.amount), 0);
  const frozenAmount = deposits.filter(d => d.status === 'frozen').reduce((s, d) => s + Number(d.amount), 0);

  const tabs = [
    { key: 'all', label: '全部', count: deposits.length },
    { key: 'paid', label: '已缴纳', count: deposits.filter(r => r.status === 'paid').length },
    { key: 'refunded', label: '已退还', count: deposits.filter(r => r.status === 'refunded').length },
    { key: 'frozen', label: '已冻结', count: deposits.filter(r => r.status === 'frozen').length },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">保证金管理</h1>
          <p className="text-sm text-slate-500 mt-1">管理所有角色（阿姨/经纪人/招生/讲师/运营/培训主管）的保证金收取、退还与冻结</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> 新增保证金
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">总金额</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">已缴纳</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">已退还</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(refundedAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">已冻结</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(frozenAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-slate-500">总笔数</p>
            <p className="text-xl font-bold text-slate-800">{deposits.length}<span className="text-sm font-normal text-slate-400"> 笔</span></p>
          </CardContent>
        </Card>
      </div>

      {/* Message */}
      {message && (
        <div className={cn('p-3 rounded-lg text-sm', message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
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
          placeholder="搜索用户ID/记录号..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无保证金记录</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => {
            const user = getUserInfo(item.user_id);
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CreditCard className="w-5 h-5 text-amber-500" />
                        <h3 className="font-semibold text-slate-800">
                          {user ? user.name : item.user_id}
                        </h3>
                        <Badge className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_CONFIG[item.status]?.color || 'bg-slate-100')}>
                          {STATUS_CONFIG[item.status]?.label || item.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {DEPOSIT_TYPE_LABELS[item.type] || item.type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">用户ID</div>
                          <div className="text-xs font-mono text-slate-500 truncate">{item.user_id}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">角色</div>
                          <div className="text-sm text-slate-600">{user?.role || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">手机号</div>
                          <div className="text-sm text-slate-600">{user?.phone || '-'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">金额</div>
                          <div className="text-sm font-semibold text-amber-600">{formatCurrency(item.amount)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-400 mb-0.5">时间</div>
                          <div className="text-sm text-slate-600">
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {item.note && (
                        <div className="text-xs text-slate-400 mt-1">备注：{item.note}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {item.status === 'paid' && (
                        <>
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-300"
                            onClick={() => handleStatusChange(item.id, 'refunded')}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> 退还
                          </Button>
                          <Button size="sm" variant="outline" className="text-orange-600 border-orange-300"
                            onClick={() => handleStatusChange(item.id, 'frozen')}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> 冻结
                          </Button>
                        </>
                      )}
                      {item.status === 'frozen' && (
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300"
                          onClick={() => handleStatusChange(item.id, 'paid')}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> 解冻
                        </Button>
                      )}
                      {item.status === 'refunded' && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 px-3 py-1">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> 已退还
                        </Badge>
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
              新增保证金
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>用户 *</Label>
              <Select
                value={createForm.user_id}
                onValueChange={v => setCreateForm(prev => ({ ...prev, user_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择用户" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'customer').map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>类型</Label>
              <Select
                value={createForm.type}
                onValueChange={v => setCreateForm(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">保证金缴纳</SelectItem>
                  <SelectItem value="additional">追加保证金</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">金额 *</Label>
              <Input
                id="amount"
                type="number"
                min={0}
                step={100}
                placeholder="输入金额"
                value={createForm.amount || ''}
                onChange={e => setCreateForm(prev => ({ ...prev, amount: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="note">备注</Label>
              <Input
                id="note"
                placeholder="备注信息（选填）"
                value={createForm.note}
                onChange={e => setCreateForm(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleCreate} disabled={creating || !createForm.user_id || !createForm.amount}>
              {creating ? '创建中...' : '确认创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

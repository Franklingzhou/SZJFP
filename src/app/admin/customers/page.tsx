'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, Phone, MapPin, Edit, Trash2, UserCircle, MessageSquare } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  status: string;
  source: string | null;
  requirement: string | null;
  address: string | null;
  credit_score: number | null;
  agent_id: string | null;
  created_at: string;
  updated_at: string | null;
}

type StatusTab = 'all' | 'new' | 'following' | 'matching' | 'converted' | 'completed' | 'closed';

const STATUS_LABELS: Record<string, string> = {
  new: '新客户',
  following: '跟进中',
  matching: '匹配中',
  converted: '已转化',
  completed: '已完成',
  closed: '已关闭',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  following: 'bg-yellow-100 text-yellow-800',
  matching: 'bg-indigo-100 text-indigo-800',
  converted: 'bg-green-100 text-green-800',
  completed: 'bg-slate-100 text-slate-700',
  closed: 'bg-red-100 text-red-800',
};

const STATUS_TABS: { key: StatusTab; label: string; color: string }[] = [
  { key: 'all', label: '全部', color: 'bg-slate-600' },
  { key: 'new', label: '新客户', color: 'bg-blue-500' },
  { key: 'following', label: '跟进中', color: 'bg-yellow-500' },
  { key: 'matching', label: '匹配中', color: 'bg-indigo-500' },
  { key: 'converted', label: '已转化', color: 'bg-green-500' },
  { key: 'completed', label: '已完成', color: 'bg-slate-500' },
  { key: 'closed', label: '已关闭', color: 'bg-red-500' },
];

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: '转介绍', label: '转介绍' },
  { value: '网络', label: '网络' },
  { value: '电话', label: '电话' },
  { value: '门店', label: '门店' },
  { value: '其他', label: '其他' },
];

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [sourceFilter, setSourceFilter] = useState('');

  // 新建/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', requirement: '', address: '', source: '', status: 'new' });
  const [saving, setSaving] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('name', searchTerm);
      if (statusTab !== 'all') params.set('status', statusTab);
      if (sourceFilter) params.set('source', sourceFilter);

      const res = await fetch(`/api/customers?${params.toString()}`, {
        headers: getAuthHeaders(false),
      });
      const result = await res.json();
      if (result.data) {
        setCustomers(result.data);
      } else {
        setCustomers([]);
        if (result.error) setError(result.error);
      }
    } catch (e) {
      console.error('加载客户失败:', e);
      setError('加载失败，请重试');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusTab, sourceFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // 打开新建弹窗
  const openCreate = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', requirement: '', address: '', source: '', status: 'new' });
    setShowForm(true);
  };

  // 打开编辑弹窗
  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      requirement: customer.requirement || '',
      address: customer.address || '',
      source: customer.source || '',
      status: customer.status,
    });
    setShowForm(true);
  };

  // 保存（新建/编辑）
  const handleSave = async () => {
    if (!formData.name || !formData.phone) return;
    setSaving(true);
    try {
      if (editingCustomer) {
        const res = await fetch('/api/customers', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: editingCustomer.id, ...formData }),
        });
        const result = await res.json();
        if (!result.success) {
          alert(result.error || '更新失败');
          return;
        }
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        });
        const result = await res.json();
        if (!result.success) {
          alert(result.error || '创建失败');
          return;
        }
      }
      setShowForm(false);
      loadData();
    } catch (e) {
      console.error('保存失败:', e);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      });
      const result = await res.json();
      if (!result.success) {
        alert(result.error || '删除失败');
        return;
      }
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      console.error('删除失败:', e);
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // P4-1/E16: 手机号脱敏
  const maskPhone = (phone: string) => {
    if (phone.length >= 7) {
      return phone.slice(0, 3) + '****' + phone.slice(-4);
    }
    return phone;
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理平台所有客户信息</p>
        </div>
        <Button className="gap-1" onClick={openCreate}>
          <Plus className="h-4 w-4" /> 新增客户
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索姓名、手机号..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 border rounded-md text-sm bg-white"
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
            >
              {SOURCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 状态Tab */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  statusTab === tab.key
                    ? `${tab.color} text-white`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center text-red-500">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={loadData}>重试</Button>
          </CardContent>
        </Card>
      )}

      {loading && !error && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">加载中...</CardContent>
        </Card>
      )}

      {!loading && !error && customers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <UserCircle className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            暂无客户数据
          </CardContent>
        </Card>
      )}

      {!loading && !error && customers.length > 0 && (
        <>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">客户信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">来源</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">需求</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <UserCircle className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {maskPhone(customer.phone)}
                            </span>
                            {customer.address && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {customer.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={`text-xs ${STATUS_COLORS[customer.status] || 'bg-slate-100 text-slate-700'}`}>
                        {STATUS_LABELS[customer.status] || customer.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{customer.source || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate">
                      {customer.requirement || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(customer.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-blue-600" title="发消息">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-blue-600" title="编辑" onClick={() => openEdit(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-slate-400 hover:text-red-600" title="删除" onClick={() => setDeleteTarget(customer)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>共 {customers.length} 条记录</span>
          </div>
        </>
      )}

      {/* 新建/编辑弹窗 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '编辑客户' : '新增客户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>姓名 *</Label>
                <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="客户姓名" />
              </div>
              <div>
                <Label>手机号 *</Label>
                <Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="手机号码" />
              </div>
            </div>
            <div>
              <Label>地址</Label>
              <Input value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="客户地址" />
            </div>
            <div>
              <Label>来源</Label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                value={formData.source}
                onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}
              >
                <option value="">请选择来源</option>
                {SOURCE_OPTIONS.filter(o => o.value).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>状态</Label>
              <select
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
                value={formData.status}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>需求描述</Label>
              <textarea
                className="w-full px-3 py-2 border rounded-md text-sm min-h-[80px] resize-y"
                value={formData.requirement}
                onChange={e => setFormData(p => ({ ...p, requirement: e.target.value }))}
                placeholder="客户需求描述..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.phone}>
              {saving ? '保存中...' : editingCustomer ? '保存修改' : '创建客户'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            确定要删除客户「{deleteTarget?.name}」({deleteTarget?.phone}) 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

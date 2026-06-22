'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, UserCircle, Phone, MapPin, Calendar, Edit, ToggleLeft, ToggleRight, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  status: string;
  source: string | null;
  agent_id: string | null;
  requirement: string | null;
  address: string | null;
  created_at: string;
  updated_at: string | null;
}

interface FollowRecord {
  content: string;
  result: string;
  time: string;
}

type StatusTab = 'all' | 'new' | 'following' | 'matching' | 'converted' | 'completed' | 'closed';
type CustomerTypeTab = 'all' | 'personal' | 'enterprise';

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

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: '转介绍', label: '转介绍' },
  { value: '网络', label: '网络' },
  { value: '电话', label: '电话' },
  { value: '门店', label: '门店' },
  { value: '其他', label: '其他' },
];

const FOLLOW_RESULT_OPTIONS = ['有意向', '跟进中', '已成交', '流失'];

const JOB_TYPE_OPTIONS = ['保姆', '月嫂', '育婴师', '钟点工', '保洁', '护工'];

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [sourceFilter, setSourceFilter] = useState('');

  // 新建/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    source: '',
    requirement: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [customerTypeTab, setCustomerTypeTab] = useState<CustomerTypeTab>('all');

  // 展开行
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 跟进记录
  const [followRecords, setFollowRecords] = useState<Record<string, FollowRecord[]>>({});
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followTarget, setFollowTarget] = useState<Customer | null>(null);
  const [followContent, setFollowContent] = useState('');
  const [followResult, setFollowResult] = useState('有意向');

  // 一键发单
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderTarget, setOrderTarget] = useState<Customer | null>(null);
  const [orderForm, setOrderForm] = useState({ job_type: '保姆', salary: '', address: '', remark: '' });
  const [orderSaving, setOrderSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers', { headers: getAuthHeaders(false) });
      const result = await res.json();
      if (result.data) setCustomers(result.data);
    } catch (e) {
      console.error('客户数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', source: '', requirement: '', address: '' });
    setShowForm(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      source: customer.source || '',
      requirement: customer.requirement || '',
      address: customer.address || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('姓名和电话为必填项');
      return;
    }
    setSaving(true);
    try {
      if (editingCustomer) {
        const res = await fetch('/api/customers', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id: editingCustomer.id,
            name: formData.name,
            phone: formData.phone,
            source: formData.source || null,
            requirement: formData.requirement || null,
            address: formData.address || null,
          }),
        });
        const result = await res.json();
        if (result.success) { setShowForm(false); loadData(); }
        else { alert('更新失败：' + (result.error || '请重试')); }
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            source: formData.source || null,
            requirement: formData.requirement || null,
            address: formData.address || null,
          }),
        });
        const result = await res.json();
        if (result.success) { setShowForm(false); loadData(); }
        else { alert('创建失败：' + (result.error || '请重试')); }
      }
    } catch (e) {
      console.error('保存失败:', e);
      alert('操作失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = customer.status === 'lost' ? 'new' : 'lost';
    const confirmMsg = newStatus === 'lost' ? '确认将该客户标记为已流失？' : '确认恢复该客户？';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: customer.id, status: newStatus }),
      });
      const result = await res.json();
      if (result.success) { loadData(); }
      else { alert('操作失败：' + (result.error || '请重试')); }
    } catch (e) {
      console.error('状态切换失败:', e);
      alert('操作失败，请重试');
    }
  };

  // 提交跟进
  const handleSubmitFollow = () => {
    if (!followContent.trim() || !followTarget) return;
    const records = { ...followRecords };
    if (!records[followTarget.id]) records[followTarget.id] = [];
    records[followTarget.id] = [
      { content: followContent, result: followResult, time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
      ...records[followTarget.id],
    ];
    setFollowRecords(records);
    setFollowContent('');
    setFollowResult('有意向');
    setShowFollowModal(false);
    setFollowTarget(null);
  };

  // 一键发单
  const handleCreateOrder = (customer: Customer) => {
    setOrderTarget(customer);
    setOrderForm({
      job_type: '保姆',
      salary: '',
      address: customer.address || '',
      remark: customer.requirement || '',
    });
    setShowOrderModal(true);
  };

  const handleSubmitOrder = async () => {
    if (!orderTarget) return;
    setOrderSaving(true);
    try {
      const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
      const salaryParts = orderForm.salary.split('-');
      const salaryMin = salaryParts[0] ? parseInt(salaryParts[0]) : undefined;
      const salaryMax = salaryParts[1] ? parseInt(salaryParts[1]) : salaryMin;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: `${orderForm.job_type}服务 - ${orderTarget.name}`,
          job_type: orderForm.job_type,
          salary_min: salaryMin,
          salary_max: salaryMax,
          location: orderForm.address,
          description: orderForm.remark,
          agent_id: userId,
          customer_id: orderTarget.id,
          contact_name: orderTarget.name,
          contact_phone: orderTarget.phone,
          status: 'created',
        }),
      });
      const result = await res.json();
      if (result.success || result.data) {
        setShowOrderModal(false);
        alert('发单成功！订单已创建，客户状态已更新为"已下单"');
        loadData(); // 刷新列表以显示状态变化
      } else {
        alert('发单失败：' + (result.error || '请重试') + (result.detail ? ': ' + result.detail : ''));
      }
    } catch (e) {
      console.error('发单失败:', e);
      alert('发单失败，请重试');
    } finally {
      setOrderSaving(false);
    }
  };

  // 筛选：含客户类型Tab
  const filtered = customers.filter(c => {
    const matchType = customerTypeTab === 'all' ||
      (customerTypeTab === 'personal' && c.source !== '企业') ||
      (customerTypeTab === 'enterprise' && c.source === '企业');
    const matchStatus = statusTab === 'all' || c.status === statusTab;
    const matchSource = !sourceFilter || c.source === sourceFilter;
    const matchSearch = !searchTerm ||
      (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchType && matchStatus && matchSource && matchSearch;
  });

  const tabCounts = {
    all: customers.length,
    new: customers.filter(c => c.status === 'new').length,
    following: customers.filter(c => c.status === 'following').length,
    matching: customers.filter(c => c.status === 'matching').length,
    converted: customers.filter(c => c.status === 'converted').length,
    completed: customers.filter(c => c.status === 'completed').length,
    closed: customers.filter(c => c.status === 'closed').length,
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理客户信息、跟进记录、一键发单</p>
        </div>
        <Button size="sm" className="gap-1" onClick={openCreateForm}>
          <Plus className="h-4 w-4" /> 新建客户
        </Button>
      </div>

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、电话..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {SOURCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 客户类型Tab */}
      <div className="flex gap-2 mb-2">
        {([
          { key: 'all' as const, label: '全部客户' },
          { key: 'personal' as const, label: '个人客户' },
          { key: 'enterprise' as const, label: '企业客户' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setCustomerTypeTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              customerTypeTab === tab.key
                ? 'bg-amber-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 状态Tab */}
      <div className="flex gap-2">
        {([
          { key: 'all' as StatusTab, label: '全部', color: 'bg-slate-600' },
          { key: 'new' as StatusTab, label: '新客户', color: 'bg-blue-500' },
          { key: 'following' as StatusTab, label: '跟进中', color: 'bg-yellow-500' },
          { key: 'matching' as StatusTab, label: '匹配中', color: 'bg-indigo-500' },
          { key: 'converted' as StatusTab, label: '已转化', color: 'bg-green-500' },
          { key: 'completed' as StatusTab, label: '已完成', color: 'bg-gray-500' },
          { key: 'closed' as StatusTab, label: '已关闭', color: 'bg-red-500' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusTab === tab.key
                ? `${tab.color} text-white shadow-sm`
                : 'bg-white text-slate-600 border hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {/* 客户列表 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">暂无客户记录</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(customer => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* 头部行：姓名+状态+操作按钮 */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                      {customer.name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{customer.name}</span>
                        <Badge className={`text-xs ${STATUS_COLORS[customer.status] || 'bg-slate-100 text-slate-800'}`}>
                          {STATUS_LABELS[customer.status] || customer.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone || '-'}</span>
                        {customer.source && <span>来源：{customer.source}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                      onClick={(e) => { e.stopPropagation(); openEditForm(customer); }}
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600"
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(customer); }}
                      title={customer.status === 'lost' ? '恢复' : '标记流失'}
                    >
                      {customer.status === 'lost' ? (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </button>
                    {expandedId === customer.id ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 ml-1" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
                    )}
                  </div>
                </div>

                {/* 展开详情 */}
                {expandedId === customer.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    {/* 基本信息 */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {customer.address && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>创建于 {customer.created_at?.slice(0, 10) || '-'}</span>
                      </div>
                    </div>
                    {customer.requirement && (
                      <div className="p-2 bg-slate-50 rounded text-sm text-slate-600">
                        需求：{customer.requirement}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => { setFollowTarget(customer); setShowFollowModal(true); }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> 跟进内容
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={() => handleCreateOrder(customer)}
                      >
                        <Send className="h-3.5 w-3.5" /> 一键发单
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-slate-600 border-slate-200 hover:bg-slate-50"
                        onClick={() => window.open(`/admin/orders?customer_id=${customer.id}`, '_blank')}
                      >
                        <Calendar className="h-3.5 w-3.5" /> 查看订单
                      </Button>
                    </div>

                    {/* 跟进记录 */}
                    {followRecords[customer.id] && followRecords[customer.id].length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 mb-2 font-medium">跟进记录</div>
                        {followRecords[customer.id].map((r, i) => (
                          <div key={i} className="text-sm text-slate-600 py-1.5 border-b border-slate-100 last:border-0">
                            <span className="text-slate-400 text-xs">{r.time}</span>{' '}
                            <span className="text-amber-600 text-xs">[{r.result}]</span>{' '}
                            {r.content}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '编辑客户' : '新建客户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>姓名 *</Label>
              <Input className="mt-1" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="客户姓名" />
            </div>
            <div>
              <Label>电话 *</Label>
              <Input className="mt-1" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="手机号码" />
            </div>
            <div>
              <Label>来源</Label>
              <select className="mt-1 w-full rounded-md border p-2 text-sm" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })}>
                <option value="">请选择</option>
                <option value="转介绍">转介绍</option>
                <option value="网络">网络</option>
                <option value="电话">电话</option>
                <option value="门店">门店</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <Label>地址</Label>
              <Input className="mt-1" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="客户地址" />
            </div>
            <div>
              <Label>需求备注</Label>
              <textarea
                className="mt-1 w-full rounded-md border p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={formData.requirement}
                onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                placeholder="客户需求描述..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving || !formData.name.trim() || !formData.phone.trim()}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 跟进内容弹窗 */}
      <Dialog open={showFollowModal} onOpenChange={(open) => { if (!open) { setShowFollowModal(false); setFollowTarget(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>跟进内容 {followTarget ? `- ${followTarget.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>跟进内容</Label>
              <textarea
                className="mt-1 w-full rounded-md border p-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="请输入本次跟进内容..."
                value={followContent}
                onChange={(e) => setFollowContent(e.target.value)}
              />
            </div>
            <div>
              <Label>跟进结果</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {FOLLOW_RESULT_OPTIONS.map(s => (
                  <button
                    key={s}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                      followResult === s
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    onClick={() => setFollowResult(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFollowModal(false); setFollowTarget(null); }}>取消</Button>
            <Button onClick={handleSubmitFollow} disabled={!followContent.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
              提交跟进
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 一键发单弹窗 */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>一键发单 {orderTarget ? `- ${orderTarget.name}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <span className="text-blue-700">客户：</span>
              <span className="font-medium">{orderTarget?.name}</span>
              <span className="text-blue-600 ml-2">{orderTarget?.phone}</span>
            </div>
            <div>
              <Label>工种 *</Label>
              <select
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={orderForm.job_type}
                onChange={(e) => setOrderForm({ ...orderForm, job_type: e.target.value })}
              >
                {JOB_TYPE_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <Label>薪资（元/月）</Label>
              <Input
                className="mt-1"
                placeholder="如：6000-8000"
                value={orderForm.salary}
                onChange={(e) => setOrderForm({ ...orderForm, salary: e.target.value })}
              />
            </div>
            <div>
              <Label>工作地址</Label>
              <Input
                className="mt-1"
                placeholder="详细地址"
                value={orderForm.address}
                onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label>备注要求</Label>
              <textarea
                className="mt-1 w-full rounded-md border p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="描述客户的具体需求"
                value={orderForm.remark}
                onChange={(e) => setOrderForm({ ...orderForm, remark: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderModal(false)}>取消</Button>
            <Button onClick={handleSubmitOrder} disabled={orderSaving} className="bg-amber-500 hover:bg-amber-600 text-white">
              {orderSaving ? '发单中...' : '确认发单'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

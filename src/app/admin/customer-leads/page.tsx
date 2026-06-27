'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UserPlus, Eye, Edit, Handshake, Phone, MapPin, DollarSign, User, Users } from 'lucide-react';

interface CustomerLead {
  id: string;
  name: string;
  phone: string;
  gender: string;
  intention: string;
  service_type: string;
  location: string;
  budget: number;
  source: string;
  customer_type: string;
  referrer_id: string;
  assigned_to: string;
  is_public: boolean;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function CustomerLeadsPage() {
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'public' | 'mine'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<CustomerLead | null>(null);
  const [editingLead, setEditingLead] = useState<CustomerLead | null>(null);
  const [editForm, setEditForm] = useState<Partial<CustomerLead>>({});
  const [createForm, setCreateForm] = useState({
    name: '', phone: '', gender: '女', intention: '', service_type: '',
    location: '', budget: '', notes: '',
  });

  function getAuthHeaders() {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    return { 'Content-Type': 'application/json', 'x-session': token || '' };
  }

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams();
      if (tab === 'public') params.set('is_public', 'true');
      if (tab === 'mine') params.set('customer_type', 'personal');

      const res = await fetch(`/api/customer-leads?${params}`, { headers });
      const json = await res.json();
      setLeads(json.data || []);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [tab]);

  const handleCreate = async () => {
    const headers = getAuthHeaders();
    const body = {
      name: createForm.name, phone: createForm.phone, gender: createForm.gender,
      intention: createForm.intention, service_type: createForm.service_type,
      location: createForm.location, budget: Number(createForm.budget) || 0,
      notes: createForm.notes,
    };
    const res = await fetch('/api/customer-leads', { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const json = await res.json().catch(() => ({ error: '创建失败' }));
      alert(json.error || '创建失败');
      return;
    }
    setShowCreate(false);
    setCreateForm({ name: '', phone: '', gender: '女', intention: '', service_type: '', location: '', budget: '', notes: '' });
    fetchLeads();
  };

  const handleUpdate = async () => {
    if (!editingLead) return;
    const headers = getAuthHeaders();
    await fetch('/api/customer-leads', {
      method: 'PUT', headers,
      body: JSON.stringify({ id: editingLead.id, ...editForm }),
    });
    setEditingLead(null);
    fetchLeads();
  };

  const handleClaim = async (lead: CustomerLead) => {
    const headers = getAuthHeaders();
    const res = await fetch('/api/customer-leads', {
      method: 'PUT', headers,
      body: JSON.stringify({ id: lead.id, action: 'claim' }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({ error: '认领失败' }));
      alert(json.error || '认领失败');
      return;
    }
    fetchLeads();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      new: { label: '新客户', color: 'bg-blue-100 text-blue-700' },
      following: { label: '跟进中', color: 'bg-yellow-100 text-yellow-700' },
      matching: { label: '匹配中', color: 'bg-indigo-100 text-indigo-700' },
      converted: { label: '已转化', color: 'bg-green-100 text-green-700' },
      completed: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
      closed: { label: '已关闭', color: 'bg-gray-100 text-gray-500' },
    };
    const m = map[status] || { label: status, color: 'bg-gray-100' };
    return <Badge className={m.color}>{m.label}</Badge>;
  };

  const sourceBadge = (source: string) => {
    return source === 'referral'
      ? <Badge className="bg-purple-100 text-purple-700">推荐</Badge>
      : <Badge className="bg-slate-100 text-slate-600">手动录入</Badge>;
  };

  const customerTypeBadge = (type: string) => {
    return type === 'personal'
      ? <Badge className="bg-cyan-100 text-cyan-700">个人客户</Badge>
      : <Badge className="bg-amber-100 text-amber-700">平台客户</Badge>;
  };

  if (loading) return <div className="p-6 text-slate-400">加载中...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">客户管理</h1>
          <p className="text-sm text-slate-500 mt-1">经纪人个人客户 + 推荐入公海的平台客户，经纪人可认领跟进</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-2" />新增客户线索
        </Button>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部', count: leads.length, color: 'bg-blue-50 text-blue-600' },
          { label: '公海可认领', count: leads.filter(l => l.is_public).length, color: 'bg-amber-50 text-amber-600' },
          { label: '跟进中', count: leads.filter(l => l.status === 'following').length, color: 'bg-yellow-50 text-yellow-600' },
          { label: '已转化', count: leads.filter(l => l.status === 'converted').length, color: 'bg-purple-50 text-purple-600' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', item.color.replace('text-', 'bg-').replace('600', '50'))}>
                <Users className={cn('h-5 w-5', item.color)} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-xl font-bold text-slate-800">{item.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'all', label: '全部客户' },
          { key: 'public', label: '公海（可认领）' },
          { key: 'mine', label: '我的客户' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left p-3 font-medium text-slate-600">姓名</th>
              <th className="text-left p-3 font-medium text-slate-600">手机</th>
              <th className="text-left p-3 font-medium text-slate-600">需求</th>
              <th className="text-left p-3 font-medium text-slate-600">区域</th>
              <th className="text-right p-3 font-medium text-slate-600">预算</th>
              <th className="text-center p-3 font-medium text-slate-600">来源</th>
              <th className="text-center p-3 font-medium text-slate-600">类型</th>
              <th className="text-center p-3 font-medium text-slate-600">状态</th>
              <th className="text-center p-3 font-medium text-slate-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-slate-400">暂无客户线索</td></tr>
            )}
            {leads.map(lead => (
              <tr key={lead.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="p-3 font-medium">
                  <button className="text-blue-600 hover:underline text-left" onClick={() => setShowDetail(lead)}>
                    {lead.name}
                  </button>
                </td>
                <td className="p-3 text-slate-600">{lead.phone || '-'}</td>
                <td className="p-3 text-slate-600 max-w-[150px] truncate">{lead.intention || lead.service_type || '-'}</td>
                <td className="p-3 text-slate-600">{lead.location || '-'}</td>
                <td className="p-3 text-right font-medium">{lead.budget ? `¥${Number(lead.budget).toFixed(0)}` : '-'}</td>
                <td className="p-3 text-center">{sourceBadge(lead.source)}</td>
                <td className="p-3 text-center">{customerTypeBadge(lead.customer_type)}</td>
                <td className="p-3 text-center">{statusBadge(lead.status)}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setShowDetail(lead)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {lead.is_public && (
                      <Button size="sm" variant="outline" onClick={() => handleClaim(lead)}>
                        <Handshake className="h-3 w-3 mr-1" />认领
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEditingLead(lead); setEditForm(lead); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 详情弹窗 */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>客户详情 - {showDetail?.name}</DialogTitle></DialogHeader>
          {showDetail && (
            <div className="space-y-3 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-slate-400">姓名</Label><p className="font-medium">{showDetail.name}</p></div>
                <div><Label className="text-xs text-slate-400">性别</Label><p>{showDetail.gender || '-'}</p></div>
                <div><Label className="text-xs text-slate-400">手机</Label><p>{showDetail.phone || '-'}</p></div>
                <div><Label className="text-xs text-slate-400">地址</Label><p>{showDetail.location || '-'}</p></div>
                <div><Label className="text-xs text-slate-400">服务类型</Label><p>{showDetail.service_type || '-'}</p></div>
                <div><Label className="text-xs text-slate-400">预算</Label><p className="font-medium text-green-600">{showDetail.budget ? `¥${Number(showDetail.budget).toFixed(0)}` : '-'}</p></div>
              </div>
              <div><Label className="text-xs text-slate-400">需求描述</Label><p className="text-sm">{showDetail.intention || '-'}</p></div>
              <div><Label className="text-xs text-slate-400">备注</Label><p className="text-sm text-slate-500">{showDetail.notes || '-'}</p></div>
              <div className="flex gap-2">
                {sourceBadge(showDetail.source)} {customerTypeBadge(showDetail.customer_type)} {statusBadge(showDetail.status)}
                {showDetail.is_public && <Badge className="bg-green-100 text-green-700">公海</Badge>}
              </div>
              <p className="text-xs text-slate-400">创建时间：{new Date(showDetail.created_at).toLocaleString('zh-CN')}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 编辑弹窗 */}
      <Dialog open={!!editingLead} onOpenChange={() => setEditingLead(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>编辑客户线索</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>姓名</Label><Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
              <div><Label>手机</Label><Input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              <div><Label>服务类型</Label><Input value={editForm.service_type || ''} onChange={e => setEditForm({ ...editForm, service_type: e.target.value })} /></div>
              <div><Label>区域</Label><Input value={editForm.location || ''} onChange={e => setEditForm({ ...editForm, location: e.target.value })} /></div>
              <div><Label>预算</Label><Input type="number" value={editForm.budget || ''} onChange={e => setEditForm({ ...editForm, budget: Number(e.target.value) })} /></div>
              <div><Label>状态</Label>
                <Select value={editForm.status || ''} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">新客户</SelectItem>
                    <SelectItem value="following">跟进中</SelectItem>
                    <SelectItem value="matching">匹配中</SelectItem>
                    <SelectItem value="converted">已转化</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="closed">已关闭</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>需求描述</Label><Textarea value={editForm.intention || ''} onChange={e => setEditForm({ ...editForm, intention: e.target.value })} /></div>
            <div><Label>备注</Label><Textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLead(null)}>取消</Button>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新增弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增客户线索</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>姓名 *</Label><Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} /></div>
              <div><Label>手机</Label><Input value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value })} /></div>
              <div><Label>服务类型</Label><Input value={createForm.service_type} onChange={e => setCreateForm({ ...createForm, service_type: e.target.value })} placeholder="月嫂/保姆/育儿嫂..." /></div>
              <div><Label>区域</Label><Input value={createForm.location} onChange={e => setCreateForm({ ...createForm, location: e.target.value })} /></div>
              <div><Label>预算</Label><Input value={createForm.budget} onChange={e => setCreateForm({ ...createForm, budget: e.target.value })} type="number" /></div>
              <div><Label>性别</Label>
                <Select value={createForm.gender} onValueChange={v => setCreateForm({ ...createForm, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="女">女</SelectItem>
                    <SelectItem value="男">男</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>需求描述</Label><Textarea value={createForm.intention} onChange={e => setCreateForm({ ...createForm, intention: e.target.value })} placeholder="客户的具体需求..." /></div>
            <div><Label>备注</Label><Textarea value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!createForm.name}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

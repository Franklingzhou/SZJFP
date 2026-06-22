'use client';

import React, { useState, useEffect } from 'react';
import { Search, FileText, Plus, Eye, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-slate-100 text-slate-500' },
  pending: { label: '待签署', color: 'bg-amber-100 text-amber-800' },
  signed: { label: '已签署', color: 'bg-green-100 text-green-800' },
  active: { label: '生效中', color: 'bg-blue-100 text-blue-800' },
  expired: { label: '已过期', color: 'bg-slate-100 text-slate-500' },
  terminated: { label: '已终止', color: 'bg-red-100 text-red-800' },
};

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function LeadContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 新建合同弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '', type: 'training', party_b_name: '', party_b_id_card: '', party_b_phone: '',
    course_id: '', price: '', start_date: '', end_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 详情弹窗
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  // 退款弹窗
  const [showRefund, setShowRefund] = useState(false);
  const [refundTarget, setRefundTarget] = useState<any>(null);
  const [refundForm, setRefundForm] = useState({ amount: 0, reason: '' });
  const [refunding, setRefunding] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contractRes, courseRes] = await Promise.all([
        fetch('/api/contracts', { headers: getAuthHeaders(false) }),
        fetch('/api/courses', { headers: getAuthHeaders(false) }),
      ]);
      const contractData = await contractRes.json();
      const courseData = await courseRes.json();
      if (contractData.data) setContracts(contractData.data);
      if (courseData.data) setCourses(courseData.data);
    } catch (e) {
      console.error('合同数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget || refundForm.amount <= 0) return;
    setRefunding(true);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          refund_type: 'training_fee',
          amount: refundForm.amount,
          reason: refundForm.reason || null,
          related_type: refundTarget.type === 'training' ? 'lead_contract' : 'contract',
          related_id: refundTarget.id,
          related_name: refundTarget.title || refundTarget.party_b_name || '',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowRefund(false);
        setRefundForm({ amount: 0, reason: '' });
        alert('退款申请已提交，等待管理员审核');
      } else {
        alert('提交失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('提交失败');
    } finally {
      setRefunding(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.party_b_name) { alert('合同标题和乙方姓名必填'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          party_b_name: form.party_b_name,
          party_b_id_card: form.party_b_id_card || null,
          party_b_phone: form.party_b_phone || null,
          course_id: form.course_id || null,
          price: form.price ? parseFloat(form.price) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          status: 'pending',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ title: '', type: 'training', party_b_name: '', party_b_id_card: '', party_b_phone: '', course_id: '', price: '', start_date: '', end_date: '' });
        loadData();
      } else {
        alert('创建失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 筛选
  const filtered = contracts.filter((c: any) => {
    const matchSearch = !search || (c.title || '').includes(search) || (c.party_b_name || '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts: Record<string, number> = { all: contracts.length };
  contracts.forEach((c: any) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  const getCourseName = (id: string) => courses.find((c: any) => c.id === id)?.name || '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">合同管理</h1>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4 mr-2" />新建合同
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="搜索合同标题/乙方..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* 状态Tab */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'pending', label: '待签署' },
          { key: 'signed', label: '已签署' },
          { key: 'active', label: '生效中' },
          { key: 'expired', label: '已过期' },
          { key: 'terminated', label: '已终止' },
        ].map(tab => (
          <Button key={tab.key} variant={statusFilter === tab.key ? 'default' : 'outline'} size="sm"
            onClick={() => setStatusFilter(tab.key)}
            className={statusFilter === tab.key ? 'bg-slate-800' : ''}>
            {tab.label} ({statusCounts[tab.key] || 0})
          </Button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无合同数据</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c: any) => {
            const st = CONTRACT_STATUS[c.status] || { label: c.status, color: 'bg-slate-100 text-slate-500' };
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 line-clamp-1">{c.title}</span>
                    <Badge className={cn('text-xs', st.color)}>{st.label}</Badge>
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{c.type === 'training' ? '培训合同' : c.type || '合同'}</span>
                    </div>
                    <div>乙方: {c.party_b_name || '—'}</div>
                    {c.price != null && <div>金额: ¥{c.price}</div>}
                    {c.start_date && <div>期限: {c.start_date} ~ {c.end_date || '—'}</div>}
                    <div className="text-xs text-slate-400">{c.created_at?.slice(0, 10)}</div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => { setDetail(c); setShowDetail(true); }}>
                      <Eye className="h-3.5 w-3.5 mr-1" />详情
                    </Button>
                    {c.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await fetch('/api/contracts', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: c.id, status: 'signed' }) });
                        loadData();
                      }}>签署</Button>
                    )}
                    {c.status === 'signed' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await fetch('/api/contracts', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: c.id, status: 'active' }) });
                        loadData();
                      }}>生效</Button>
                    )}
                    {c.status === 'active' && (
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={async () => {
                        if (!confirm('确定终止此合同？终止后不可恢复。')) return;
                        await fetch('/api/contracts', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: c.id, status: 'terminated' }) });
                        loadData();
                      }}>终止合同</Button>
                    )}
                    {/* 发起退款（招生可见培训费退款） */}
                    {['signed', 'active'].includes(c.status) && (
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        setRefundTarget(c);
                        setRefundForm({ amount: c.price || 0, reason: '' });
                        setShowRefund(true);
                      }}>
                        <DollarSign className="h-3 w-3 mr-1" />退款
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新建合同弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建合同</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>合同标题 *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="输入合同标题" />
            </div>
            <div>
              <Label>合同类型</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">培训合同</SelectItem>
                  <SelectItem value="service">服务合同</SelectItem>
                  <SelectItem value="employment">就业合同</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>乙方姓名 *</Label>
                <Input value={form.party_b_name} onChange={e => setForm(f => ({ ...f, party_b_name: e.target.value }))} />
              </div>
              <div>
                <Label>乙方电话</Label>
                <Input value={form.party_b_phone} onChange={e => setForm(f => ({ ...f, party_b_phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>身份证号</Label>
              <Input value={form.party_b_id_card} onChange={e => setForm(f => ({ ...f, party_b_id_card: e.target.value }))} />
            </div>
            <div>
              <Label>关联课程</Label>
              <Select value={form.course_id} onValueChange={v => setForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="选择课程（可选）" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>金额</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>开始日期</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>结束日期</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-amber-500 hover:bg-amber-600">
              {submitting ? '创建中...' : '创建合同'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent>
          <DialogHeader><DialogTitle>合同详情</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div><span className="text-slate-500">标题：</span>{detail.title}</div>
              <div><span className="text-slate-500">类型：</span>{detail.type === 'training' ? '培训合同' : detail.type}</div>
              <div><span className="text-slate-500">状态：</span>{CONTRACT_STATUS[detail.status]?.label || detail.status}</div>
              <div><span className="text-slate-500">乙方：</span>{detail.party_b_name}</div>
              {detail.party_b_phone && <div><span className="text-slate-500">电话：</span>{detail.party_b_phone}</div>}
              {detail.party_b_id_card && <div><span className="text-slate-500">身份证：</span>{detail.party_b_id_card}</div>}
              {detail.price != null && <div><span className="text-slate-500">金额：</span>¥{detail.price}</div>}
              {detail.start_date && <div><span className="text-slate-500">期限：</span>{detail.start_date} ~ {detail.end_date || '—'}</div>}
              {detail.course_id && <div><span className="text-slate-500">关联课程：</span>{getCourseName(detail.course_id)}</div>}
              <div><span className="text-slate-500">创建时间：</span>{detail.created_at?.slice(0, 10)}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 退款弹窗 */}
      <Dialog open={showRefund} onOpenChange={setShowRefund}>
        <DialogContent>
          <DialogHeader><DialogTitle>发起退款申请</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              合同：{refundTarget?.title} | 类型：培训费退款
            </p>
            <div>
              <Label>退款金额（元）*</Label>
              <Input type="number" min={1} value={refundForm.amount || ''} onChange={e => setRefundForm(f => ({ ...f, amount: Number(e.target.value) }))} placeholder="输入退款金额" />
            </div>
            <div>
              <Label>退款原因</Label>
              <Textarea value={refundForm.reason} onChange={e => setRefundForm(f => ({ ...f, reason: e.target.value }))} placeholder="请输入退款原因" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefund(false)}>取消</Button>
            <Button onClick={handleRefund} disabled={refunding || refundForm.amount <= 0}>
              {refunding ? '提交中...' : '提交申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

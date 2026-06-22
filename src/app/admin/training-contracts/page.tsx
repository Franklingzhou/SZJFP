'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, FileText, Check, X, Eye, RotateCcw } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_approval: '待审核',
  signed: '已签约',
  active: '生效中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  signed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface TrainingContract {
  id: string;
  course_id: string;
  worker_id: string;
  student_name?: string;
  student_name_resolved?: string;
  course_name?: string;
  course_name_resolved?: string;
  party_a_id?: string;
  party_b_id?: string;
  amount?: number;
  start_date?: string;
  end_date?: string;
  status: string;
  terms?: string;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export default function TrainingContractsPage() {
  const [contracts, setContracts] = useState<TrainingContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<TrainingContract | null>(null);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    course_id: '', worker_id: '', student_name: '', course_name: '',
    party_a_id: '', party_b_id: '', amount: '', start_date: '', end_date: '', terms: '',
  });

  // 退款弹窗
  const [showRefund, setShowRefund] = useState(false);
  const [refundTarget, setRefundTarget] = useState<TrainingContract | null>(null);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [refunding, setRefunding] = useState(false);

  // 选项数据
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['x-session'] = token;
    return headers;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/training-contracts', { headers: getAuthHeaders() });
      const data = await res.json();
      setContracts(data.data || []);
    } catch (e) {
      console.error('加载培训合同失败', e);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const headers = getAuthHeaders();
      const [cRes, sRes] = await Promise.all([
        fetch('/api/courses', { headers }),
        fetch('/api/workers', { headers }),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      setCourses((cData.data || []).map((c: Record<string, unknown>) => ({ id: c.id as string, name: (c.name || c.title || '') as string })));
      setStudents((sData.data || []).map((s: Record<string, unknown>) => ({ id: (s.id || s.worker_id || '') as string, name: (s.name || s.student_name || '') as string })));
    } catch (e) {
      console.error('加载选项失败', e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = contracts.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = c.student_name || c.student_name_resolved || '';
      const course = c.course_name || c.course_name_resolved || '';
      return name.toLowerCase().includes(q) || course.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    }
    return true;
  });

  const statusCounts: Record<string, number> = { all: contracts.length };
  for (const c of contracts) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }

  const handleCreate = async () => {
    if (!createForm.course_id || !createForm.worker_id) {
      alert('请选择课程和学员');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/training-contracts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...createForm,
          amount: createForm.amount ? parseFloat(createForm.amount) : 0,
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setShowCreate(false);
        setCreateForm({ course_id: '', worker_id: '', student_name: '', course_name: '', party_a_id: '', party_b_id: '', amount: '', start_date: '', end_date: '', terms: '' });
        loadData();
      } else {
        alert('创建失败：' + (result.error || ''));
      }
    } catch (e) {
      console.error('创建失败', e);
      alert('创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (contractId: string, newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/training-contracts', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: contractId, status: newStatus }),
      });
      const result = await res.json();
      if (result.ok) {
        loadData();
        if (selected?.id === contractId) {
          setSelected(result.data);
        }
      } else {
        alert('操作失败：' + (result.error || ''));
      }
    } catch (e) {
      console.error('操作失败', e);
    } finally {
      setSaving(false);
    }
  };

  // 发起退款
  const openRefund = (contract: TrainingContract) => {
    setRefundTarget(contract);
    setRefundForm({ amount: String(contract.amount || ''), reason: '' });
    setShowRefund(true);
  };

  const handleRefund = async () => {
    if (!refundTarget || !refundForm.amount || parseFloat(refundForm.amount) <= 0) {
      alert('请输入有效退款金额');
      return;
    }
    setRefunding(true);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          refund_type: 'training_fee',
          amount: parseFloat(refundForm.amount),
          reason: refundForm.reason || null,
          related_type: 'contract',
          related_id: refundTarget.id,
          related_name: refundTarget.course_name || refundTarget.course_name_resolved || '',
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setShowRefund(false);
        setRefundForm({ amount: '', reason: '' });
        alert('退款申请已提交，等待管理员审核');
      } else {
        alert('提交失败: ' + (result.error || '未知错误'));
      }
    } catch (e) {
      console.error('退款失败:', e);
      alert('退款申请失败');
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">培训合同管理</h1>
        <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { loadOptions(); setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-1" /> 新建合同
        </Button>
      </div>

      {/* 状态筛选 */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <Button key={key} size="sm" variant={statusFilter === key ? 'default' : 'outline'}
            className={statusFilter === key ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
            onClick={() => setStatusFilter(key)}>
            {label} ({statusCounts[key] || 0})
          </Button>
        ))}
        <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'}
          className={statusFilter === 'all' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          onClick={() => setStatusFilter('all')}>
          全部 ({statusCounts.all})
        </Button>
      </div>

      {/* 搜索 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="搜索学员/课程/合同ID" className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full"
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {/* 合同列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">暂无培训合同</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <FileText className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{c.course_name || c.course_name_resolved || '未知课程'}</span>
                      <Badge className={STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-700'}>{STATUS_LABELS[c.status] || c.status}</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      学员：{c.student_name || c.student_name_resolved || c.worker_id}
                      {c.amount ? <span className="ml-3">金额：¥{c.amount}</span> : ''}
                      {c.start_date ? <span className="ml-3">期限：{c.start_date} ~ {c.end_date || '?'}</span> : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(c); setShowDetail(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {/* 退款按钮：已签约/生效中的合同可退款 */}
                    {(c.status === 'signed' || c.status === 'active') && (
                      <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => openRefund(c)}>
                        <RotateCcw className="w-3 h-3 mr-0.5" />退款
                      </Button>
                    )}
                    {c.status === 'draft' && (
                      <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                        disabled={saving} onClick={() => handleStatusUpdate(c.id, 'pending_approval')}>提交审核</Button>
                    )}
                    {c.status === 'pending_approval' && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs"
                          disabled={saving} onClick={() => handleStatusUpdate(c.id, 'active')}>
                          <Check className="w-3 h-3 mr-0.5" />通过
                        </Button>
                        <Button size="sm" variant="destructive" className="text-xs"
                          disabled={saving} onClick={() => handleStatusUpdate(c.id, 'cancelled')}>
                          <X className="w-3 h-3 mr-0.5" />拒绝
                        </Button>
                      </>
                    )}
                    {c.status === 'active' && (
                      <Button size="sm" variant="outline" className="text-xs"
                        disabled={saving} onClick={() => handleStatusUpdate(c.id, 'completed')}>标记完成</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>合同详情</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-400">合同ID：</span>{selected.id}</div>
                <div><span className="text-slate-400">状态：</span><Badge className={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Badge></div>
                <div><span className="text-slate-400">课程：</span>{selected.course_name || selected.course_name_resolved || '-'}</div>
                <div><span className="text-slate-400">学员：</span>{selected.student_name || selected.student_name_resolved || '-'}</div>
                <div><span className="text-slate-400">金额：</span>¥{selected.amount || 0}</div>
                <div><span className="text-slate-400">期限：</span>{selected.start_date || '-'} ~ {selected.end_date || '-'}</div>
                <div><span className="text-slate-400">甲方：</span>{selected.party_a_id || '-'}</div>
                <div><span className="text-slate-400">乙方：</span>{selected.party_b_id || '-'}</div>
                <div><span className="text-slate-400">确认人：</span>{selected.confirmed_by || '-'}</div>
                <div><span className="text-slate-400">确认时间：</span>{selected.confirmed_at?.slice(0, 10) || '-'}</div>
              </div>
              {selected.terms && (
                <div><span className="text-slate-400">合同条款：</span><div className="mt-1 p-2 bg-slate-50 rounded text-xs whitespace-pre-wrap">{selected.terms}</div></div>
              )}
              <div className="text-xs text-slate-400">创建：{selected.created_at?.slice(0, 10)} | 更新：{selected.updated_at?.slice(0, 10)}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>关闭</Button>
            {(selected?.status === 'signed' || selected?.status === 'active') && (
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => { setShowDetail(false); openRefund(selected); }}>
                <RotateCcw className="w-4 h-4 mr-1" />申请退款
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建合同弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>新建培训合同</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>选择课程 *</Label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={createForm.course_id}
                onChange={e => {
                  const c = courses.find(x => x.id === e.target.value);
                  setCreateForm(p => ({ ...p, course_id: e.target.value, course_name: c?.name || '' }));
                }}>
                <option value="">请选择课程</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>选择学员 *</Label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={createForm.worker_id}
                onChange={e => {
                  const s = students.find(x => x.id === e.target.value);
                  setCreateForm(p => ({ ...p, worker_id: e.target.value, student_name: s?.name || '' }));
                }}>
                <option value="">请选择学员</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>合同金额</Label>
                <Input type="number" className="mt-1" value={createForm.amount}
                  onChange={e => setCreateForm(p => ({ ...p, amount: e.target.value }))} placeholder="如：5000" />
              </div>
              <div>
                <Label>甲方ID</Label>
                <Input className="mt-1" value={createForm.party_a_id}
                  onChange={e => setCreateForm(p => ({ ...p, party_a_id: e.target.value }))} />
              </div>
              <div>
                <Label>开始日期</Label>
                <Input type="date" className="mt-1" value={createForm.start_date}
                  onChange={e => setCreateForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>结束日期</Label>
                <Input type="date" className="mt-1" value={createForm.end_date}
                  onChange={e => setCreateForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>合同条款</Label>
              <textarea className="mt-1 w-full rounded-md border p-2 text-sm min-h-[60px]"
                value={createForm.terms} onChange={e => setCreateForm(p => ({ ...p, terms: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={saving || !createForm.course_id || !createForm.worker_id}
              onClick={handleCreate}>
              {saving ? '创建中...' : '创建合同'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 退款弹窗 */}
      <Dialog open={showRefund} onOpenChange={setShowRefund}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>申请退款</DialogTitle></DialogHeader>
          {refundTarget && (
            <div className="space-y-3 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="font-medium">{refundTarget.course_name || refundTarget.course_name_resolved || '未知课程'}</div>
                <div className="text-slate-500 mt-1">学员：{refundTarget.student_name || refundTarget.student_name_resolved || '-'}</div>
                <div className="text-slate-500">合同金额：¥{refundTarget.amount || 0}</div>
              </div>
              <div>
                <Label>退款金额 *</Label>
                <Input type="number" className="mt-1" value={refundForm.amount}
                  onChange={e => setRefundForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="输入退款金额" />
              </div>
              <div>
                <Label>退款原因</Label>
                <textarea className="mt-1 w-full rounded-md border p-2 text-sm min-h-[60px]"
                  value={refundForm.reason} onChange={e => setRefundForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="请说明退款原因..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefund(false)}>取消</Button>
            <Button variant="destructive" disabled={refunding || !refundForm.amount}
              onClick={handleRefund}>
              {refunding ? '提交中...' : '提交退款申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

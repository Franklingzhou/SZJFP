'use client';

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { ORDER_STATUS_LABELS, JOB_TYPES, type OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Search, Eye, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AgentOrdersPage() {
  const { user } = useMiniApp();
  const userId = user?.id || '';

  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showRecommend, setShowRecommend] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', jobType: '', location: '', salaryMin: '', salaryMax: '', description: '' });
  const [recForm, setRecForm] = useState({ workerId: '', notes: '' });

  // 签约相关
  const [showSign, setShowSign] = useState<string | null>(null);
  const [signForm, setSignForm] = useState({ worker_id: '', worker_salary: '', work_start_date: '', contract_start_date: '', contract_end_date: '' });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [signings, setSignings] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [ordersRes, workersRes, recsRes] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/workers', { headers }),
        fetch(`/api/recommendations?recommender_id=${userId}`, { headers }),
      ]);

      const ordersData = await ordersRes.json();
      const workersData = await workersRes.json();
      const recsData = await recsRes.json();

      if (ordersData.data) setAllOrders(ordersData.data);
      if (workersData.data) setWorkers(workersData.data);
      if (recsData.data) setRecommendations(recsData.data);
    } catch (e) {
      console.error('订单数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSignings = async (orderId: string) => {
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/order-signings?order_id=${orderId}`, { headers });
      const data = await res.json();
      if (data.data) setSignings(data.data);
      else setSignings([]);
    } catch {
      setSignings([]);
    }
  };

  // 经纪人只看自己创建的订单
  const myOrders = allOrders.filter(o => {
    const rec = o as Record<string, unknown>;
    return rec.agent_id === userId || rec.created_by === userId;
  });

  const filtered = myOrders.filter(o => {
    const jobType = String((o as Record<string, unknown>).job_type || (o as any).jobType || '');
    const matchJob = jobFilter === 'all' || jobType === jobFilter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch = !searchText ||
      o.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      o.location?.toLowerCase().includes(searchText.toLowerCase());
    return matchJob && matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    if (!form.title || !form.jobType) return;
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: form.title,
          job_type: form.jobType,
          location: form.location || '',
          description: form.description || '',
          salary_min: form.salaryMin ? parseInt(form.salaryMin) : 0,
          salary_max: form.salaryMax ? parseInt(form.salaryMax) : 0,
        }),
      });
      const result = await res.json();
      if (result.success || result.data) {
        setShowCreate(false);
        setForm({ title: '', jobType: '', location: '', salaryMin: '', salaryMax: '', description: '' });
        loadData();
      } else {
        alert('创建失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('创建订单失败', e);
      alert('创建失败，请重试');
    }
  };

  const handleRecommend = async () => {
    if (!recForm.workerId || !showRecommend) return;
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: showRecommend,
          worker_id: recForm.workerId,
          notes: recForm.notes || '',
          recommender_role: 'agent',
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('推荐成功！');
        setShowRecommend(null);
        setRecForm({ workerId: '', notes: '' });
        loadData();
      } else {
        alert('推荐失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('推荐失败', e);
      alert('推荐失败，请重试');
    }
  };

  const handleSign = async () => {
    if (!showSign || !signForm.worker_id || !signForm.worker_salary) return;
    if (!signForm.contract_start_date && !signForm.contract_end_date) {
      alert('合同开始日期和结束日期至少填一个');
      return;
    }
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/order-signings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: showSign,
          worker_id: signForm.worker_id,
          worker_salary: parseInt(signForm.worker_salary),
          work_start_date: signForm.work_start_date || null,
          contract_start_date: signForm.contract_start_date || null,
          contract_end_date: signForm.contract_end_date || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('签约成功！');
        setShowSign(null);
        setSignForm({ worker_id: '', worker_salary: '', work_start_date: '', contract_start_date: '', contract_end_date: '' });
        loadData();
        if (expandedOrder === showSign) loadSignings(showSign);
      } else {
        alert('签约失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('签约失败', e);
      alert('签约失败，请重试');
    }
  };

  const handleToggleExpand = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      setSignings([]);
    } else {
      setExpandedOrder(orderId);
      loadSignings(orderId);
    }
  };

  // 获取每个订单的推荐数
  const getRecCount = (orderId: string) =>
    recommendations.filter(r => r.order_id === orderId).length;

  const getWorkerName = (orderId: string) => {
    const rec = recommendations.find(r => r.order_id === orderId && r.status === 'accepted');
    if (!rec) return null;
    const worker = workers.find(w => w.id === rec.worker_id);
    return worker?.name || rec.worker_name || '已匹配';
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">订单管理</h2>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> 发单
        </Button>
      </div>

      {/* 搜索和筛选 */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="搜索订单标题/地区"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setJobFilter('all')}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap', jobFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border')}
          >全部工种</button>
          {JOB_TYPES.map(t => (
            <button key={t} onClick={() => setJobFilter(t)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap', jobFilter === t ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border')}
            >{t}</button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 订单列表 */}
      <div className="space-y-3">
        {filtered.map(order => {
          const jobType = String((order as Record<string, unknown>).job_type || (order as any).jobType || '');
          const salaryMin = Number((order as Record<string, unknown>).salary_min || (order as any).salaryMin || 0);
          const salaryMax = Number((order as Record<string, unknown>).salary_max || (order as any).salaryMax || 0);
          const workerName = getWorkerName(order.id);
          const recCount = getRecCount(order.id);
          const isExpanded = expandedOrder === order.id;

          return (
            <div key={order.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{order.title}</span>
                <Badge className={cn('text-xs', getStatusColor(order.status))}>
                  {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">工种：</span>{jobType}</div>
                <div><span className="text-muted-foreground">地区：</span>{order.location}</div>
                <div><span className="text-muted-foreground">阿姨：</span>{workerName || '待匹配'}</div>
                <div><span className="text-muted-foreground">推荐：</span>{recCount}人</div>
                {order.salary_type && <div><span className="text-muted-foreground">薪资类型：</span>{order.salary_type}</div>}
                {order.work_duration && <div><span className="text-muted-foreground">时长：</span>{order.work_duration}</div>}
                {order.contact_name && <div><span className="text-muted-foreground">联系人：</span>{order.contact_name}</div>}
                {order.contact_phone && <div><span className="text-muted-foreground">电话：</span>{order.contact_phone}</div>}
              </div>
              {order.signed_worker_id && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                  ✅ 已签约阿姨ID：{order.signed_worker_id}
                  {order.signed_at && <span className="ml-2">签约时间：{order.signed_at.slice(0, 10)}</span>}
                </div>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="font-bold text-amber-600">
                  {formatCurrency(salaryMin)}-{formatCurrency(salaryMax)}
                </span>
                <div className="flex gap-2">
                  {order.status === 'open' && (
                    <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => setShowRecommend(order.id)}>
                      推荐阿姨
                    </Button>
                  )}
                  {(order.status === 'interviewing') && (
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => { setShowSign(order.id); setSignForm({ worker_id: '', worker_salary: '', work_start_date: '', contract_start_date: '', contract_end_date: '' }); }}>
                      签约
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleToggleExpand(order.id)}>
                    {isExpanded ? '收起' : '详情'}
                  </Button>
                </div>
              </div>

              {/* 展开详情面板 */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <h4 className="text-sm font-medium">签约记录</h4>
                  {signings.length > 0 ? (
                    <div className="space-y-2">
                      {signings.map((s: any) => (
                        <div key={s.id} className={cn('p-2 rounded text-xs', s.status === 'active' ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200 opacity-70')}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.worker_name || s.worker_id}</span>
                            <Badge className={cn('text-xs', s.status === 'active' ? 'bg-green-100 text-green-800' : s.status === 'replaced' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-800')}>
                              {s.status === 'active' ? '生效中' : s.status === 'replaced' ? '已替换' : '已取消'}
                            </Badge>
                            {s.worker_salary && <span className="text-muted-foreground">薪资：{formatCurrency(s.worker_salary)}</span>}
                          </div>
                          <div className="text-muted-foreground mt-1">
                            {s.contract_start_date && `合同：${s.contract_start_date} ~ ${s.contract_end_date || '未定'}`}
                            {s.replace_reason && ` | 原因：${s.replace_reason}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">暂无签约记录</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无订单</div>
        )}
      </div>

      {/* 发单弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>发布新订单</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>订单标题</Label><Input className="mt-1" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="如：住家月嫂" /></div>
            <div><Label>工种</Label><Input className="mt-1" value={form.jobType} onChange={e => setForm({...form, jobType: e.target.value})} placeholder="如：月嫂、育儿嫂" /></div>
            <div><Label>地区</Label><Input className="mt-1" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="如：北京市朝阳区" /></div>
            <div><Label>描述</Label><Input className="mt-1" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="工作内容描述" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>最低薪资</Label><Input className="mt-1" value={form.salaryMin} onChange={e => setForm({...form, salaryMin: e.target.value})} placeholder="如：8000" /></div>
              <div><Label>最高薪资</Label><Input className="mt-1" value={form.salaryMax} onChange={e => setForm({...form, salaryMax: e.target.value})} placeholder="如：12000" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleCreate} disabled={!form.title || !form.jobType}>发布</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 推荐阿姨弹窗 */}
      <Dialog open={!!showRecommend} onOpenChange={() => setShowRecommend(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>推荐阿姨</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>选择阿姨</Label>
              <select
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={recForm.workerId}
                onChange={e => setRecForm({...recForm, workerId: e.target.value})}
              >
                <option value="">请选择阿姨</option>
                {workers.filter(w => w.status === 'active' || w.status === 'available').map(w => (
                  <option key={w.id} value={w.id}>{w.name} - {w.skills || '未填技能'}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>备注</Label>
              <Input className="mt-1" value={recForm.notes} onChange={e => setRecForm({...recForm, notes: e.target.value})} placeholder="推荐理由（可选）" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommend(null)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleRecommend} disabled={!recForm.workerId}>确认推荐</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 签约弹窗 */}
      <Dialog open={!!showSign} onOpenChange={() => setShowSign(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>签约阿姨</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>选择阿姨 *</Label>
              <select
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={signForm.worker_id}
                onChange={e => setSignForm({...signForm, worker_id: e.target.value})}
              >
                <option value="">请选择阿姨</option>
                {workers.filter(w => w.status === 'active' || w.status === 'available').map(w => (
                  <option key={w.id} value={w.id}>{w.name} - {w.skills || '未填技能'}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>阿姨薪资（元）*</Label>
              <Input className="mt-1" value={signForm.worker_salary} onChange={e => setSignForm({...signForm, worker_salary: e.target.value})} placeholder="如：8000" />
            </div>
            <div>
              <Label>实际上岗日期</Label>
              <Input className="mt-1" type="date" value={signForm.work_start_date} onChange={e => setSignForm({...signForm, work_start_date: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>合同开始日期</Label>
                <Input className="mt-1" type="date" value={signForm.contract_start_date} onChange={e => setSignForm({...signForm, contract_start_date: e.target.value})} />
              </div>
              <div>
                <Label>合同结束日期</Label>
                <Input className="mt-1" type="date" value={signForm.contract_end_date} onChange={e => setSignForm({...signForm, contract_end_date: e.target.value})} />
              </div>
            </div>
            <div className="text-xs text-muted-foreground">* 合同开始日期和结束日期至少填一个</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSign(null)}>取消</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSign} disabled={!signForm.worker_id || !signForm.worker_salary}>确认签约</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

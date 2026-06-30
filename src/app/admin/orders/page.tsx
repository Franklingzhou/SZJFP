'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Eye, X, Plus, Copy, UserRoundX, Check, UserPlus, FileSignature, RefreshCw, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { ORDER_STATUS_LABELS, JOB_TYPES, type OrderStatus } from '@/lib/types';

const ALL_STATUS_LABELS: Record<string, string> = {
  ...ORDER_STATUS_LABELS,
  matching: '匹配中',
  cancelled: '已取消',
};

const SALARY_TYPES = ['月薪', '日薪', '时薪'];
const SIGNING_STATUS_LABELS: Record<string, string> = { active: '生效中', replaced: '已替换', cancelled: '已取消' };
const SIGNING_STATUS_COLOR: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  replaced: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-800',
};

type OrderViewTab = 'all' | 'mine';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

/** 从JWT token解析当前用户ID和角色 */
function parseCurrentUser(): { userId: string; role: string } {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    if (token) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[0]));
        return { userId: payload.userId || payload.user_id || '', role: payload.role || '' };
      }
    }
  } catch (e) { console.error('JWT解析失败:', e); }
  return { userId: '', role: '' };
}

export default function OrdersPage() {
  // Tab: 我的订单/全部订单
  const [viewTab, setViewTab] = useState<OrderViewTab>('all');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOrder, setDetailOrder] = useState<string | null>(null);
  const [signings, setSignings] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // 更换阿姨弹窗 — 增加选择新阿姨
  const [showReplace, setShowReplace] = useState(false);
  const [replaceOrderId, setReplaceOrderId] = useState('');
  const [replaceReason, setReplaceReason] = useState('');
  const [replaceNewWorkerId, setReplaceNewWorkerId] = useState('');
  const [replaceNewWorkerName, setReplaceNewWorkerName] = useState('');
  const [replaceWorkers, setReplaceWorkers] = useState<any[]>([]);
  const [replaceWorkersLoading, setReplaceWorkersLoading] = useState(false);
  const [replaceWorkerSearch, setReplaceWorkerSearch] = useState('');

  // 退款弹窗
  const [showRefund, setShowRefund] = useState(false);
  const [refundOrder, setRefundOrder] = useState<any>(null);
  const [refundForm, setRefundForm] = useState({ amount: 0, reason: '' });
  const [refunding, setRefunding] = useState(false);

  // 新建订单弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '', job_type: '', salary_min: '', salary_max: '', salary_type: '',
    work_duration: '', location: '', description: '', agent_id: '',
    contact_name: '', contact_phone: '',
  });

  // ===== 推荐阿姨弹窗 =====
  const [showRecommend, setShowRecommend] = useState(false);
  const [recommendOrderId, setRecommendOrderId] = useState('');
  const [recommendNotes, setRecommendNotes] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerJobFilter, setWorkerJobFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ===== 签约弹窗 =====
  const [showSigning, setShowSigning] = useState(false);
  const [signingOrderId, setSigningOrderId] = useState('');
  const [contractStep, setContractStep] = useState(0); // 0:未开始 1:已发合同 2:已签约 3:已确认
  const [orderContract, setOrderContract] = useState<any>(null);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [contractForm, setContractForm] = useState({ title: '', party_a_id: '', amount: '', start_date: '', end_date: '', terms: '' });
  const [signingWorkerId, setSigningWorkerId] = useState('');
  const [signingWorkerName, setSigningWorkerName] = useState('');
  const [signRecommendations, setSignRecommendations] = useState<any[]>([]);
  const [signAvailableWorkers, setSignAvailableWorkers] = useState<any[]>([]);
  const [showSignWorkerPicker, setShowSignWorkerPicker] = useState(false);
  const [signWorkerSearch, setSignWorkerSearch] = useState('');
  const [signWorkerJobFilter, setSignWorkerJobFilter] = useState('');
  const [signForm, setSignForm] = useState({
    worker_salary: '',
    commission: '',
    contract_start: '',
    contract_end: '',
    notes: '',
  });

  useEffect(() => {
    const { userId, role } = parseCurrentUser();
    setCurrentUserId(userId);
    setCurrentUserRole(role);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.data) setOrders(data.data);
    } catch (e) {
      console.error('订单数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSignings = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/order-signings?order_id=${orderId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.data) setSignings(data.data);
      else setSignings([]);
    } catch {
      setSignings([]);
    }
  }, []);

  const handleSelectOrder = (orderId: string) => {
    if (detailOrder === orderId) {
      setDetailOrder(null);
      setSignings([]);
      setOrderContract(null);
      setContractStep(0);
    } else {
      setDetailOrder(orderId);
      loadSignings(orderId);
      loadContractForOrder(orderId);
    }
  };

  // 状态修改
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      } else {
        alert('状态更新失败: ' + (result.error || '未知错误'));
      }
    } catch (e) {
      console.error('状态更新失败', e);
      alert('状态更新失败');
    }
    setSaving(false);
  };

  // 复制文本
  const handleCopyText = async (order: any) => {
    try {
      const text = [
        `【${order.job_type || ''}】${order.title || order.customer_name || ''}`,
        order.salary_min && order.salary_max ? `薪资：${order.salary_min}-${order.salary_max}元` : order.salary_min ? `薪资：${order.salary_min}元起` : '薪资面议',
        order.location ? `地点：${order.location}` : '',
        order.service_type ? `服务类型：${order.service_type}` : '',
        order.description ? `要求：${order.description}` : '',
      ].filter(Boolean).join('\n');
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板，可粘贴到微信群');
    } catch {
      try {
        const textarea = document.createElement('textarea');
        const text = [
          `【${order.job_type || ''}】${order.title || order.customer_name || ''}`,
          order.salary_min && order.salary_max ? `薪资：${order.salary_min}-${order.salary_max}元` : order.salary_min ? `薪资：${order.salary_min}元起` : '薪资面议',
          order.location ? `地点：${order.location}` : '',
          order.service_type ? `服务类型：${order.service_type}` : '',
          order.description ? `要求：${order.description}` : '',
        ].filter(Boolean).join('\n');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('已复制到剪贴板，可粘贴到微信群');
      } catch {
        alert('复制失败，请重试');
      }
    }
  };

  // 发起退款
  const handleRefund = async () => {
    if (!refundOrder || refundForm.amount <= 0) return;
    setRefunding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          refund_type: 'agency_fee',
          amount: refundForm.amount,
          reason: refundForm.reason || null,
          related_type: 'order',
          related_id: refundOrder.id,
          related_name: refundOrder.title || '',
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

  // 更换阿姨 — 打开弹窗并加载可用阿姨
  const handleReplaceWorker = async (orderId: string) => {
    setReplaceOrderId(orderId);
    setReplaceReason('');
    setReplaceNewWorkerId('');
    setReplaceNewWorkerName('');
    setReplaceWorkerSearch('');
    setReplaceWorkersLoading(true);
    setShowReplace(true);
    try {
      const res = await fetch('/api/workers?status=idle', { headers: getAuthHeaders() });
      const data = await res.json();
      setReplaceWorkers(data.data || []);
    } catch {
      setReplaceWorkers([]);
    } finally {
      setReplaceWorkersLoading(false);
    }
  };

  const handleReplaceSubmit = async () => {
    if (!replaceNewWorkerId) { alert('请选择新阿姨'); return; }
    if (!replaceReason.trim()) { alert('请填写换人原因'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${replaceOrderId}/replace`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          new_worker_id: replaceNewWorkerId,
          reason: replaceReason,
        }),
      });
      const result = await res.json();
      if (result.ok || result.success) {
        alert('已提交更换阿姨申请');
        setShowReplace(false);
        loadData();
        if (detailOrder === replaceOrderId) loadSignings(replaceOrderId);
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('更换阿姨失败', e);
      alert('操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== 推荐阿姨 =====
  const openRecommendModal = async (orderId: string) => {
    setRecommendOrderId(orderId);
    setRecommendNotes('');
    setSelectedWorkerId('');
    setShowWorkerPicker(false);
    setShowRecommend(true);
    setWorkersLoading(true);
    try {
      const res = await fetch('/api/workers?status=idle', { headers: getAuthHeaders() });
      const data = await res.json();
      setAvailableWorkers(data.data || []);
    } catch {
      setAvailableWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!selectedWorkerId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          order_id: recommendOrderId,
          worker_id: selectedWorkerId,
          notes: recommendNotes.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success || result.ok || res.ok) {
        alert('推荐成功');
        setShowRecommend(false);
        setSelectedWorkerId('');
        setRecommendNotes('');
        setShowWorkerPicker(false);
      } else {
        alert(result.error || '推荐失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== 签约弹窗 =====
  const openSigningModal = async (orderId: string) => {
    setSigningOrderId(orderId);
    setSigningWorkerId('');
    setSigningWorkerName('');
    setSignForm({ worker_salary: '', commission: '', contract_start: '', contract_end: '', notes: '' });
    setShowSignWorkerPicker(false);
    setShowSigning(true);
    try {
      const res = await fetch(`/api/recommendations?order_id=${orderId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setSignRecommendations((data.data || []).filter((r: any) => r.status === 'accepted' || r.status === 'pending'));
    } catch {
      setSignRecommendations([]);
    }
    try {
      const res = await fetch('/api/workers?status=idle', { headers: getAuthHeaders() });
      const data = await res.json();
      setSignAvailableWorkers(data.data || []);
    } catch {
      setSignAvailableWorkers([]);
    }
  };

  const selectSignWorker = (workerId: string, workerName: string) => {
    setSigningWorkerId(workerId);
    setSigningWorkerName(workerName);
    setShowSignWorkerPicker(false);
  };

  const selectFromRecommendation = (rec: any) => {
    setSigningWorkerId(rec.worker_id);
    setSigningWorkerName(rec.worker_name || rec.worker_id);
  };

  const handleSignContract = async () => {
    if (!signingWorkerId) { alert('请选择签约阿姨'); return; }
    setSubmitting(true);
    try {
      // 调用 order-signings 接口创建签约
      const res = await fetch('/api/order-signings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          order_id: signingOrderId,
          worker_id: signingWorkerId,
          salary: signForm.worker_salary ? parseInt(signForm.worker_salary) : undefined,
          service_fee: signForm.commission ? parseInt(signForm.commission) : undefined,
          contract_start_date: signForm.contract_start || undefined,
          contract_end_date: signForm.contract_end || undefined,
          signing_notes: signForm.notes.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (result.success || result.data) {
        alert('签约成功');
        setShowSigning(false);
        loadData();
        if (detailOrder === signingOrderId) loadSignings(signingOrderId);
      } else {
        alert('签约失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('签约失败', e);
      alert('签约失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== 签约三步机制 =====
  const loadContractForOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/contracts?order_id=${orderId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      const contracts = data.data || [];
      if (contracts.length > 0) {
        const c = contracts[0];
        setOrderContract(c);
        if (c.status === 'active') setContractStep(3);
        else if (c.status === 'signed') setContractStep(2);
        else if (c.status === 'draft' || c.status === 'pending_approval') setContractStep(1);
        else setContractStep(0);
      } else {
        setOrderContract(null);
        setContractStep(0);
      }
    } catch (e) {
      console.error('加载合同失败', e);
    }
  };

  // 第1步：发合同
  const handleCreateContract = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          order_id: selected.id,
          title: contractForm.title || `合同-${selected.title}`,
          type: 'service',
          party_a_id: selected.agent_id,
          party_b_id: selected.signed_worker_id,
          amount: contractForm.amount ? parseFloat(contractForm.amount) : undefined,
          start_date: contractForm.start_date || undefined,
          end_date: contractForm.end_date || undefined,
          terms: contractForm.terms || undefined,
          status: 'draft',
        }),
      });
      const result = await res.json();
      if (result.success || result.data) {
        alert('合同已创建');
        setShowContractDialog(false);
        loadContractForOrder(selected.id);
      } else {
        alert('创建合同失败：' + (result.error || ''));
      }
    } catch (e) {
      console.error('创建合同失败', e);
      alert('创建合同失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 第2步：签约付款（更新合同状态为signed）
  const handleSignContractStep2 = async () => {
    if (!orderContract) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ id: orderContract.id, status: 'signed' }),
      });
      const result = await res.json();
      if (result.success || result.data) {
        alert('签约付款已确认');
        loadContractForOrder(selected!.id);
      } else {
        alert('操作失败：' + (result.error || ''));
      }
    } catch (e) {
      console.error('签约失败', e);
    } finally {
      setSubmitting(false);
    }
  };

  // 第3步：主管确认
  const handleConfirmContract = async () => {
    if (!orderContract) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${orderContract.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      const result = await res.json();
      if (result.ok || result.success) {
        alert('主管已确认');
        loadContractForOrder(selected!.id);
        loadData();
      } else {
        alert('确认失败：' + (result.error || ''));
      }
    } catch (e) {
      console.error('确认失败', e);
    } finally {
      setSubmitting(false);
    }
  };

  // 联系人自动填充
  const handleAgentChange = (agentId: string) => {
    setCreateForm(prev => ({ ...prev, agent_id: agentId }));
    if (agentId) {
      const lastOrder = orders.find(o => o.agent_id === agentId && (o.contact_name || o.contact_phone));
      if (lastOrder) {
        setCreateForm(prev => ({
          ...prev,
          contact_name: lastOrder.contact_name || '',
          contact_phone: lastOrder.contact_phone || '',
        }));
      }
    }
  };

  // 新建订单
  const handleCreate = async () => {
    if (!createForm.title || !createForm.job_type) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: createForm.title,
          job_type: createForm.job_type,
          salary_min: createForm.salary_min ? parseInt(createForm.salary_min) : 0,
          salary_max: createForm.salary_max ? parseInt(createForm.salary_max) : 0,
          salary_type: createForm.salary_type || null,
          work_duration: createForm.work_duration || null,
          location: createForm.location || '',
          description: createForm.description || '',
          agent_id: createForm.agent_id || null,
          contact_name: createForm.contact_name || null,
          contact_phone: createForm.contact_phone || null,
        }),
      });
      const result = await res.json();
      if (result.success || result.data) {
        setShowCreate(false);
        setCreateForm({
          title: '', job_type: '', salary_min: '', salary_max: '', salary_type: '',
          work_duration: '', location: '', description: '', agent_id: '',
          contact_name: '', contact_phone: '',
        });
        loadData();
      } else {
        alert('创建失败：' + (result.error || '请重试') + (result.detail ? ': ' + result.detail : ''));
      }
    } catch (e) {
      console.error('创建订单失败', e);
      alert('创建失败，请重试');
    }
  };

  // 筛选逻辑：viewTab + statusFilter + search
  const filtered = orders.filter((o) => {
    const matchView = viewTab === 'all' || (viewTab === 'mine' && o.agent_id === currentUserId);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch = !search ||
      (o.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.location || '').toLowerCase().includes(search.toLowerCase());
    return matchView && matchStatus && matchSearch;
  });

  const selected = detailOrder ? orders.find(o => o.id === detailOrder) : null;

  // 状态计数
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    if (viewTab === 'mine' && o.agent_id !== currentUserId) return acc;
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  // 阿姨过滤（推荐弹窗）
  const filteredWorkers = availableWorkers.filter(w => {
    const matchSearch = !workerSearch ||
      (w.name || '').toLowerCase().includes(workerSearch.toLowerCase()) ||
      (w.phone || '').includes(workerSearch);
    const matchJob = !workerJobFilter ||
      (w.skills || w.job_types || '').includes(workerJobFilter);
    return matchSearch && matchJob;
  });
  const workerJobTypes = [...new Set(availableWorkers.flatMap(w => (w.skills || w.job_types || '').split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)))];

  // 签约阿姨过滤
  const filteredSignWorkers = signAvailableWorkers.filter(w => {
    const matchSearch = !signWorkerSearch ||
      (w.name || '').toLowerCase().includes(signWorkerSearch.toLowerCase()) ||
      (w.phone || '').includes(signWorkerSearch);
    const matchJob = !signWorkerJobFilter ||
      (w.skills || w.job_types || '').includes(signWorkerJobFilter);
    return matchSearch && matchJob;
  });
  const signWorkerJobTypes = [...new Set(signAvailableWorkers.flatMap(w => (w.skills || w.job_types || '').split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean)))];

  // 更换阿姨弹窗的阿姨过滤
  const filteredReplaceWorkers = replaceWorkers.filter(w => {
    if (!replaceWorkerSearch) return true;
    return (w.name || '').toLowerCase().includes(replaceWorkerSearch.toLowerCase()) ||
      (w.phone || '').includes(replaceWorkerSearch);
  });

  // ===== 上户记录时间线渲染 =====
  const renderSigningTimeline = () => {
    if (signings.length === 0) return null;
    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-1">
          <Clock className="h-4 w-4 text-amber-500" /> 上户记录
        </h4>
        <div className="relative pl-6">
          {/* 竖线 */}
          <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-slate-200" />
          <div className="space-y-4">
            {signings.map((s: any, idx: number) => (
              <div key={s.id} className="relative">
                {/* 圆点 */}
                <div className={cn(
                  'absolute -left-6 top-1 w-4 h-4 rounded-full border-2',
                  s.status === 'active' ? 'border-green-500 bg-green-100' : 'border-slate-300 bg-slate-100'
                )} />
                <div className={cn(
                  'p-3 rounded-lg border text-sm',
                  s.status === 'active' ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.worker_name || s.worker_id}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', SIGNING_STATUS_COLOR[s.status] || 'bg-slate-100')}>
                        {SIGNING_STATUS_LABELS[s.status] || s.status}
                      </span>
                    </div>
                    {s.salary && <span className="text-muted-foreground text-xs">薪资：{formatCurrency(s.salary)}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                    {s.start_time && (
                      <div>上户时间：{new Date(s.start_time).toLocaleDateString()} {s.signed_at && new Date(s.signed_at).toLocaleTimeString().slice(0,5)}</div>
                    )}
                    {s.end_time && (
                      <div>下户时间：{new Date(s.end_time).toLocaleDateString()}</div>
                    )}
                    {s.contract_start_date && (
                      <div>合同期限：{s.contract_start_date} ~ {s.contract_end_date || '未定'}</div>
                    )}
                    {s.signing_notes && (
                      <div className="text-amber-700">备注：{s.signing_notes}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">订单管理</h1>
          <p className="text-sm text-muted-foreground mt-1">全部订单查看、跟踪与异常处理</p>
        </div>
        <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> 新建订单
        </Button>
      </div>

      {/* 我的/全部 Tab + 状态筛选 + 搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* 视图切换 */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant={viewTab === 'all' ? 'default' : 'outline'}
                className={viewTab === 'all' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                onClick={() => setViewTab('all')}>
                全部订单
              </Button>
              <Button size="sm" variant={viewTab === 'mine' ? 'default' : 'outline'}
                className={viewTab === 'mine' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                onClick={() => setViewTab('mine')}>
                我的订单
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索订单标题、地区..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  {Object.entries(ALL_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v} ({statusCounts[k] || 0})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单详情面板 */}
      {selected && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-lg">{selected.title}</h3>
                <Badge className={cn('text-xs', getStatusColor(selected.status))}>
                  {ALL_STATUS_LABELS[selected.status] || selected.status}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleCopyText(selected)}>
                  <Copy className="h-3 w-3" /> 复制文本
                </Button>
                {selected.status === 'open' && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openRecommendModal(selected.id)}>
                    <UserPlus className="h-3 w-3" /> 推荐阿姨
                  </Button>
                )}
                {(selected.status === 'open' || selected.status === 'interviewing') && !selected.signed_worker_id && (
                  <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600" onClick={() => openSigningModal(selected.id)}>
                    <FileSignature className="h-3 w-3" /> 签约
                  </Button>
                )}
                {selected.status === 'signed' && selected.signed_worker_id && (
                  <Button size="sm" variant="outline" className="gap-1 text-orange-600 hover:text-orange-700" onClick={() => handleReplaceWorker(selected.id)}>
                    <RefreshCw className="h-3 w-3" /> 更换阿姨
                  </Button>
                )}
                {['signed', 'completed'].includes(selected.status) && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                    setRefundOrder(selected);
                    setRefundForm({ amount: selected.service_fee || 0, reason: '' });
                    setShowRefund(true);
                  }}>
                    <DollarSign className="h-3 w-3" /> 退款
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setDetailOrder(null); setSignings([]); }}><X className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div><span className="text-muted-foreground">工种：</span><span className="font-medium">{selected.job_type || '-'}</span></div>
              <div><span className="text-muted-foreground">薪资：</span><span className="font-medium">{formatCurrency(selected.salary_min || 0)}-{formatCurrency(selected.salary_max || 0)}{selected.salary_type ? `/${selected.salary_type}` : ''}</span></div>
              <div><span className="text-muted-foreground">地区：</span><span>{selected.location || '-'}</span></div>
              <div><span className="text-muted-foreground">时长：</span><span>{selected.work_duration || '-'}</span></div>
              <div><span className="text-muted-foreground">联系人：</span><span>{selected.contact_name || '-'} {selected.contact_phone || ''}</span></div>
              <div><span className="text-muted-foreground">经纪人：</span><span className="font-medium">{selected.agent_id || '-'}</span></div>
              <div><span className="text-muted-foreground">服务费：</span><span className="font-medium">{formatCurrency(selected.service_fee || 0)}</span></div>
              <div><span className="text-muted-foreground">创建：</span><span>{selected.created_at?.slice(0, 10) || '-'}</span></div>
            </div>
            {selected.description && <p className="text-sm text-muted-foreground mb-4">{selected.description}</p>}

            {/* 签约阿姨信息 */}
            {selected.signed_worker_id && (
              <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200 flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">
                  已签约阿姨：{selected.signed_worker_id}
                  {selected.signed_at && <span className="text-xs text-green-600 ml-2">签约时间：{selected.signed_at.slice(0, 10)}</span>}
                </span>
              </div>
            )}

            {/* 签约三步机制 */}
            {selected.status === 'signed' || selected.status === 'interviewing' || selected.signed_worker_id ? (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg border">
                <div className="text-sm font-medium text-slate-700 mb-3">签约流程</div>
                <div className="flex items-center gap-0">
                  {/* Step 1 */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2',
                      contractStep >= 1 ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-slate-400')}>1</div>
                    <div className="text-xs mt-1 text-center">发合同</div>
                    {contractStep === 0 && (
                      <Button size="sm" className="mt-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-6 px-2"
                        onClick={() => {
                          setContractForm({ title: `合同-${selected.title}`, party_a_id: selected.agent_id || '', amount: '', start_date: '', end_date: '', terms: '' });
                          setShowContractDialog(true);
                        }}>发合同</Button>
                    )}
                    {contractStep >= 1 && <span className="text-xs text-green-600 mt-1">已完成</span>}
                  </div>
                  <div className={cn('flex-1 h-0.5', contractStep >= 2 ? 'bg-green-500' : 'bg-slate-200')} />
                  {/* Step 2 */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2',
                      contractStep >= 2 ? 'bg-green-500 border-green-500 text-white' : contractStep === 1 ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300 text-slate-400')}>2</div>
                    <div className="text-xs mt-1 text-center">签约付款</div>
                    {contractStep === 1 && (
                      <Button size="sm" className="mt-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-6 px-2"
                        disabled={submitting} onClick={handleSignContractStep2}>确认签约</Button>
                    )}
                    {contractStep >= 2 && <span className="text-xs text-green-600 mt-1">已完成</span>}
                  </div>
                  <div className={cn('flex-1 h-0.5', contractStep >= 3 ? 'bg-green-500' : 'bg-slate-200')} />
                  {/* Step 3 */}
                  <div className="flex-1 flex flex-col items-center">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2',
                      contractStep >= 3 ? 'bg-green-500 border-green-500 text-white' : contractStep === 2 ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300 text-slate-400')}>3</div>
                    <div className="text-xs mt-1 text-center">主管确认</div>
                    {contractStep === 2 && (
                      <Button size="sm" className="mt-1 bg-amber-500 hover:bg-amber-600 text-white text-xs h-6 px-2"
                        disabled={submitting} onClick={handleConfirmContract}>确认</Button>
                    )}
                    {contractStep >= 3 && <span className="text-xs text-green-600 mt-1">已完成</span>}
                  </div>
                </div>
                {orderContract && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs text-slate-600">
                    <div><span className="text-slate-400">合同ID：</span>{orderContract.id}</div>
                    <div><span className="text-slate-400">合同状态：</span><Badge className="text-xs">{orderContract.status}</Badge></div>
                    <div><span className="text-slate-400">金额：</span>{orderContract.amount || '-'}</div>
                  </div>
                )}
              </div>
            ) : null}

            {/* 上户记录时间线 */}
            {renderSigningTimeline()}

            {/* 状态修改 */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground leading-8">修改状态：</span>
              {Object.entries(ALL_STATUS_LABELS).map(([k, v]) => (
                <Button key={k} size="sm" variant={selected.status === k ? 'default' : 'outline'}
                  disabled={saving}
                  onClick={() => handleStatusChange(selected.id, k)}>{v}</Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 订单列表 */}
      <div className="space-y-4">
        {filtered.map((order) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleSelectOrder(order.id)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">{order.title}</span>
                    <Badge className={cn('text-xs', getStatusColor(order.status))}>
                      {ALL_STATUS_LABELS[order.status] || order.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{order.job_type}</Badge>
                    {order.signed_worker_id && (
                      <Badge className="bg-green-100 text-green-800 text-xs">已签约</Badge>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">薪资：</span><span className="font-medium">{formatCurrency(order.salary_min || 0)}-{formatCurrency(order.salary_max || 0)}{order.salary_type ? `/${order.salary_type}` : ''}</span></div>
                    <div><span className="text-muted-foreground">地区：</span><span>{order.location || '-'}</span></div>
                    <div><span className="text-muted-foreground">时长：</span><span>{order.work_duration || '-'}</span></div>
                    <div><span className="text-muted-foreground">联系人：</span><span>{order.contact_name || '-'} {order.contact_phone || ''}</span></div>
                  </div>
                  <div className="mt-1 grid grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">经纪人：</span><span>{order.agent_id || '-'}</span></div>
                    <div><span className="text-muted-foreground">服务费：</span><span>{formatCurrency(order.service_fee || 0)}</span></div>
                    <div><span className="text-muted-foreground">佣金率：</span><span>{order.commission_rate || 0}%</span></div>
                    <div><span className="text-muted-foreground">创建：</span><span>{order.created_at?.slice(0, 10) || '-'}</span></div>
                  </div>
                  {order.description && <p className="mt-2 text-sm text-muted-foreground">{order.description}</p>}
                </div>
                <Button variant="ghost" size="sm" className="ml-2 shrink-0"><Eye className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">未找到匹配订单</CardContent></Card>
        )}
      </div>

      {/* ===== 新建订单弹窗 ===== */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>新建订单</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>订单标题 *</Label><Input className="mt-1" value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="如：住家月嫂" /></div>
            <div><Label>工种 *</Label>
              <select className="mt-1 w-full rounded-md border p-2 text-sm" value={createForm.job_type} onChange={e => setCreateForm({...createForm, job_type: e.target.value})}>
                <option value="">请选择</option>
                {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>薪资类型</Label>
              <select className="mt-1 w-full rounded-md border p-2 text-sm" value={createForm.salary_type} onChange={e => setCreateForm({...createForm, salary_type: e.target.value})}>
                <option value="">请选择</option>
                {SALARY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>最低薪资</Label><Input className="mt-1" value={createForm.salary_min} onChange={e => setCreateForm({...createForm, salary_min: e.target.value})} placeholder="如：8000" /></div>
            <div><Label>最高薪资</Label><Input className="mt-1" value={createForm.salary_max} onChange={e => setCreateForm({...createForm, salary_max: e.target.value})} placeholder="如：12000" /></div>
            <div><Label>工作时长</Label><Input className="mt-1" value={createForm.work_duration} onChange={e => setCreateForm({...createForm, work_duration: e.target.value})} placeholder="如：住家/白班" /></div>
            <div><Label>地区</Label><Input className="mt-1" value={createForm.location} onChange={e => setCreateForm({...createForm, location: e.target.value})} placeholder="如：北京市朝阳区" /></div>
            <div className="col-span-2"><Label>描述</Label><Input className="mt-1" value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="工作内容描述" /></div>
            <div><Label>经纪人ID</Label><Input className="mt-1" value={createForm.agent_id} onChange={e => handleAgentChange(e.target.value)} placeholder="选填，自动填充联系人" /></div>
            <div><Label>联系人</Label><Input className="mt-1" value={createForm.contact_name} onChange={e => setCreateForm({...createForm, contact_name: e.target.value})} placeholder="联系人姓名" /></div>
            <div><Label>联系电话</Label><Input className="mt-1" value={createForm.contact_phone} onChange={e => setCreateForm({...createForm, contact_phone: e.target.value})} placeholder="联系人电话" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleCreate} disabled={!createForm.title || !createForm.job_type}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 更换阿姨弹窗 — 增加选择新阿姨 ===== */}
      <Dialog open={showReplace} onOpenChange={setShowReplace}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>更换阿姨</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* 选择新阿姨 */}
            <div>
              <Label className="mb-2 block">选择新阿姨 *</Label>
              {replaceNewWorkerId ? (
                <div className="p-3 border-2 border-green-400 bg-green-50 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-green-800">{replaceNewWorkerName || replaceNewWorkerId}</span>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setReplaceNewWorkerId(''); setReplaceNewWorkerName(''); }}>更换</Button>
                </div>
              ) : (
                <div className="border rounded-lg p-3 bg-slate-50 max-h-[250px] overflow-auto">
                  <Input placeholder="搜索姓名/电话..." className="mb-2" value={replaceWorkerSearch} onChange={e => setReplaceWorkerSearch(e.target.value)} />
                  {replaceWorkersLoading ? (
                    <div className="text-center py-4 text-slate-400 text-sm">加载中...</div>
                  ) : filteredReplaceWorkers.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-sm">暂无可用阿姨</div>
                  ) : (
                    <div className="space-y-1">
                      {filteredReplaceWorkers.map(w => (
                        <div key={w.id}
                          className={cn('p-2 rounded-md border cursor-pointer hover:bg-white transition-colors',
                            replaceNewWorkerId === w.id ? 'border-green-400 bg-green-50' : 'border-transparent hover:border-slate-200')}
                          onClick={() => { setReplaceNewWorkerId(w.id); setReplaceNewWorkerName(w.name || w.id); }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {replaceNewWorkerId === w.id && <Check className="h-4 w-4 text-green-600" />}
                              <span className="font-medium text-sm">{w.name}</span>
                              <span className="text-xs text-slate-500">{w.phone}</span>
                            </div>
                            <span className="text-xs text-slate-400">{w.experience_years || '-'}年经验</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 换人原因 */}
            <div>
              <Label className="mb-2 block">换人原因（必填）</Label>
              <textarea
                className="w-full rounded-md border p-3 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="请填写更换阿姨的原因..."
                value={replaceReason}
                onChange={(e) => setReplaceReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplace(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleReplaceSubmit} disabled={submitting || !replaceNewWorkerId || !replaceReason.trim()}>
              {submitting ? '提交中...' : '确认更换'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 推荐阿姨弹窗 ===== */}
      <Dialog open={showRecommend} onOpenChange={setShowRecommend}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>推荐阿姨</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {selectedWorkerId ? (
              <div className="p-3 border-2 border-green-400 bg-green-50 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-medium text-green-800">{availableWorkers.find(w => w.id === selectedWorkerId)?.name || selectedWorkerId}</span>
                  <span className="text-sm text-green-600 ml-2">{availableWorkers.find(w => w.id === selectedWorkerId)?.phone || ''}</span>
                </div>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setSelectedWorkerId(''); setShowWorkerPicker(true); }}>更换</Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowWorkerPicker(true)}>
                <UserPlus className="h-4 w-4" /> 选择阿姨
              </Button>
            )}

            {showWorkerPicker && (
              <div className="border rounded-lg p-3 bg-slate-50 max-h-[400px] overflow-auto">
                <Input placeholder="搜索姓名/电话..." className="mb-2" value={workerSearch} onChange={e => setWorkerSearch(e.target.value)} />
                {workerJobTypes.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    <Button size="sm" variant={!workerJobFilter ? 'default' : 'outline'} className="text-xs h-7" onClick={() => setWorkerJobFilter('')}>全部</Button>
                    {workerJobTypes.map(jt => (
                      <Button key={jt} size="sm" variant={workerJobFilter === jt ? 'default' : 'outline'} className="text-xs h-7" onClick={() => setWorkerJobFilter(workerJobFilter === jt ? '' : jt)}>{jt}</Button>
                    ))}
                  </div>
                )}
                {workersLoading ? (
                  <div className="text-center py-4 text-slate-400 text-sm">加载中...</div>
                ) : filteredWorkers.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-sm">暂无可用阿姨</div>
                ) : (
                  <div className="space-y-1">
                    {filteredWorkers.map(w => (
                      <div key={w.id}
                        className={cn('p-2 rounded-md border cursor-pointer hover:bg-white transition-colors',
                          selectedWorkerId === w.id ? 'border-green-400 bg-green-50' : 'border-transparent hover:border-slate-200')}
                        onClick={() => { setSelectedWorkerId(w.id); setShowWorkerPicker(false); }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {selectedWorkerId === w.id && <Check className="h-4 w-4 text-green-600" />}
                            <span className="font-medium text-sm">{w.name}</span>
                            <span className="text-xs text-slate-500">{w.phone}</span>
                          </div>
                          <span className="text-xs text-slate-400">{w.experience_years || w.work_experience || '-'}年经验</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {(w.skills || w.job_types || '').split(/[,，、]/).filter(Boolean).map((s: string) => (
                            <span key={s.trim()} className="inline-block mr-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{s.trim()}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>推荐留言</Label>
              <textarea className="mt-1 w-full rounded-md border p-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="简单说明推荐理由" value={recommendNotes} onChange={e => setRecommendNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecommend(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleRecommend} disabled={submitting || !selectedWorkerId}>
              {submitting ? '提交中...' : '推荐'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 签约弹窗 ===== */}
      <Dialog open={showSigning} onOpenChange={setShowSigning}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>签约</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-auto">
            {signingWorkerId ? (
              <div className="p-3 border-2 border-green-400 bg-green-50 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-medium text-green-800">{signingWorkerName || signingWorkerId}</span>
                </div>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setSigningWorkerId(''); setSigningWorkerName(''); }}>更换</Button>
              </div>
            ) : (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">请选择签约阿姨（从推荐列表或阿姨库中选择）</div>
            )}

            {signRecommendations.length > 0 && (
              <div>
                <Label className="mb-2 block">推荐阿姨（点击选择）</Label>
                <div className="space-y-1 max-h-[200px] overflow-auto">
                  {signRecommendations.map((rec: any) => (
                    <div key={rec.id}
                      className={cn('p-2 rounded-md border cursor-pointer hover:bg-white transition-colors',
                        signingWorkerId === rec.worker_id ? 'border-green-400 bg-green-50' : 'border-slate-200')}
                      onClick={() => selectFromRecommendation(rec)}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{rec.worker_name || rec.worker_id}</span>
                        <div className="flex items-center gap-2">
                          {rec.worker_phone && <span className="text-xs text-slate-500">{rec.worker_phone}</span>}
                          <Badge className={cn('text-xs', rec.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>
                            {rec.status === 'accepted' ? '已通过' : '待审核'}
                          </Badge>
                          {rec.recommender_name && <span className="text-xs text-slate-400">推荐人: {rec.recommender_name}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>阿姨库</Label>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowSignWorkerPicker(!showSignWorkerPicker)}>
                  {showSignWorkerPicker ? '收起' : '展开选择'}
                </Button>
              </div>
              {showSignWorkerPicker && (
                <div className="border rounded-lg p-3 bg-slate-50 max-h-[250px] overflow-auto">
                  <Input placeholder="搜索姓名/电话..." className="mb-2" value={signWorkerSearch} onChange={e => setSignWorkerSearch(e.target.value)} />
                  {signWorkerJobTypes.length > 0 && (
                    <div className="flex gap-1 flex-wrap mb-2">
                      <Button size="sm" variant={!signWorkerJobFilter ? 'default' : 'outline'} className="text-xs h-7" onClick={() => setSignWorkerJobFilter('')}>全部</Button>
                      {signWorkerJobTypes.map(jt => (
                        <Button key={jt} size="sm" variant={signWorkerJobFilter === jt ? 'default' : 'outline'} className="text-xs h-7" onClick={() => setSignWorkerJobFilter(signWorkerJobFilter === jt ? '' : jt)}>{jt}</Button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    {filteredSignWorkers.map(w => (
                      <div key={w.id}
                        className={cn('p-2 rounded-md border cursor-pointer hover:bg-white transition-colors',
                          signingWorkerId === w.id ? 'border-green-400 bg-green-50' : 'border-transparent hover:border-slate-200')}
                        onClick={() => selectSignWorker(w.id, w.name)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {signingWorkerId === w.id && <Check className="h-4 w-4 text-green-600" />}
                            <span className="font-medium text-sm">{w.name}</span>
                            <span className="text-xs text-slate-500">{w.phone}</span>
                          </div>
                          <span className="text-xs text-slate-400">{w.experience_years || w.work_experience || '-'}年</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <Label>阿姨薪资（元/月）</Label>
                <Input type="number" className="mt-1" value={signForm.worker_salary} onChange={e => setSignForm({...signForm, worker_salary: e.target.value})} placeholder="如：8000" />
              </div>
              <div>
                <Label>中介费</Label>
                <Input type="number" className="mt-1" value={signForm.commission} onChange={e => setSignForm({...signForm, commission: e.target.value})} placeholder="如：2000" />
              </div>
              <div>
                <Label>合同开始日期</Label>
                <Input type="date" className="mt-1" value={signForm.contract_start} onChange={e => setSignForm({...signForm, contract_start: e.target.value})} />
              </div>
              <div>
                <Label>合同结束日期</Label>
                <Input type="date" className="mt-1" value={signForm.contract_end} onChange={e => setSignForm({...signForm, contract_end: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>备注</Label>
                <textarea className="mt-1 w-full rounded-md border p-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="签约备注" value={signForm.notes} onChange={e => setSignForm({...signForm, notes: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSigning(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleSignContract} disabled={submitting || !signingWorkerId}>
              {submitting ? '签约中...' : '确认签约'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== 退款弹窗 ===== */}
      <Dialog open={showRefund} onOpenChange={setShowRefund}>
        <DialogContent>
          <DialogHeader><DialogTitle>发起退款申请</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              订单：{refundOrder?.title} | 类型：中介费退款
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

      {/* ===== 发合同弹窗 ===== */}
      <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建合同</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>合同标题</Label>
              <Input className="mt-1" value={contractForm.title} onChange={e => setContractForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>合同金额</Label>
                <Input type="number" className="mt-1" value={contractForm.amount} onChange={e => setContractForm(p => ({ ...p, amount: e.target.value }))} placeholder="如：10000" />
              </div>
              <div>
                <Label>甲方ID</Label>
                <Input className="mt-1" value={contractForm.party_a_id} onChange={e => setContractForm(p => ({ ...p, party_a_id: e.target.value }))} />
              </div>
              <div>
                <Label>开始日期</Label>
                <Input type="date" className="mt-1" value={contractForm.start_date} onChange={e => setContractForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>结束日期</Label>
                <Input type="date" className="mt-1" value={contractForm.end_date} onChange={e => setContractForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>合同条款</Label>
              <textarea className="mt-1 w-full rounded-md border p-2 text-sm min-h-[60px]" value={contractForm.terms} onChange={e => setContractForm(p => ({ ...p, terms: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowContractDialog(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" disabled={submitting} onClick={handleCreateContract}>
              {submitting ? '创建中...' : '创建合同'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

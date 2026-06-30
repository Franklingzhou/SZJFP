'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, X, Search, ChevronDown, ChevronUp, Users, User, UserPlus, FileCheck, ClipboardList, Plus } from 'lucide-react';

interface RecommendationRecord {
  id: string;
  order_id: string;
  worker_id: string;
  recommender_id: string;
  recommender_role: string;
  status: string;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string | null;
  // enriched fields
  worker_name: string;
  worker_phone: string;
  worker_status: string;
  worker_skills: string;
  worker_experience_years: number | null;
  worker_hometown: string;
  order_title: string;
  order_status: string;
  order_location: string;
  order_salary_min: number;
  order_salary_max: number;
  order_job_type: string;
  order_agent_id: string;
  recommender_name: string;
  recommender_phone: string;
  // signed 推荐签约额外字段
  salary?: number;
  contract_start?: string;
  contract_end?: string;
  work_start_date?: string;
}

type ReviewTab = 'pending' | 'approved' | 'rejected';
type ViewTab = 'all' | 'mine' | 'others' | 'signed';

export default function AdminRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTab, setReviewTab] = useState<ReviewTab>('pending');
  const [viewTab, setViewTab] = useState<ViewTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRec, setNewRec] = useState({ order_id: '', worker_id: '', notes: '' });
  const [availableWorkers, setAvailableWorkers] = useState<Array<{ id: string; name: string; phone?: string }>>([]);
  const [availableOrders, setAvailableOrders] = useState<Array<{ id: string; title: string; status?: string }>>([]);

  // 当前用户信息
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');

  // 拒绝弹窗
  const [rejectTarget, setRejectTarget] = useState<RecommendationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['x-session'] = token;
    return headers;
  };

  // 展开详情
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // 从 localStorage 取当前用户信息
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      if (token) {
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[0]));
          setCurrentUserId(payload.userId || payload.user_id || '');
          setCurrentUserRole(payload.role || '');
        }
      }
    } catch (e) { console.error('JWT解析失败:', e); }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recommendations', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.data) setRecommendations(result.data);
    } catch (e) {
      console.error('推荐记录加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCreateOptions = async () => {
    try {
      const headers = getAuthHeaders();
      const [wRes, oRes] = await Promise.all([
        fetch('/api/workers', { headers }),
        fetch('/api/orders', { headers }),
      ]);
      const wData = await wRes.json();
      const oData = await oRes.json();
      setAvailableWorkers((wData.data || []).filter((w: Record<string, unknown>) => w.status === 'idle' || w.status === 'available'));
      setAvailableOrders((oData.data || []).filter((o: Record<string, unknown>) => o.status === 'open'));
    } catch (e) {
      console.error('加载选项失败:', e);
    }
  };

  const handleCreateRecommendation = async () => {
    if (!newRec.order_id || !newRec.worker_id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newRec),
      });
      const result = await res.json();
      if (result.ok || result.success) {
        setShowCreate(false);
        setNewRec({ order_id: '', worker_id: '', notes: '' });
        loadData();
      } else {
        alert(result.error || '推荐失败');
      }
    } catch (e) {
      console.error('推荐失败:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (rec: RecommendationRecord) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/recommendations/${rec.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'approved' }),
      });
      const result = await res.json();
      if (result.success) {
        setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'approved' } : r));
      }
    } catch (e) {
      console.error('审批失败:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/recommendations/${rejectTarget.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'rejected', rejection_reason: rejectReason.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setRecommendations(prev => prev.map(r =>
          r.id === rejectTarget.id
            ? { ...r, status: 'rejected', rejection_reason: rejectReason.trim() }
            : r
        ));
        setRejectTarget(null);
        setRejectReason('');
      }
    } catch (e) {
      console.error('拒绝失败:', e);
    } finally {
      setSaving(false);
    }
  };

  // 判断当前用户是否是发单人
  const isOrderOwner = (r: RecommendationRecord) => {
    return r.order_agent_id === currentUserId || currentUserRole === 'admin';
  };

  // 筛选逻辑
  const filtered = recommendations.filter(r => {
    // 推荐视角Tab过滤
    let matchViewTab = true;
    switch (viewTab) {
      case 'mine':
        matchViewTab = r.recommender_id === currentUserId;
        break;
      case 'others':
        matchViewTab = r.recommender_id !== currentUserId;
        break;
      case 'signed':
        matchViewTab = r.status === 'signed';
        break;
      default: // all
        matchViewTab = true;
    }

    // 审核视角Tab过滤（仅非推荐视角Tab时生效）
    let matchReviewTab = true;
    if (viewTab === 'all' || viewTab === 'mine' || viewTab === 'others') {
      switch (reviewTab) {
        case 'pending': matchReviewTab = r.status === 'pending'; break;
        case 'approved': matchReviewTab = r.status === 'approved' || r.status === 'accepted'; break;
        case 'rejected': matchReviewTab = r.status === 'rejected'; break;
      }
    }

    const matchSearch = !searchTerm ||
      (r.worker_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.recommender_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.order_title || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchViewTab && matchReviewTab && matchSearch;
  });

  const reviewTabCounts = {
    pending: recommendations.filter(r => r.status === 'pending').length,
    approved: recommendations.filter(r => r.status === 'approved' || r.status === 'accepted').length,
    rejected: recommendations.filter(r => r.status === 'rejected').length,
  };

  const viewTabCounts = {
    all: recommendations.length,
    mine: recommendations.filter(r => r.recommender_id === currentUserId).length,
    others: recommendations.filter(r => r.recommender_id !== currentUserId).length,
    signed: recommendations.filter(r => r.status === 'signed').length,
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'pending': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待审核</span>;
      case 'approved':
      case 'accepted': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">已通过</span>;
      case 'rejected': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已拒绝</span>;
      case 'signed': return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">已签约</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{s}</span>;
    }
  };

  const formatSalary = (min: number, max: number) => {
    if (!min && !max) return '-';
    if (min && max) return `${min}-${max}元`;
    return `${min || max}元`;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">推荐记录管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">共 {recommendations.length} 条记录</span>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => { loadCreateOptions(); setShowCreate(true); }}
          >
            <Plus className="w-4 h-4 mr-1" /> 推荐阿姨
          </Button>
        </div>
      </div>

      {/* 推荐视角Tab */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wide">
          <ClipboardList className="w-3.5 h-3.5" /> 推荐视角
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {([
              { key: 'all' as ViewTab, label: '全部推荐', color: 'bg-slate-600', icon: <Users className="w-3.5 h-3.5" /> },
              { key: 'mine' as ViewTab, label: '我的推荐', color: 'bg-blue-600', icon: <User className="w-3.5 h-3.5" /> },
              { key: 'others' as ViewTab, label: '他人推荐', color: 'bg-purple-600', icon: <UserPlus className="w-3.5 h-3.5" /> },
              { key: 'signed' as ViewTab, label: '推荐签约', color: 'bg-emerald-600', icon: <FileCheck className="w-3.5 h-3.5" /> },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setViewTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewTab === tab.key
                    ? `${tab.color} text-white shadow-sm`
                    : 'bg-white text-slate-600 border hover:bg-slate-50'
                }`}
              >
                {tab.icon} {tab.label} ({viewTabCounts[tab.key]})
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索阿姨/推荐人/订单"
              className="border rounded-lg pl-9 pr-3 py-2 text-sm w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 审核视角Tab（推荐签约Tab下不显示审核Tab） */}
      {viewTab !== 'signed' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wide">
            <Check className="w-3.5 h-3.5" /> 审核状态
          </div>
          <div className="flex gap-2">
            {([
              { key: 'pending' as ReviewTab, label: '待审核', color: 'bg-yellow-500' },
              { key: 'approved' as ReviewTab, label: '已通过', color: 'bg-green-500' },
              { key: 'rejected' as ReviewTab, label: '已拒绝', color: 'bg-red-500' },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setReviewTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  reviewTab === tab.key
                    ? `${tab.color} text-white shadow-sm`
                    : 'bg-white text-slate-600 border hover:bg-slate-50'
                }`}
              >
                {tab.label} ({reviewTabCounts[tab.key]})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 推荐卡片列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          {viewTab === 'signed' ? '暂无签约记录' : '暂无推荐记录'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <Card key={r.id} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                {/* 主信息行 */}
                <div className="flex items-center gap-4">
                  {/* 阿姨信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{r.worker_name || '未知'}</span>
                      {r.worker_status && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{r.worker_status}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.worker_phone && <span>{r.worker_phone}</span>}
                      {r.worker_hometown && <span className="ml-2">籍贯: {r.worker_hometown}</span>}
                    </div>
                  </div>

                  {/* 订单信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 truncate">{r.order_title || '未知订单'}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.order_job_type && <span>{r.order_job_type}</span>}
                      <span className="ml-2">{formatSalary(r.order_salary_min, r.order_salary_max)}</span>
                    </div>
                  </div>

                  {/* 推荐人 */}
                  <div className="w-32">
                    <div className="text-sm text-slate-700">{r.recommender_name || '未知'}</div>
                    <div className="text-xs text-slate-500">{r.recommender_phone || ''}</div>
                  </div>

                  {/* 状态 */}
                  <div className="w-20 text-center">
                    {statusBadge(r.status)}
                  </div>

                  {/* 时间 */}
                  <div className="w-24 text-xs text-slate-500">
                    {r.created_at?.slice(0, 10) || ''}
                  </div>

                  {/* 操作 */}
                  <div className="w-36 flex gap-2 justify-end">
                    {r.status === 'pending' && isOrderOwner(r) && (
                      <>
                        <button
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                          disabled={saving}
                          onClick={() => handleApprove(r)}
                        >
                          <Check className="w-3 h-3" /> 接受
                        </button>
                        <button
                          className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center gap-1"
                          onClick={() => { setRejectTarget(r); setRejectReason(''); }}
                        >
                          <X className="w-3 h-3" /> 拒绝
                        </button>
                      </>
                    )}
                    {r.status === 'pending' && !isOrderOwner(r) && (
                      <span className="text-xs text-slate-400 italic py-1.5">等待处理</span>
                    )}
                    {r.status !== 'pending' && (
                      <button
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                      >
                        {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* 签约信息（推荐签约Tab专属） */}
                {viewTab === 'signed' && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-3 text-xs">
                    {r.salary != null && (
                      <div><span className="text-slate-400">阿姨薪资：</span><span className="font-medium text-green-700">{r.salary}元/月</span></div>
                    )}
                    {r.contract_start && (
                      <div><span className="text-slate-400">合同开始：</span>{r.contract_start}</div>
                    )}
                    {r.contract_end && (
                      <div><span className="text-slate-400">合同结束：</span>{r.contract_end}</div>
                    )}
                    {r.work_start_date && (
                      <div><span className="text-slate-400">上户日期：</span><span className="font-medium text-blue-700">{r.work_start_date}</span></div>
                    )}
                  </div>
                )}

                {/* 拒绝理由 */}
                {r.status === 'rejected' && r.rejection_reason && (
                  <div className="mt-3 p-2 bg-red-50 rounded-md">
                    <span className="text-red-700 text-xs font-medium">拒绝理由：</span>
                    <span className="text-red-600 text-xs ml-1">{r.rejection_reason}</span>
                  </div>
                )}

                {/* 展开详情 */}
                {expandedId === r.id && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-3 text-xs text-slate-600">
                    <div><span className="text-slate-400">技能：</span>{r.worker_skills || '-'}</div>
                    <div><span className="text-slate-400">经验：</span>{r.worker_experience_years ? `${r.worker_experience_years}年` : '-'}</div>
                    <div><span className="text-slate-400">订单状态：</span>{r.order_status || '-'}</div>
                    <div><span className="text-slate-400">地点：</span>{r.order_location || '-'}</div>
                    {r.notes && (
                      <div className="col-span-4"><span className="text-slate-400">备注：</span>{r.notes}</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 拒绝理由弹窗 */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectTarget(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-1">拒绝推荐</h3>
            <p className="text-sm text-slate-500 mb-3">
              拒绝 <span className="font-medium text-slate-700">{rejectTarget.worker_name}</span> 的推荐，理由将展示给推荐人。
            </p>
            <textarea
              className="w-full h-28 border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="请输入拒绝理由（必填）"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 border rounded-md text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setRejectTarget(null)}
              >取消</button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-md text-sm disabled:opacity-50 hover:bg-red-600"
                disabled={!rejectReason.trim() || saving}
                onClick={handleReject}
              >确认拒绝</button>
            </div>
          </div>
        </div>
      )}

      {/* 推荐阿姨弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>推荐阿姨</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>选择订单 *</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={newRec.order_id}
                onChange={e => setNewRec(prev => ({ ...prev, order_id: e.target.value }))}
              >
                <option value="">请选择订单</option>
                {availableOrders.map(o => (
                  <option key={o.id} value={o.id}>{o.title} ({o.status})</option>
                ))}
              </select>
            </div>
            <div>
              <Label>选择阿姨 *</Label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                value={newRec.worker_id}
                onChange={e => setNewRec(prev => ({ ...prev, worker_id: e.target.value }))}
              >
                <option value="">请选择阿姨</option>
                {availableWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}{w.phone ? ` (${w.phone})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>备注</Label>
              <Input
                className="mt-1"
                placeholder="推荐备注"
                value={newRec.notes}
                onChange={e => setNewRec(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!newRec.order_id || !newRec.worker_id || saving}
              onClick={handleCreateRecommendation}
            >
              {saving ? '提交中...' : '确认推荐'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

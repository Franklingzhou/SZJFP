'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Star, Eye, EyeOff, AlertTriangle, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// 6种评价类型定义（from_role → to_role）
const REVIEW_TYPES = [
  { key: 'all', label: '全部', fromRole: null, toRole: null },
  { key: 'customer_worker', label: '客户→阿姨', fromRole: 'customer', toRole: 'worker' },
  { key: 'customer_agent', label: '客户→经纪人', fromRole: 'customer', toRole: 'agent' },
  { key: 'customer_instructor', label: '客户→讲师', fromRole: 'customer', toRole: 'instructor' },
  { key: 'worker_customer', label: '阿姨→客户', fromRole: 'worker', toRole: 'customer' },
  { key: 'agent_customer', label: '经纪人→客户', fromRole: 'agent', toRole: 'customer' },
  { key: 'agent_worker', label: '经纪人→阿姨', fromRole: 'agent', toRole: 'worker' },
  { key: 'agent_agent', label: '经纪人→经纪人', fromRole: 'agent', toRole: 'agent' },
  { key: 'recruiter_worker', label: '招生→阿姨', fromRole: 'recruiter', toRole: 'worker' },
  { key: 'instructor_worker', label: '讲师→阿姨', fromRole: 'instructor', toRole: 'worker' },
  { key: 'operator_worker', label: '运营→阿姨', fromRole: 'worker_operator', toRole: 'worker' },
  { key: 'worker_agent', label: '阿姨→经纪人', fromRole: 'worker', toRole: 'agent' },
] as const;

type ReviewTypeKey = typeof REVIEW_TYPES[number]['key'];

// 角色中文映射
const ROLE_LABELS: Record<string, string> = {
  worker: '工人',
  customer: '客户',
  agent: '经纪人',
  instructor: '讲师',
  recruiter: '招生代理',
  admin: '管理员',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
};

interface ReviewRecord {
  id: string;
  reviewer_id?: string;
  reviewer_name?: string;
  reviewer_role?: string;
  target_user_id?: string;
  target_role?: string;
  worker_name?: string;
  order_id?: string;
  order_title?: string;
  rating: number;
  content?: string;
  hidden?: boolean;
  created_at?: string;
  from_role?: string;
  to_role?: string;
  score?: number;
  comment?: string;
}

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewType, setReviewType] = useState<ReviewTypeKey>('all');
  const [saving, setSaving] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  // 新增评价弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    from_role: 'worker',
    from_user_id: '',
    to_role: 'customer',
    to_user_id: '',
    order_id: '',
    score: 5,
    comment: '',
  });

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.data) {
        setReviews(data.data as ReviewRecord[]);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  // 筛选逻辑：评价类型 + 搜索
  const filtered = reviews.filter(r => {
    // 评价类型筛选（按 from_role → to_role 匹配）
    const typeConfig = REVIEW_TYPES.find(t => t.key === reviewType);
    if (typeConfig && typeConfig.key !== 'all') {
      const rFrom = r.from_role || r.reviewer_role || '';
      const rTo = r.to_role || r.target_role || '';
      if (typeConfig.fromRole && rFrom !== typeConfig.fromRole) return false;
      if (typeConfig.toRole && rTo !== typeConfig.toRole) return false;
    }

    // 搜索
    const matchSearch = !searchTerm ||
      (r.worker_name || '').includes(searchTerm) ||
      (r.reviewer_name || '').includes(searchTerm) ||
      (r.order_title || '').includes(searchTerm) ||
      (r.content || r.comment || '').includes(searchTerm);

    // 评分筛选
    if (ratingFilter !== null && (r.rating || r.score || 0) !== ratingFilter) return false;

    return matchSearch;
  });

  // 计数
  const getCounts = (typeKey: ReviewTypeKey) => {
    const typeConfig = REVIEW_TYPES.find(t => t.key === typeKey);
    return reviews.filter(r => {
      if (typeConfig && typeConfig.key !== 'all') {
        const rFrom = r.from_role || r.reviewer_role || '';
        const rTo = r.to_role || r.target_role || '';
        if (typeConfig.fromRole && rFrom !== typeConfig.fromRole) return false;
        if (typeConfig.toRole && rTo !== typeConfig.toRole) return false;
      }
      return true;
    }).length;
  };

  // 隐藏/恢复
  const handleToggleHidden = async (id: string, hidden: boolean) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, hidden }),
      });
      const data = await res.json();
      if (data.success) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, hidden } : r));
      } else {
        alert('操作失败: ' + (data.error || '未知错误'));
      }
    } catch {
      alert('网络错误');
    }
    setSaving(false);
  };

  // 新增评价 — 映射前端字段到API字段
  const handleCreate = async () => {
    if (!createForm.to_user_id) {
      alert('请输入被评价人ID');
      return;
    }
    setSaving(true);
    try {
      // 前端用 from_role/from_user_id/to_role/to_user_id/score/comment
      // API 用 reviewer_id/reviewer_role/target_user_id/target_role/rating/content
      const body = {
        reviewer_id: createForm.from_user_id || undefined,
        reviewer_role: createForm.from_role,
        target_user_id: createForm.to_user_id,
        target_role: createForm.to_role,
        order_id: createForm.order_id || undefined,
        rating: createForm.score,
        content: createForm.comment,
      };
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setCreateForm({
          from_role: 'worker',
          from_user_id: '',
          to_role: 'customer',
          to_user_id: '',
          order_id: '',
          score: 5,
          comment: '',
        });
        loadReviews();
      } else {
        alert('创建失败: ' + (data.error || '未知错误'));
      }
    } catch {
      alert('网络错误');
    }
    setSaving(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
      />
    ));
  };

  // 渲染评价类型标签
  const renderTypeBadge = (r: ReviewRecord) => {
    const from = ROLE_LABELS[r.from_role || r.reviewer_role || ''] || r.from_role || r.reviewer_role || '?';
    const to = ROLE_LABELS[r.to_role || r.target_role || ''] || r.to_role || r.target_role || '?';
    return `${from}→${to}`;
  };

  const lowRatingCount = reviews.filter(r => (r.rating || r.score || 0) <= 2 && !r.hidden).length;

  if (loading) return <div className="p-8 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      {/* 标题 + 操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">评价管理</h1>
          <p className="text-sm text-muted-foreground mt-1">全平台评价审核、管理，支持按角色筛选与低分预警</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4" /> 新增评价
        </Button>
      </div>

      {/* 低分预警 */}
      {lowRatingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-700">
            当前有 <strong>{lowRatingCount}</strong> 条低分评价（1-2星），建议关注处理
          </span>
        </div>
      )}

      {/* 搜索 + 评分筛选 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索被评价人、评价者、订单或内容"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-muted-foreground">评分：</span>
          <button
            onClick={() => setRatingFilter(null)}
            className={cn('px-2 py-1 text-xs rounded', ratingFilter === null ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
          >
            全部
          </button>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRatingFilter(n)}
              className={cn('px-2 py-1 text-xs rounded flex items-center gap-0.5', ratingFilter === n ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            >
              {n}<Star className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>

      {/* 评价类型Tab */}
      <Tabs value={reviewType} onValueChange={v => setReviewType(v as ReviewTypeKey)} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1 bg-slate-100 p-1">
          {REVIEW_TYPES.map(type => (
            <TabsTrigger
              key={type.key}
              value={type.key}
              className="data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              {type.label}
              <Badge className="ml-1.5 bg-slate-200 text-slate-600 hover:bg-slate-200 text-xs">
                {getCounts(type.key)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={reviewType} className="space-y-3">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">暂无评价记录</CardContent></Card>
          ) : filtered.map(r => {
            const rating = r.rating || r.score || 0;
            return (
              <Card
                key={r.id}
                className={cn(
                  'hover:shadow-md transition-shadow cursor-pointer',
                  r.hidden && 'opacity-60',
                  rating <= 2 && !r.hidden && 'border-amber-200'
                )}
                onClick={() => setSelectedReview(r)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* 第一行：被评价人 + 星级 + 标签 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-slate-900">{r.worker_name || r.target_user_id}</span>
                        <div className="flex items-center gap-0.5">{renderStars(rating)}</div>
                        {r.hidden && <Badge variant="destructive">已隐藏</Badge>}
                        {rating <= 2 && !r.hidden && <Badge className="text-xs bg-amber-100 text-amber-700">低分</Badge>}
                        <Badge variant="outline" className="text-xs">{renderTypeBadge(r)}</Badge>
                      </div>

                      {/* 评价内容 */}
                      {(r.content || r.comment) && (
                        <p className={cn('text-sm line-clamp-2', r.hidden ? 'text-slate-400 line-through' : 'text-slate-600')}>
                          {r.content || r.comment}
                        </p>
                      )}

                      {/* 元信息 */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>关联: {r.order_title || r.order_id || '无订单'}</span>
                        <span>评价者: {r.reviewer_name || r.reviewer_id || '-'}</span>
                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : ''}</span>
                      </div>
                    </div>

                    {/* 操作区 */}
                    <div className="flex-shrink-0 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                      {r.hidden ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-green-600 hover:text-green-700 h-7 text-xs"
                          onClick={() => handleToggleHidden(r.id, false)}
                          disabled={saving}
                        >
                          <Eye className="h-3.5 w-3.5" /> 恢复
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-red-600 hover:text-red-700 h-7 text-xs"
                          onClick={() => handleToggleHidden(r.id, true)}
                          disabled={saving}
                        >
                          <EyeOff className="h-3.5 w-3.5" /> 隐藏
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* 详情弹窗 */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>评价详情</DialogTitle></DialogHeader>
          {selectedReview && (() => {
            const rating = selectedReview.rating || selectedReview.score || 0;
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-1">{renderStars(rating)}</div>
                <div className="bg-slate-50 rounded-md p-3">
                  <p className="text-sm text-slate-700">{selectedReview.content || selectedReview.comment || '（无文字评价）'}</p>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    评价人: {ROLE_LABELS[selectedReview.reviewer_role || ''] || '?'} -{' '}
                    <span className="font-medium">{selectedReview.reviewer_name || selectedReview.reviewer_id}</span>
                  </div>
                  <div>
                    被评价: {ROLE_LABELS[selectedReview.target_role || ''] || '?'} -{' '}
                    <span className="font-medium">{selectedReview.worker_name || selectedReview.target_user_id}</span>
                  </div>
                  {selectedReview.order_id && (
                    <div>关联: {selectedReview.order_title || selectedReview.order_id}</div>
                  )}
                  <div>时间: {selectedReview.created_at?.slice(0, 16).replace('T', ' ')}</div>
                </div>
                <div className="border-t pt-3 flex gap-3 justify-end">
                  {selectedReview.hidden ? (
                    <Button onClick={() => { handleToggleHidden(selectedReview.id, false); setSelectedReview(null); }} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                      <Eye className="h-4 w-4 mr-1" /> 恢复显示
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={() => { handleToggleHidden(selectedReview.id, true); setSelectedReview(null); }} disabled={saving}>
                      <EyeOff className="h-4 w-4 mr-1" /> 隐藏评价
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 新增评价弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>新增评价</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>评价人角色 *</Label>
              <Select value={createForm.from_role} onValueChange={v => setCreateForm({ ...createForm, from_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">阿姨</SelectItem>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="agent">经纪人</SelectItem>
                  <SelectItem value="instructor">讲师</SelectItem>
                  <SelectItem value="recruiter">招生代理</SelectItem>
                  <SelectItem value="worker_operator">阿姨运营</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>评价人ID</Label>
              <Input
                placeholder="留空则使用当前登录用户"
                value={createForm.from_user_id}
                onChange={e => setCreateForm({ ...createForm, from_user_id: e.target.value })}
              />
            </div>
            <div>
              <Label>被评价人角色 *</Label>
              <Select value={createForm.to_role} onValueChange={v => setCreateForm({ ...createForm, to_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">阿姨</SelectItem>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="agent">经纪人</SelectItem>
                  <SelectItem value="instructor">讲师</SelectItem>
                  <SelectItem value="recruiter">招生代理</SelectItem>
                  <SelectItem value="worker_operator">阿姨运营</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>被评价人ID *</Label>
              <Input
                placeholder="输入被评价人用户ID"
                value={createForm.to_user_id}
                onChange={e => setCreateForm({ ...createForm, to_user_id: e.target.value })}
              />
            </div>
            <div>
              <Label>关联订单/课程/合同ID（可选）</Label>
              <Input
                placeholder="输入关联ID，有订单就填"
                value={createForm.order_id}
                onChange={e => setCreateForm({ ...createForm, order_id: e.target.value })}
              />
            </div>
            <div>
              <Label>星级评分</Label>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, score: n })}
                    className="p-0.5"
                  >
                    <Star className={`h-6 w-6 ${n <= createForm.score ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                  </button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">{createForm.score}分</span>
              </div>
            </div>
            <div>
              <Label>评价内容</Label>
              <Textarea
                placeholder="输入评价内容"
                rows={3}
                value={createForm.comment}
                onChange={e => setCreateForm({ ...createForm, comment: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-amber-500 hover:bg-amber-600">提交评价</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

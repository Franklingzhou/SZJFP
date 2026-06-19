'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Star, Eye, EyeOff } from 'lucide-react';
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
  { key: 'worker_customer', label: '工人→客户', fromRole: 'worker', toRole: 'customer' },
  { key: 'worker_agent', label: '工人→经纪人', fromRole: 'worker', toRole: 'agent' },
  { key: 'agent_customer', label: '经纪人→客户', fromRole: 'agent', toRole: 'customer' },
  { key: 'customer_worker', label: '客户→工人', fromRole: 'customer', toRole: 'worker' },
  { key: 'customer_agent', label: '客户→经纪人', fromRole: 'customer', toRole: 'agent' },
  { key: 'agent_worker', label: '经纪人→工人', fromRole: 'agent', toRole: 'worker' },
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

  if (loading) return <div className="p-8 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      {/* 标题 + 操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">评价管理</h1>
          <p className="text-sm text-muted-foreground mt-1">6种评价类型、隐藏不当评价</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4" /> 新增评价
        </Button>
      </div>

      {/* 搜索 */}
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
      </div>

      {/* 6种评价类型Tab */}
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
              <Card key={r.id} className={`${r.hidden ? 'opacity-60' : ''} hover:shadow-md transition-shadow`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* 第一行：被评价人 + 星级 + 类型标签 */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-slate-900">{r.worker_name || r.target_user_id}</span>
                        <div className="flex items-center gap-0.5">{renderStars(rating)}</div>
                        {r.hidden && <Badge variant="destructive">已隐藏</Badge>}
                        <Badge variant="outline" className="text-xs">
                          {renderTypeBadge(r)}
                        </Badge>
                      </div>

                      {/* 评价内容 */}
                      {(r.content || r.comment) && (
                        <p className="text-sm text-slate-600 line-clamp-2">{r.content || r.comment}</p>
                      )}

                      {/* 元信息 */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>订单: {r.order_title || r.order_id || '-'}</span>
                        <span>评价者: {r.reviewer_name || r.reviewer_id || '-'}</span>
                        <span>{r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : ''}</span>
                      </div>
                    </div>

                    {/* 操作区 */}
                    <div className="flex-shrink-0 flex flex-col gap-2">
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

      {/* 新增评价弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>新增评价</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>评价人角色 (from_role) *</Label>
              <Select value={createForm.from_role} onValueChange={v => setCreateForm({ ...createForm, from_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">工人</SelectItem>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="agent">经纪人</SelectItem>
                  <SelectItem value="instructor">讲师</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>评价人ID (from_user_id)</Label>
              <Input
                placeholder="留空则使用当前登录用户"
                value={createForm.from_user_id}
                onChange={e => setCreateForm({ ...createForm, from_user_id: e.target.value })}
              />
            </div>
            <div>
              <Label>被评价人角色 (to_role) *</Label>
              <Select value={createForm.to_role} onValueChange={v => setCreateForm({ ...createForm, to_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">工人</SelectItem>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="agent">经纪人</SelectItem>
                  <SelectItem value="instructor">讲师</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>被评价人ID (to_user_id) *</Label>
              <Input
                placeholder="输入被评价人用户ID"
                value={createForm.to_user_id}
                onChange={e => setCreateForm({ ...createForm, to_user_id: e.target.value })}
              />
            </div>
            <div>
              <Label>订单ID</Label>
              <Input
                placeholder="输入订单ID（可选）"
                value={createForm.order_id}
                onChange={e => setCreateForm({ ...createForm, order_id: e.target.value })}
              />
            </div>
            <div>
              <Label>星级评分 (score)</Label>
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
              <Label>评价内容 (comment)</Label>
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

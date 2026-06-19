'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Star, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  target_user_id: string;
  target_role: string;
  reviewer_id: string;
  reviewer_role: string;
  order_id: string;
  rating: number;
  content: string;
  hidden: boolean;
  created_at: string;
  updated_at: string;
  target_name?: string;
  reviewer_name?: string;
  order_title?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: '非常差',
  2: '差',
  3: '一般',
  4: '好',
  5: '非常好',
};

const ROLE_LABELS: Record<string, string> = {
  worker: '阿姨',
  agent: '经纪人',
  customer: '客户',
  instructor: '讲师',
  recruiter: '招生',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
  admin: '管理员',
};

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn('h-4 w-4', i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300')}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{RATING_LABELS[rating] || ''}</span>
    </div>
  );
}

export default function ReviewAuditsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'normal' | 'hidden' | 'all'>('normal');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [processing, setProcessing] = useState(false);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<Record<string, string>>({});
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      let url = '/api/reviews';
      if (activeTab === 'normal') url += '?hidden=false';
      else if (activeTab === 'hidden') url += '?hidden=true';

      const res = await fetch(url, { headers: getAuthHeaders(false) });
      const result = await res.json();
      const data: Review[] = result.data || result.reviews || [];
      setReviews(data);

      // 加载用户名映射
      const userIds = [...new Set(data.flatMap((r: Review) => [r.target_user_id, r.reviewer_id]).filter(Boolean))];
      if (userIds.length > 0) {
        const usersRes = await fetch('/api/users', { headers: getAuthHeaders(false) });
        const usersData = await usersRes.json();
        const userMap: Record<string, string> = {};
        (usersData.data || usersData.users || []).forEach((u: { id: string; name: string }) => {
          userMap[u.id] = u.name;
        });
        setUsers(userMap);
      }

      // 加载订单标题映射
      const orderIds = [...new Set(data.map((r: Review) => r.order_id).filter(Boolean))];
      if (orderIds.length > 0) {
        const ordersRes = await fetch('/api/orders', { headers: getAuthHeaders(false) });
        const ordersData = await ordersRes.json();
        const orderMap: Record<string, string> = {};
        (ordersData.data || ordersData.orders || []).forEach((o: { id: string; title?: string; job_type?: string }) => {
          orderMap[o.id] = o.title || o.job_type || '未知订单';
        });
        setOrders(orderMap);
      }
    } catch (err) {
      console.error('加载评价失败:', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleHidden(review: Review) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hidden: !review.hidden }),
      });
      const result = await res.json();
      if (!result.success && !result.data) {
        alert('操作失败：' + (result.error || '请重试'));
        return;
      }
      setSelectedReview(null);
      loadData();
    } catch (err) {
      console.error('操作失败:', err);
      alert('操作失败，请重试');
    } finally {
      setProcessing(false);
    }
  }

  // 筛选
  const filtered = reviews.filter(r => {
    if (ratingFilter !== null && r.rating !== ratingFilter) return false;
    return true;
  });

  // 统计
  const normalCount = reviews.filter(r => !r.hidden).length;
  const hiddenCount = reviews.filter(r => r.hidden).length;
  const lowRatingCount = reviews.filter(r => r.rating <= 2 && !r.hidden).length;

  if (loading && reviews.length === 0) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">评价审核</h1>
        <p className="text-sm text-muted-foreground mt-1">审核和管理平台评价内容</p>
      </div>

      {/* 预警提示 */}
      {lowRatingCount > 0 && activeTab === 'normal' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-700">
            当前有 <strong>{lowRatingCount}</strong> 条低分评价（1-2星），建议审核
          </span>
        </div>
      )}

      {/* Tab切换 */}
      <div className="flex gap-2">
        {([
          { key: 'normal' as const, label: '正常评价', count: normalCount, color: 'bg-green-500' },
          { key: 'hidden' as const, label: '已隐藏', count: hiddenCount, color: 'bg-slate-500' },
          { key: 'all' as const, label: '全部', count: normalCount + hiddenCount, color: 'bg-blue-500' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? `${tab.color} text-white shadow-sm`
                : 'bg-white text-slate-600 border hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 评分筛选 */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-muted-foreground">评分筛选：</span>
        <button
          onClick={() => setRatingFilter(null)}
          className={cn('px-2 py-1 text-xs rounded', ratingFilter === null ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
        >
          全部
        </button>
        {[1, 2, 3, 4, 5].map(r => (
          <button
            key={r}
            onClick={() => setRatingFilter(r)}
            className={cn('px-2 py-1 text-xs rounded flex items-center gap-0.5', ratingFilter === r ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
          >
            {r}<Star className="h-3 w-3" />
          </button>
        ))}
      </div>

      {/* 评价列表 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无{activeTab === 'hidden' ? '已隐藏' : ''}评价
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(review => (
            <Card
              key={review.id}
              className={cn(
                'hover:shadow-md transition-shadow cursor-pointer',
                review.hidden && 'opacity-60',
                review.rating <= 2 && !review.hidden && 'border-amber-200'
              )}
              onClick={() => setSelectedReview(review)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StarRating rating={review.rating} />
                      {review.hidden && (
                        <Badge className="text-xs bg-slate-200 text-slate-600">
                          <EyeOff className="h-3 w-3 mr-1" />已隐藏
                        </Badge>
                      )}
                      {review.rating <= 2 && !review.hidden && (
                        <Badge className="text-xs bg-amber-100 text-amber-700">低分预警</Badge>
                      )}
                    </div>
                    <p className={cn('text-sm text-slate-700 mb-2', review.hidden && 'line-through')}>
                      {review.content || '（无文字评价）'}
                    </p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>
                        {ROLE_LABELS[review.reviewer_role] || review.reviewer_role} 
                        <span className="font-medium">{users[review.reviewer_id] || review.reviewer_id}</span>
                        {' → '}
                        {ROLE_LABELS[review.target_role] || review.target_role}
                        <span className="font-medium">{users[review.target_user_id] || review.target_user_id}</span>
                      </div>
                      {review.order_id && (
                        <div>关联订单: {orders[review.order_id] || review.order_id}</div>
                      )}
                      <div>{review.created_at?.slice(0, 16).replace('T', ' ')}</div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <MessageSquare className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>评价详情</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div>
                <StarRating rating={selectedReview.rating} />
              </div>
              <div className="bg-slate-50 rounded-md p-3">
                <p className="text-sm text-slate-700">{selectedReview.content || '（无文字评价）'}</p>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  评价人: {ROLE_LABELS[selectedReview.reviewer_role]} - 
                  <span className="font-medium">{users[selectedReview.reviewer_id] || selectedReview.reviewer_id}</span>
                </div>
                <div>
                  被评价: {ROLE_LABELS[selectedReview.target_role]} - 
                  <span className="font-medium">{users[selectedReview.target_user_id] || selectedReview.target_user_id}</span>
                </div>
                {selectedReview.order_id && (
                  <div>关联订单: {orders[selectedReview.order_id] || selectedReview.order_id}</div>
                )}
                <div>评价时间: {selectedReview.created_at?.slice(0, 16).replace('T', ' ')}</div>
              </div>

              {/* 操作按钮 */}
              <div className="border-t pt-3 flex gap-3 justify-end">
                {selectedReview.hidden ? (
                  <Button
                    onClick={() => handleToggleHidden(selectedReview)}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Eye className="h-4 w-4 mr-1" /> 恢复显示
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => handleToggleHidden(selectedReview)}
                    disabled={processing}
                  >
                    <EyeOff className="h-4 w-4 mr-1" /> 隐藏评价
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

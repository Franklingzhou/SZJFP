'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, FilePenLine, ArrowRight, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// 状态配置
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

// 字段中文映射
const FIELD_LABELS: Record<string, string> = {
  name: '姓名',
  phone: '电话',
  age: '年龄',
  gender: '性别',
  origin: '籍贯',
  job_types: '工种',
  experience_years: '经验年限',
  specialties: '特长',
  certifications: '证书',
  expected_salary_min: '期望薪资下限',
  expected_salary_max: '期望薪资上限',
  available_date: '可到岗日期',
  status: '状态',
  credit_score: '诚信分',
  deposit: '保证金',
  points: '积分',
  resume_review_status: '审核状态',
  photo: '照片',
  remark: '备注',
  id_card: '身份证',
};

// Tab 配置
const TABS = [
  { key: 'all', label: '全部', color: 'bg-slate-800', icon: Filter },
  { key: 'pending', label: '待审核', color: 'bg-amber-500', icon: Clock },
  { key: 'approved', label: '已通过', color: 'bg-green-600', icon: CheckCircle },
  { key: 'rejected', label: '已拒绝', color: 'bg-red-500', icon: XCircle },
] as const;

interface ResumeReview {
  id: string;
  worker_id: string;
  type: string;
  review_type: string;
  old_data: string | null;
  new_data: string | null;
  changes: string | null;
  proposed_data: Record<string, unknown> | null;
  original_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  status: string;
  reviewer_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  worker_phone?: string;
  workers: {
    name: string;
    phone: string;
    job_types: string;
    origin: string;
  } | null;
}

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function AuditsPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [reviews, setReviews] = useState<ResumeReview[]>([]);
  const [allReviews, setAllReviews] = useState<ResumeReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<ResumeReview | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  // 当 tab 切换时过滤数据
  useEffect(() => {
    if (activeTab === 'all') {
      setReviews(allReviews);
    } else {
      setReviews(allReviews.filter((r: ResumeReview) => r.status === activeTab));
    }
  }, [activeTab, allReviews]);

  async function loadAllData() {
    setLoading(true);
    try {
      const res = await fetch('/api/resume-reviews', { headers: getAuthHeaders(false) });
      const result = await res.json();
      setAllReviews(result.data || []);
    } catch (err) {
      console.error('加载审核记录失败:', err);
      setAllReviews([]);
    } finally {
      setLoading(false);
    }
  }

  // 通过 POST /api/resume-reviews/[id]/approve 或 /reject
  async function handleApprove(reviewId: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/resume-reviews/${reviewId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ review_note: reviewNote || '审核通过' }),
      });
      const result = await res.json();
      if (!result.ok) {
        alert('审核失败：' + (result.error || '请重试'));
        return;
      }
      setSelectedReview(null);
      setReviewNote('');
      loadAllData();
    } catch (err) {
      console.error('审核失败:', err);
      alert('审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reviewId: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/resume-reviews/${reviewId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ review_note: reviewNote || '审核未通过' }),
      });
      const result = await res.json();
      if (!result.ok) {
        alert('审核失败：' + (result.error || '请重试'));
        return;
      }
      setSelectedReview(null);
      setReviewNote('');
      loadAllData();
    } catch (err) {
      console.error('审核失败:', err);
      alert('审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  function parseJsonData(data: string | null): Record<string, unknown> | null {
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  }

  // 从 proposed_data / original_data / changed_fields 提取变更
  function getChangedFields(review: ResumeReview) {
    const changes: { field: string; label: string; oldValue: unknown; newValue: unknown }[] = [];

    // 优先使用 proposed_data + original_data
    if (review.proposed_data && review.original_data) {
      const fields = review.changed_fields || Object.keys(review.proposed_data);
      for (const field of fields) {
        const label = FIELD_LABELS[field] || field;
        const oldVal = review.original_data[field];
        const newVal = review.proposed_data[field];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({ field, label, oldValue: oldVal, newValue: newVal });
        }
      }
    } else {
      // 回退到 old_data / new_data
      const oldData = parseJsonData(review.old_data);
      const newData = parseJsonData(review.new_data);
      if (newData) {
        for (const field of Object.keys(FIELD_LABELS)) {
          const oldVal = oldData?.[field];
          const newVal = newData[field];
          if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes.push({ field, label: FIELD_LABELS[field], oldValue: oldVal, newValue: newVal });
          }
        }
      }
    }
    return changes;
  }

  // 统计
  const counts = {
    all: allReviews.length,
    pending: allReviews.filter((r: ResumeReview) => r.status === 'pending').length,
    approved: allReviews.filter((r: ResumeReview) => r.status === 'approved').length,
    rejected: allReviews.filter((r: ResumeReview) => r.status === 'rejected').length,
  };

  if (loading && allReviews.length === 0) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">简历变更审核</h1>
        <p className="text-sm text-muted-foreground mt-1">审核阿姨提交的简历修改申请，审核结果将自动通知简历主人</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? `${tab.color} text-white shadow-sm`
                : 'bg-white text-slate-600 border hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label} ({counts[tab.key as keyof typeof counts] ?? 0})
          </button>
        ))}
      </div>

      {/* 审核列表 */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无{activeTab === 'all' ? '' : STATUS_MAP[activeTab]?.label}简历审核记录
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => {
            const changes = getChangedFields(review);
            return (
              <Card
                key={review.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => { setSelectedReview(review); setReviewNote(''); }}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-800">
                          {review.workers?.name || '未知'}
                        </span>
                        <Badge className={cn('text-xs', STATUS_MAP[review.status]?.color)}>
                          {STATUS_MAP[review.status]?.label}
                        </Badge>
                        <Badge className="text-xs bg-blue-100 text-blue-800">
                          {review.review_type === 'create_resume' ? '新建简历' : '修改简历'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {review.workers?.origin || '未知籍贯'} · {review.workers?.job_types || '未设置工种'}
                      </div>

                      {/* 变更字段预览 */}
                      {changes.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {changes.slice(0, 4).map(c => (
                            <span key={c.field} className="inline-flex items-center text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                              {c.label}: {c.oldValue != null ? String(c.oldValue) : '(空)'}
                              <ArrowRight className="h-3 w-3 mx-1" />
                              {c.newValue != null ? String(c.newValue) : '(空)'}
                            </span>
                          ))}
                          {changes.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{changes.length - 4}项</span>
                          )}
                        </div>
                      )}
                      {review.changes && changes.length === 0 && (
                        <div className="text-sm text-amber-600 mt-1">变更: {review.changes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs">{review.created_at?.slice(0, 10)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 审核详情弹窗 */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>简历审核 - {selectedReview?.workers?.name || '未知'}</DialogTitle>
          </DialogHeader>
          {selectedReview && (() => {
            const changes = getChangedFields(selectedReview);
            return (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', STATUS_MAP[selectedReview.status]?.color)}>
                        {STATUS_MAP[selectedReview.status]?.label}
                      </Badge>
                      <Badge className="text-xs bg-blue-100 text-blue-800">
                        {selectedReview.review_type === 'create_resume' ? '新建简历' : '修改简历'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedReview.workers?.origin || '未知籍贯'} · {selectedReview.workers?.job_types || '未设置工种'}
                      {selectedReview.worker_phone && ` · ${selectedReview.worker_phone}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      提交时间: {new Date(selectedReview.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* 变更描述 */}
                {selectedReview.changes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <div className="flex items-center gap-1 text-amber-700 font-medium text-sm mb-2">
                      <FilePenLine className="h-4 w-4" />
                      变更描述
                    </div>
                    <div className="text-sm text-amber-800 whitespace-pre-line">{selectedReview.changes}</div>
                  </div>
                )}

                {/* 字段对比表 */}
                {changes.length > 0 ? (
                  <div className="border rounded-md p-3">
                    <h4 className="font-medium text-sm mb-3">字段变更对比</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm font-medium text-slate-500 mb-2 px-2">
                      <div>字段</div>
                      <div>原值</div>
                      <div>新值</div>
                    </div>
                    <div className="space-y-1">
                      {changes.map(change => (
                        <div key={change.field} className="grid grid-cols-3 gap-2 text-sm px-2 py-1.5 rounded hover:bg-slate-50">
                          <div className="font-medium text-slate-700">{change.label}</div>
                          <div className="text-red-500 line-through">
                            {change.oldValue !== undefined && change.oldValue !== null ? String(change.oldValue) : '(空)'}
                          </div>
                          <div className="text-green-600 font-medium">
                            {change.newValue !== undefined && change.newValue !== null ? String(change.newValue) : '(空)'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedReview.review_type === 'create_resume' ? (
                  <div className="border rounded-md p-3 text-sm text-muted-foreground">
                    新建简历申请，无对比数据
                  </div>
                ) : null}

                {/* 审核备注和操作 */}
                {selectedReview.status === 'pending' && (
                  <div className="space-y-3 pt-2 border-t">
                    <div>
                      <label className="text-sm font-medium">审核备注</label>
                      <Textarea
                        value={reviewNote}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReviewNote(e.target.value)}
                        placeholder="输入审核备注（可选）..."
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(selectedReview.id)}
                        disabled={submitting}
                      >
                        <XCircle className="h-4 w-4 mr-1" /> 拒绝
                      </Button>
                      <Button
                        onClick={() => handleApprove(selectedReview.id)}
                        disabled={submitting}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> 通过
                      </Button>
                    </div>
                  </div>
                )}

                {/* 已审核记录显示 */}
                {selectedReview.status !== 'pending' && (
                  <div className="border-t pt-3 space-y-1">
                    <div className="text-sm text-muted-foreground">
                      审核状态: <Badge className={cn('text-xs', STATUS_MAP[selectedReview.status]?.color)}>
                        {STATUS_MAP[selectedReview.status]?.label}
                      </Badge>
                    </div>
                    {selectedReview.review_note && (
                      <div className="text-sm text-muted-foreground">审核备注: {selectedReview.review_note}</div>
                    )}
                    {selectedReview.reviewed_at && (
                      <div className="text-sm text-muted-foreground">
                        审核时间: {new Date(selectedReview.reviewed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

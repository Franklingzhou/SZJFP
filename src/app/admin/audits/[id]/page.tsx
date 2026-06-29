'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, FilePenLine, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

function getChangedFields(review: ResumeReview) {
  const changes: { field: string; label: string; oldValue: unknown; newValue: unknown }[] = [];

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
    const oldData = review.old_data ? (() => { try { return JSON.parse(review.old_data!); } catch { return null; } })() : null;
    const newData = review.new_data ? (() => { try { return JSON.parse(review.new_data!); } catch { return null; } })() : null;
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

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.id as string;

  const [review, setReview] = useState<ResumeReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReview();
  }, [reviewId]);

  async function loadReview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resume-reviews/${reviewId}`, { headers: getAuthHeaders(false) });
      if (!res.ok) {
        if (res.status === 404) { setError('审核记录不存在'); return; }
        if (res.status === 401) { setError('无权限访问'); return; }
        setError('加载失败');
        return;
      }
      const result = await res.json();
      setReview(result.data || null);
    } catch {
      setError('网络错误，加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!review) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/resume-reviews/${review.id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ review_note: reviewNote || '审核通过' }),
      });
      const result = await res.json();
      if (!result.ok) {
        alert('审核失败：' + (result.error || '请重试'));
        return;
      }
      loadReview();
      setReviewNote('');
    } catch {
      alert('审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!review) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/resume-reviews/${review.id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ review_note: reviewNote || '审核未通过' }),
      });
      const result = await res.json();
      if (!result.ok) {
        alert('审核失败：' + (result.error || '请重试'));
        return;
      }
      loadReview();
      setReviewNote('');
    } catch {
      alert('审核失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-red-500 text-lg">{error}</div>
        <Button variant="outline" onClick={() => router.push('/admin/audits')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回审核列表
        </Button>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-slate-400 text-lg">审核记录不存在</div>
        <Button variant="outline" onClick={() => router.push('/admin/audits')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回审核列表
        </Button>
      </div>
    );
  }

  const changes = getChangedFields(review);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 顶部导航 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/audits')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> 返回
        </Button>
        <h1 className="text-xl font-bold text-slate-900">简历审核详情</h1>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {/* 基本信息 */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {review.workers?.name || '未知阿姨'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn('text-xs', STATUS_MAP[review.status]?.color)}>
                  {STATUS_MAP[review.status]?.label}
                </Badge>
                <Badge className="text-xs bg-blue-100 text-blue-800">
                  {review.review_type === 'create_resume' ? '新建简历' : '修改简历'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {review.workers?.origin || '未知籍贯'} · {review.workers?.job_types || '未设置工种'}
                {review.workers?.phone && ` · ${review.workers.phone}`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                提交时间: {new Date(review.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          {/* 变更描述 */}
          {review.changes && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-center gap-1 text-amber-700 font-medium text-sm mb-2">
                <FilePenLine className="h-4 w-4" />
                变更描述
              </div>
              <div className="text-sm text-amber-800 whitespace-pre-line">{review.changes}</div>
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
          ) : review.review_type === 'create_resume' ? (
            <div className="border rounded-md p-3 text-sm text-muted-foreground">
              新建简历申请，无对比数据
            </div>
          ) : null}

          {/* 审核备注和操作 */}
          {review.status === 'pending' && (
            <div className="space-y-3 pt-3 border-t">
              <div>
                <label className="text-sm font-medium">审核备注</label>
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="输入审核备注（可选）..."
                  className="mt-1"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={submitting}
                >
                  <XCircle className="h-4 w-4 mr-1" /> 拒绝
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> 通过
                </Button>
              </div>
            </div>
          )}

          {/* 已审核记录显示 */}
          {review.status !== 'pending' && (
            <div className="border-t pt-3 space-y-1">
              <div className="text-sm text-muted-foreground">
                审核状态: <Badge className={cn('text-xs', STATUS_MAP[review.status]?.color)}>
                  {STATUS_MAP[review.status]?.label}
                </Badge>
              </div>
              {review.review_note && (
                <div className="text-sm text-muted-foreground">审核备注: {review.review_note}</div>
              )}
              {review.reviewed_at && (
                <div className="text-sm text-muted-foreground">
                  审核时间: {new Date(review.reviewed_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

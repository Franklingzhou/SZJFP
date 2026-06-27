'use client';

import { useState, useEffect } from 'react';
import { FileCheck, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ReviewRecord = {
  id: string;
  worker_id: string;
  type: string;
  review_type: string;
  old_data?: string;
  new_data?: string;
  proposed_data?: Record<string, unknown>;
  original_data?: Record<string, unknown>;
  changed_fields?: string[];
  status: string;
  reviewer_id?: string;
  review_note?: string;
  reviewed_at?: string;
  created_at: string;
  workers?: {
    name: string;
    job_types?: string[];
    origin?: string;
    lead_id?: string | null;
  };
  worker_phone?: string;
};

const fieldLabels: Record<string, string> = {
  name: '姓名',
  phone: '手机号',
  age: '年龄',
  gender: '性别',
  origin: '籍贯',
  job_types: '工种',
  experience_years: '从业年限',
  specialties: '特长',
  certifications: '证书',
  expected_salary_min: '期望薪资（最低）',
  expected_salary_max: '期望薪资（最高）',
  available_date: '可上岗日期',
  remark: '备注',
  id_card: '身份证号',
  status: '状态',
  credit_score: '诚信分',
  deposit: '保证金',
  points: '积分',
  photo: '照片',
};

export default function ResumeReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [sourceFilter, setSourceFilter] = useState<string>('all'); // 'all' | 'lead' | 'direct'

  useEffect(() => {
    loadReviews();
  }, [filterStatus, sourceFilter]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      let url = `/api/resume-reviews?status=${filterStatus}`;
      if (sourceFilter !== 'all') url += `&source=${sourceFilter}`;

      const res = await fetch(url, {
        headers: { 'x-session': token }
      });
      const data = await res.json();
      if (data.data) {
        setReviews(data.data);
      }
    } catch (error) {
      console.error('加载审核记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reviewId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`/api/resume-reviews/${reviewId}/approve`, {
        method: 'POST',
        headers: { 'x-session': token }
      });

      const data = await res.json();
      if (data.ok || data.success) {
        alert('审核通过');
        loadReviews();
        setSelectedReview(null);
      } else {
        alert('审核失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('审核失败');
    }
  };

  const handleReject = async (reviewId: string, reason: string) => {
    if (!reason) {
      alert('请输入拒绝原因');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const res = await fetch(`/api/resume-reviews/${reviewId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (data.ok || data.success) {
        alert('已拒绝');
        loadReviews();
        setSelectedReview(null);
      } else {
        alert('操作失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">待审核</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">已通过</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">已拒绝</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'create':
        return '新建简历';
      case 'update':
        return '修改简历';
      case 'pause':
        return '暂停接单';
      case 'resume':
        return '恢复接单';
      default:
        return type;
    }
  };

  const renderDiff = (review: ReviewRecord) => {
    const original = review.original_data || {};
    const proposed = review.proposed_data || {};
    const changedFields = review.changed_fields || [];

    if (review.type === 'create') {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-600 mb-2">新建简历信息：</div>
          {Object.entries(proposed).map(([field, value]) => (
            <div key={field} className="flex items-center gap-2 py-1">
              <span className="text-sm text-slate-500 w-24">{fieldLabels[field] || field}:</span>
              <span className="text-sm font-medium text-green-600">{formatValue(field, value)}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-600 mb-2">变更对比：</div>
        {changedFields.length === 0 ? (
          <div className="text-sm text-slate-400">无变更字段</div>
        ) : (
          changedFields.map((field) => (
            <div key={field} className="flex items-center gap-2 py-2 border-b border-slate-100">
              <span className="text-sm font-medium text-slate-700 w-24">{fieldLabels[field] || field}</span>
              <div className="flex items-center gap-2 flex-1">
                <div className="bg-red-50 px-3 py-1 rounded text-sm text-red-700">
                  {formatValue(field, original[field]) || '(空)'}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
                <div className="bg-green-50 px-3 py-1 rounded text-sm text-green-700">
                  {formatValue(field, proposed[field]) || '(空)'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const formatValue = (field: string, value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="h-6 w-6" />
            简历审核
          </h1>
          <p className="text-gray-500 mt-1">审核阿姨简历的新建和修改申请</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('pending')}
            className={filterStatus === 'pending' ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            <Clock className="h-4 w-4 mr-1" />
            待审核 ({reviews.filter(r => r.status === 'pending').length})
          </Button>
          <Button
            variant={filterStatus === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('approved')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            已通过
          </Button>
          <Button
            variant={filterStatus === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('rejected')}
          >
            <XCircle className="h-4 w-4 mr-1" />
            已拒绝
          </Button>
        </div>
      </div>

      {/* 来源Tab */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: '全部来源' },
          { key: 'lead', label: '线索签约' },
          { key: 'direct', label: '直接提交' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSourceFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              sourceFilter === tab.key
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-600 border hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 审核列表 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">审核列表</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {reviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400">暂无审核记录</div>
            ) : (
              reviews.map((review) => (
                <button
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className={`w-full p-4 hover:bg-slate-50 transition-colors ${
                    selectedReview?.id === review.id ? 'bg-amber-50' : ''
                  }`}
                >
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-800">
                          {review.workers?.name || '未知'}
                        </span>
                        {getStatusBadge(review.status)}
                        {review.workers?.lead_id ? (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">线索签约</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">直接提交</Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-500">
                        {getTypeLabel(review.type)} · {review.worker_phone || ''}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        提交时间：{new Date(review.created_at).toLocaleString()}
                      </div>
                    </div>
                    {review.status === 'pending' && (
                      <div className="text-xs text-amber-600 font-medium">待处理</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 审核详情 */}
        <div className="bg-white rounded-xl shadow-sm">
          {selectedReview ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">审核详情</h2>
                {getStatusBadge(selectedReview.status)}
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-slate-600 mb-2">阿姨信息</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">姓名：</span>
                      <span className="font-medium">{selectedReview.workers?.name || '未知'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">手机：</span>
                      <span className="font-medium">{selectedReview.worker_phone || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">工种：</span>
                      <span className="font-medium">
                        {selectedReview.workers?.job_types?.join(', ') || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">籍贯：</span>
                      <span className="font-medium">{selectedReview.workers?.origin || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">来源：</span>
                      {selectedReview.workers?.lead_id ? (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">线索签约</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">直接提交</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  {renderDiff(selectedReview)}
                </div>

                {selectedReview.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => handleApprove(selectedReview.id)}
                      className="bg-green-500 hover:bg-green-600 flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      通过
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt('请输入拒绝原因：');
                        if (reason) handleReject(selectedReview.id, reason);
                      }}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      拒绝
                    </Button>
                  </div>
                )}

                {selectedReview.status !== 'pending' && (
                  <div className="bg-slate-50 rounded-lg p-4 text-sm">
                    <div className="text-slate-600 mb-1">审核结果：</div>
                    <div className="font-medium">
                      {selectedReview.status === 'approved' ? '已通过' : '已拒绝'}
                    </div>
                    {selectedReview.review_note && (
                      <div className="mt-2 text-slate-500">
                        备注：{selectedReview.review_note}
                      </div>
                    )}
                    {selectedReview.reviewed_at && (
                      <div className="mt-2 text-xs text-slate-400">
                        审核时间：{new Date(selectedReview.reviewed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              请从左侧选择一条审核记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
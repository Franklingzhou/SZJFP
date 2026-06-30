'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, BookOpen, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

// 培训主管 - 课表审核页
// 审核讲师提交的排课申请（草稿 → 通过/拒绝）

interface Schedule {
  id: string;
  course_id: string;
  instructor_id: string;
  start_time: string;
  end_time: string;
  date: string;
  location: string | null;
  max_students: number | null;
  status: string;
  created_at: string;
  course_name?: string;
  instructor_name?: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function TrainingSupervisorScheduleApprovalPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/course-schedules', { headers: getAuthHeaders() });
      const result = await res.json();
      const data = result.data || [];
      setSchedules(Array.isArray(data) ? data : []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSchedules(); }, []);

  const isPending = (s: Schedule) => s.status === 'pending' || s.status === 'draft';
  const isApproved = (s: Schedule) => s.status === 'approved';
  const isRejected = (s: Schedule) => s.status === 'rejected';

  const pendingSchedules = schedules.filter(isPending);
  const approvedSchedules = schedules.filter(isApproved);
  const rejectedSchedules = schedules.filter(isRejected);

  const displaySchedules =
    tab === 'pending' ? pendingSchedules : tab === 'approved' ? approvedSchedules : rejectedSchedules;

  const handleApproval = async (scheduleId: string, approved: boolean) => {
    setSubmitting(scheduleId);
    try {
      const res = await fetch(`/api/course-schedules/${scheduleId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ approved }),
      });
      const result = await res.json();
      if (result.ok || result.success) {
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === scheduleId ? { ...s, status: approved ? 'approved' : 'rejected' } : s
          )
        );
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setSubmitting(null);
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: '草稿', pending: '待审核',
      approved: '已通过', rejected: '已驳回',
    };
    return map[status] || status;
  };

  const statusColor = (status: string) => {
    if (isPending({ status } as Schedule)) return 'bg-amber-50 text-amber-700';
    if (isApproved({ status } as Schedule)) return 'bg-green-50 text-green-700';
    if (isRejected({ status } as Schedule)) return 'bg-red-50 text-red-700';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="pb-20 px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-slate-800">课表审核</h1>
        <button onClick={loadSchedules} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200" title="刷新">
          <RefreshCw className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab('pending')}
          className={`px-3 py-1.5 rounded-full text-xs ${
            tab === 'pending'
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          待审核 {pendingSchedules.length > 0 && `(${pendingSchedules.length})`}
        </button>
        <button
          onClick={() => setTab('approved')}
          className={`px-3 py-1.5 rounded-full text-xs ${
            tab === 'approved'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          已通过
        </button>
        <button
          onClick={() => setTab('rejected')}
          className={`px-3 py-1.5 rounded-full text-xs ${
            tab === 'rejected'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-white text-slate-500 border border-slate-200'
          }`}
        >
          已驳回
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">加载中...</div>
      ) : (
        <div className="space-y-3">
          {displaySchedules.map((s) => (
            <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-800">
                      {s.course_name || s.course_id}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(s.status)}`}>
                      {statusLabel(s.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.start_time} - {s.end_time}
                    </span>
                    {s.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {s.date}
                      </span>
                    )}
                    {(s.instructor_name || s.instructor_id) && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> 讲师：{s.instructor_name || s.instructor_id}
                      </span>
                    )}
                  </div>
                  {s.location && <p className="text-xs text-slate-400 mt-1">地点：{s.location}</p>}
                </div>
              </div>

              {/* 审批按钮 - 仅待审核状态显示 */}
              {isPending(s) && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleApproval(s.id, true)}
                    disabled={submitting === s.id}
                    className="flex-1 py-2 bg-green-500 text-white text-xs rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {submitting === s.id ? '处理中...' : '通过'}
                  </button>
                  <button
                    onClick={() => handleApproval(s.id, false)}
                    disabled={submitting === s.id}
                    className="flex-1 py-2 bg-red-500 text-white text-xs rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {submitting === s.id ? '处理中...' : '驳回'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {displaySchedules.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              {tab === 'pending' ? '暂无待审核排课' : tab === 'approved' ? '暂无已通过排课' : '暂无已驳回排课'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

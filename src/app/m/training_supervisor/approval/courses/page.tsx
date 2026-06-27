'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Users, CheckCircle, XCircle, FileText, RefreshCw } from 'lucide-react';

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function TrainingSupervisorCourseApprovalPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/courses', { headers: getAuthHeaders() });
      const result = await res.json();
      const data = result.data || result.courses || [];
      setCourses(Array.isArray(data) ? data : []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourses(); }, []);

  const isPending = (c: any) => c.status === 'pending_approval' || c.status === 'pending';
  const isApproved = (c: any) =>
    c.status === 'upcoming' || c.status === 'ongoing' || c.status === 'completed' || c.status === 'active' || c.status === 'approved';
  const isRejected = (c: any) => c.status === 'rejected';

  const pendingCourses = courses.filter(isPending);
  const approvedCourses = courses.filter(isApproved);
  const rejectedCourses = courses.filter(isRejected);

  const displayCourses = tab === 'pending' ? pendingCourses : tab === 'approved' ? approvedCourses : rejectedCourses;

  const handleApproval = async (courseId: string, approved: boolean) => {
    setSubmitting(courseId);
    try {
      const res = await fetch('/api/courses', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: courseId,
          status: approved ? 'upcoming' : 'rejected',
        }),
      });
      const result = await res.json();
      if (result.success || result.ok) {
        setCourses(prev => prev.map(c =>
          c.id === courseId ? { ...c, status: approved ? 'upcoming' : 'rejected' } : c
        ));
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
      pending_approval: '待审批', pending: '待审批',
      upcoming: '已通过', ongoing: '进行中', completed: '已结束', active: '已通过', approved: '已通过',
      rejected: '已驳回',
    };
    return map[status] || status;
  };

  const statusColor = (status: string) => {
    if (isPending({ status })) return 'bg-amber-50 text-amber-700';
    if (isApproved({ status })) return 'bg-blue-50 text-blue-700';
    if (isRejected({ status })) return 'bg-red-50 text-red-700';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="pb-20 px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-slate-800">课程审批</h1>
        <button onClick={loadCourses} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200" title="刷新">
          <RefreshCw className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Tab切换 */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('pending')} className={`px-3 py-1.5 rounded-full text-xs ${tab === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-white text-slate-500 border border-slate-200'}`}>
          待审批 {pendingCourses.length > 0 && `(${pendingCourses.length})`}
        </button>
        <button onClick={() => setTab('approved')} className={`px-3 py-1.5 rounded-full text-xs ${tab === 'approved' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-white text-slate-500 border border-slate-200'}`}>
          已通过
        </button>
        <button onClick={() => setTab('rejected')} className={`px-3 py-1.5 rounded-full text-xs ${tab === 'rejected' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-white text-slate-500 border border-slate-200'}`}>
          已驳回
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">加载中...</div>
      ) : (
        <div className="space-y-3">
          {displayCourses.map(c => (
            <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-slate-800">{c.name || c.title || '未命名课程'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    {(c.hours || c.duration) && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.hours || c.duration}课时</span>}
                    {(c.currentStudents !== undefined) && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.currentStudents}人</span>}
                    {(c.instructorName || c.instructor_name) && <span>讲师：{c.instructorName || c.instructor_name}</span>}
                  </div>
                  {c.certificateOptions?.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {c.certificateOptions.map((cert: string) => (
                        <span key={cert} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">{cert}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-amber-600">¥{c.price || 0}</span>
              </div>

              {/* 审批按钮 - 仅待审批状态显示 */}
              {isPending(c) && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleApproval(c.id, true)}
                    disabled={submitting === c.id}
                    className="flex-1 py-2 bg-green-500 text-white text-xs rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {submitting === c.id ? '处理中...' : '通过'}
                  </button>
                  <button
                    onClick={() => handleApproval(c.id, false)}
                    disabled={submitting === c.id}
                    className="flex-1 py-2 bg-red-500 text-white text-xs rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {submitting === c.id ? '处理中...' : '驳回'}
                  </button>
                </div>
              )}
            </div>
          ))}
          {displayCourses.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">
              {tab === 'pending' ? '暂无待审批课程' : tab === 'approved' ? '暂无已通过课程' : '暂无已驳回课程'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Phone, RefreshCw, X, Star } from 'lucide-react';

interface Enrollment {
  id: string;
  course_id: string;
  worker_id: string;
  status: string;
  score: number | null;
  course?: { id: string; name: string; type: string };
  worker?: { id: string; name: string; phone: string; age?: number };
  student_name?: string;
  created_at?: string;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

const STATUS_LABELS: Record<string, string> = {
  enrolled: '在读',
  qualified: '已合格',
  dropped: '退训',
  completed: '已结业',
};

const STATUS_COLORS: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700',
  qualified: 'bg-green-100 text-green-700',
  dropped: 'bg-red-100 text-red-700',
  completed: 'bg-purple-100 text-purple-700',
};

export default function InstructorStudentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  // 点评
  const [reviewTarget, setReviewTarget] = useState<Enrollment | null>(null);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/enrollments?with_workers=true&with_courses=true', {
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      setEnrollments(Array.isArray(result.data) ? result.data : []);
    } catch {
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEnrollments(); }, []);

  const handleConvert = async (enrollmentId: string) => {
    setSubmitting(enrollmentId);
    try {
      const res = await fetch(`/api/students/${enrollmentId}/convert-to-worker`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || '学员已成功转为简历');
        loadEnrollments();
      } else {
        alert('转换失败：' + (data.error || '请重试'));
      }
    } catch {
      alert('网络错误，请重试');
    } finally {
      setSubmitting(null);
    }
  };

  const handleReviewOpen = (enrollment: Enrollment) => {
    setReviewTarget(enrollment);
    setReviewContent('');
    setReviewRating(5);
  };

  const handleReviewSubmit = async () => {
    if (!reviewTarget || !reviewContent.trim()) { alert('请填写评价内容'); return; }
    setSubmitting('review');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          target_user_id: reviewTarget.worker_id,
          rating: reviewRating,
          content: reviewContent,
          reviewer_role: 'instructor',
          target_role: 'worker',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('点评提交成功！');
        setReviewTarget(null);
      } else {
        alert('点评失败：' + (data.error || '请重试'));
      }
    } catch { alert('点评失败，请重试'); }
    finally { setSubmitting(null); }
  };

  if (loading) {
    return <div className="p-4 text-center text-sm text-slate-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">学员管理</h2>
        <button onClick={loadEnrollments} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200" title="刷新">
          <RefreshCw className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      {enrollments.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-8">暂无学员数据</p>
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-lg font-bold text-purple-700 shrink-0">
                  {(e.student_name || e.worker?.name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{e.student_name || e.worker?.name || '未知学员'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[e.status] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABELS[e.status] || e.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {e.course?.name && (
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {e.course.name}</span>
                    )}
                    {e.worker?.phone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {e.worker.phone}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleReviewOpen(e)}
                      className="h-7 text-xs px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50"
                    >
                      培训点评
                    </button>
                    {(e.status === 'enrolled' || e.status === 'qualified') && (
                      <button
                        onClick={() => handleConvert(e.id)}
                        disabled={submitting === e.id}
                        className="h-7 text-xs px-3 rounded-md bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {submitting === e.id ? '转换中...' : '合格转简历'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 点评弹窗 */}
      {reviewTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setReviewTarget(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">培训点评 - {reviewTarget.worker?.name || reviewTarget.student_name || '学员'}</h3>
              <X className="h-5 w-5 text-slate-400 cursor-pointer" onClick={() => setReviewTarget(null)} />
            </div>
            <div className="space-y-3">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={`h-8 w-8 cursor-pointer ${n <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} onClick={() => setReviewRating(n)} />
                ))}
              </div>
              <textarea value={reviewContent} onChange={e => setReviewContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-24" placeholder="请输入培训点评内容..." />
              <button onClick={handleReviewSubmit} disabled={submitting === 'review' || !reviewContent.trim()} className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-50">
                {submitting === 'review' ? '提交中...' : '提交点评'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

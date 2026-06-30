'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Phone, RefreshCw, UserCheck } from 'lucide-react';

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

const STATUS_MAP: Record<string, string> = {
  enrolled: '在读',
  qualified: '已合格',
  dropped: '退训',
  completed: '已结业',
};

const STATUS_COLOR: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700',
  qualified: 'bg-green-100 text-green-700',
  dropped: 'bg-red-100 text-red-700',
  completed: 'bg-purple-100 text-purple-700',
};

export default function TrainingSupervisorStudentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState<string | null>(null);

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

  const filtered = enrollments.filter((e) => {
    const name = e.student_name || e.worker?.name || '';
    if (search && !name.includes(search)) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-base font-semibold">学员管理</h1>
        <button onClick={loadEnrollments} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200" title="刷新">
          <RefreshCw className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索姓名"
        className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
      />
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {['all', 'enrolled', 'qualified', 'completed', 'dropped'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {s === 'all' ? '全部' : STATUS_MAP[s] || s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center text-sm text-slate-400 py-8">加载中...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {e.student_name || e.worker?.name || '未知学员'}
                    {e.worker?.phone && (
                      <span className="text-xs text-slate-400 ml-2">
                        <Phone className="h-3 w-3 inline" /> {e.worker.phone}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {e.course?.name && (
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {e.course.name}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[e.status] || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_MAP[e.status] || e.status}
                  </span>
                  {(e.status === 'enrolled' || e.status === 'qualified') && (
                    <button
                      onClick={() => handleConvert(e.id)}
                      disabled={submitting === e.id}
                      className="px-2.5 py-1.5 bg-green-600 text-white text-xs rounded-lg flex items-center gap-1 disabled:opacity-50 hover:bg-green-700"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      {submitting === e.id ? '转换中...' : '转简历'}
                    </button>
                  )}
                  {e.worker?.phone && (
                    <a href={`tel:${e.worker.phone}`} className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                      <Phone className="h-3.5 w-3.5 text-white" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">暂无学员</p>
          )}
        </div>
      )}
    </div>
  );
}

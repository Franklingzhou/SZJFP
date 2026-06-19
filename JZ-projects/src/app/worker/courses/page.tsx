'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Course { id: string; name: string; description?: string; instructor_name?: string; start_date?: string; end_date?: string; status: string; course_type?: string; }

export default function WorkerCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tab, setTab] = useState<'enrolled' | 'available'>('enrolled');
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => { loadCourses(); }, [tab]);

  const loadCourses = async () => {
    try {
      const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
      if (tab === 'enrolled') {
        const res = await fetch(`/api/enrollments?student_id=${userId}&with_courses=true`, { headers: getAuthHeaders(false) });
        const data = await res.json();
        if (data.success) {
          const enrollments = data.data || [];
          // 已报名tab：enrollments JOIN courses 一次返回完整数据
          const coursesWithDetails = enrollments
            .filter((e: Record<string, unknown>) => e.courses)
            .map((e: Record<string, unknown>) => {
              const c = e.courses as Record<string, unknown>;
              return {
                id: c.id,
                name: c.name,
                instructor_name: c.instructor_id,
                description: c.description,
                status: c.status,
                course_type: c.course_type,
                enrollment_status: e.status,
              };
            });
          setCourses(coursesWithDetails);
        }
      } else {
        const res = await fetch('/api/courses?status=published', { headers: getAuthHeaders(false) });
        const data = await res.json();
        if (data.success) setCourses(data.data || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleEnroll = async (courseId: string) => {
    const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
    if (!userId) return alert('请先登录');
    setEnrolling(courseId);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_id: userId, course_id: courseId, status: 'enrolled' }),
      });
      const data = await res.json();
      if (data.success || data.data) {
        alert('报名成功！');
        loadCourses();
      } else {
        alert(data.error || '报名失败');
      }
    } catch (e) {
      console.error(e);
      alert('报名失败');
    }
    setEnrolling(null);
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'text-slate-500 bg-slate-100' },
    published: { label: '报名中', color: 'text-blue-600 bg-blue-50' },
    ongoing: { label: '进行中', color: 'text-green-600 bg-green-50' },
    completed: { label: '已结课', color: 'text-slate-500 bg-slate-100' },
    archived: { label: '已归档', color: 'text-slate-400 bg-slate-50' },
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6">我的课程</h1>

      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {(['enrolled', 'available'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm rounded-md transition-colors',
              tab === t ? 'bg-white text-[#1e3a5f] font-medium shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}>{t === 'enrolled' ? '已报名' : '可报名'}</button>
        ))}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{tab === 'enrolled' ? '暂无已报名课程' : '暂无可报名课程'}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => {
            const s = statusMap[course.status] || statusMap.draft;
            return (
              <div key={course.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-sm">{course.name}</h3>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs', s.color)}>{s.label}</span>
                </div>
                {course.instructor_name && <div className="text-xs text-slate-500 mb-1">讲师: {course.instructor_name}</div>}
                {course.description && <p className="text-xs text-slate-400 line-clamp-2">{course.description}</p>}
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                  <BookOpen className="w-3 h-3" />
                  {course.course_type === 'package' ? '套餐课程' : '单科课程'}
                </div>
                {tab === 'available' && (
                  <button
                    onClick={() => handleEnroll(course.id)}
                    disabled={enrolling === course.id}
                    className="mt-3 w-full py-1.5 text-sm rounded-lg bg-[#1e3a5f] text-white hover:bg-[#2d4f7a] disabled:opacity-50 transition-colors"
                  >
                    {enrolling === course.id ? '报名中...' : '立即报名'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

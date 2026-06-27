'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, CheckCircle, Clock } from 'lucide-react';

export default function WorkerTrainingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCourses(); }, []);

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
    if (token) headers['x-session'] = token;
    return headers;
  }

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch('/api/courses', { headers: getAuthHeaders() });
      const result = await res.json();
      setCourses(result.data || result.courses || []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(courseId: string) {
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ course_id: courseId }),
      });
      const result = await res.json();
      if (result.success || result.ok) {
        alert('报名成功！');
        loadCourses();
      } else {
        alert(result.error || '报名失败');
      }
    } catch {
      alert('网络错误');
    }
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">想培训</h1>

      {loading ? (
        <div className="text-center py-10 text-slate-400">加载中...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-10">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">暂无可报名课程</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => (
            <div key={course.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800 text-sm">{course.title || course.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{course.description || ''}</p>
                  {course.start_date && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {new Date(course.start_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleEnroll(course.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs rounded-full hover:bg-amber-600"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> 报名
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

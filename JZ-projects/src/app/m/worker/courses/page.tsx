'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, Clock, Award, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// enrollments 表 status 枚举
const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  enrolled: '已报名',
  in_training: '培训中',
  completed: '已结业',
  passed: '已通过',
  failed: '未通过',
  dropped: '已退课',
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-800',
  in_training: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  passed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  dropped: 'bg-slate-100 text-slate-500',
};

interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  score: number | null;
  grade_comment: string | null;
  graded_at: string | null;
  courses?: {
    id: string;
    name: string;
    instructor_id: string;
    type: string;
    price: number;
    description: string;
    location: string;
    status: string;
    course_type: string;
  };
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '进行中' },
  { key: 'finished', label: '已完成' },
] as const;

const ACTIVE_STATUSES = ['enrolled', 'in_training'];
const FINISHED_STATUSES = ['completed', 'passed', 'failed', 'dropped'];

export default function WorkerCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const userId = localStorage.getItem('miniapp_user_id');
      if (!userId) {
        setEnrollments([]);
        return;
      }
      const res = await fetch(`/api/enrollments?student_id=${userId}&with_courses=true`, {
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (result.data) {
        setEnrollments(result.data);
      } else {
        setEnrollments([]);
      }
    } catch (err) {
      console.error('加载课程失败:', err);
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = enrollments.filter((e) => {
    if (activeTab === 'active') return ACTIVE_STATUSES.includes(e.status);
    if (activeTab === 'finished') return FINISHED_STATUSES.includes(e.status);
    return true;
  });

  const selected = enrollments.find((e) => e.id === selectedId);

  if (loading) {
    return <div className="p-6 text-center text-sm text-slate-400">加载中...</div>;
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">我的课程</h1>

      {/* Tab 筛选 */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((tab) => {
          const count =
            tab.key === 'all'
              ? enrollments.length
              : tab.key === 'active'
                ? enrollments.filter((e) => ACTIVE_STATUSES.includes(e.status)).length
                : enrollments.filter((e) => FINISHED_STATUSES.includes(e.status)).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            {activeTab === 'all' ? '暂无课程记录' : activeTab === 'active' ? '暂无进行中的课程' : '暂无已完成的课程'}
          </p>
          <p className="text-xs text-slate-300 mt-1">报名课程后将在这里显示</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedId(e.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-slate-800 text-sm">
                    {e.courses?.name || '未命名课程'}
                  </p>
                  <Badge
                    className={`text-xs mt-1 ${ENROLLMENT_STATUS_COLORS[e.status] || 'bg-slate-100 text-slate-700'}`}
                  >
                    {ENROLLMENT_STATUS_LABELS[e.status] || e.status}
                  </Badge>
                </div>
                {e.score != null && (
                  <div className="flex items-center gap-1 text-amber-500">
                    <Award className="h-4 w-4" />
                    <span className="text-sm font-semibold">{e.score}分</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-400 space-y-1">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  报名日期：{new Date(e.enrolled_at).toLocaleDateString()}
                </div>
                {e.completed_at && (
                  <div>结业日期：{new Date(e.completed_at).toLocaleDateString()}</div>
                )}
                {e.grade_comment && (
                  <div className="text-slate-500 mt-1 line-clamp-1">
                    <span className="text-slate-400">评语：</span>
                    {e.grade_comment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>课程详情</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-xs">课程名称</span>
                  <p className="font-medium">{selected.courses?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">课程状态</span>
                  <p>
                    <Badge
                      className={`text-xs ${ENROLLMENT_STATUS_COLORS[selected.status] || 'bg-slate-100 text-slate-700'}`}
                    >
                      {ENROLLMENT_STATUS_LABELS[selected.status] || selected.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">课程类型</span>
                  <p className="font-medium">{selected.courses?.course_type || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">上课地点</span>
                  <p className="font-medium">{selected.courses?.location || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">报名日期</span>
                  <p>{new Date(selected.enrolled_at).toLocaleDateString()}</p>
                </div>
                {selected.completed_at && (
                  <div>
                    <span className="text-slate-400 text-xs">结业日期</span>
                    <p>{new Date(selected.completed_at).toLocaleDateString()}</p>
                  </div>
                )}
                {selected.score != null && (
                  <div>
                    <span className="text-slate-400 text-xs">考核成绩</span>
                    <p className="font-semibold text-amber-600">{selected.score}分</p>
                  </div>
                )}
                {selected.graded_at && (
                  <div>
                    <span className="text-slate-400 text-xs">评分日期</span>
                    <p>{new Date(selected.graded_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {selected.grade_comment && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-amber-600 font-medium">讲师评语</span>
                      <p className="text-sm text-slate-700 mt-1">{selected.grade_comment}</p>
                    </div>
                  </div>
                </div>
              )}
              {selected.courses?.description && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <span className="text-xs text-slate-400">课程简介</span>
                  <p className="text-sm text-slate-600 mt-1">{selected.courses.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

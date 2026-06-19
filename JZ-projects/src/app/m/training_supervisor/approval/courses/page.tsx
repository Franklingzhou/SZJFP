'use client';

import React, { useState } from 'react';
import { mockCourses } from '@/lib/data-service';
import type { TrainingCourse } from '@/lib/types';
import { Clock, Users, CheckCircle, XCircle, FileText } from 'lucide-react';
import { updateRecord } from '@/lib/data-service';

export default function TrainingSupervisorCourseApprovalPage() {
  const [courses, setCourses] = useState<TrainingCourse[]>([...mockCourses]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const pendingCourses = courses.filter(c => c.status === 'pending_approval');
  const approvedCourses = courses.filter(c => c.status === 'upcoming' || c.status === 'ongoing' || c.status === 'completed');
  const rejectedCourses = courses.filter(c => c.status === 'rejected');

  const displayCourses = tab === 'pending' ? pendingCourses : tab === 'approved' ? approvedCourses : rejectedCourses;

  const handleApproval = async (courseId: string, approved: boolean) => {
    const newStatus = approved ? 'upcoming' : 'rejected';
    await updateRecord('courses', { id: courseId, status: newStatus });
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, status: newStatus } : c));
    const target = mockCourses.find(c => c.id === courseId);
    if (target) target.status = newStatus;
    alert(approved ? '课程已通过审批' : '课程已驳回');
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_approval: '待审批',
      upcoming: '已通过',
      ongoing: '进行中',
      completed: '已结束',
      rejected: '已驳回',
    };
    return map[status] || status;
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pending_approval: 'bg-amber-50 text-amber-700',
      upcoming: 'bg-blue-50 text-blue-700',
      ongoing: 'bg-green-50 text-green-700',
      completed: 'bg-slate-50 text-slate-600',
      rejected: 'bg-red-50 text-red-700',
    };
    return map[status] || 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-3">课程审批</h1>

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

      {/* 课程列表 */}
      <div className="space-y-3">
        {displayCourses.map(c => (
          <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-slate-800">{c.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {c.hours || 0}课时</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.currentStudents}人</span>
                  <span>讲师：{c.instructorName || '待定'}</span>
                </div>
                {c.certificateOptions.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {c.certificateOptions.map((cert: string) => (
                      <span key={cert} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">{cert}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-amber-600">¥{c.price}</span>
            </div>

            {/* 审批按钮 - 仅待审批状态显示 */}
            {c.status === 'pending_approval' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleApproval(c.id, true)}
                  className="flex-1 py-2 bg-green-500 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> 通过
                </button>
                <button
                  onClick={() => handleApproval(c.id, false)}
                  className="flex-1 py-2 bg-red-500 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" /> 驳回
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
    </div>
  );
}

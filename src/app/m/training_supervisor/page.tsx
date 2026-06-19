'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { mockRecruiterLeads, mockAgents, mockCourses, mockWorkers } from '@/lib/data-service';
import { RecruiterLead } from '@/lib/data-service';
import { Users, BookOpen, FileText, ChevronRight, ClipboardCheck, Briefcase } from 'lucide-react';

const STATUS_MAP: Record<string, string> = {
  new: '新线索', contacted: '跟进中', training: '培训中', qualified: '已合格', converted: '已转化', lost: '已流失'
};

export default function TrainingSupervisorHomePage() {
  const [leads] = useState<RecruiterLead[]>(mockRecruiterLeads);
  const [search, setSearch] = useState('');

  const totalLeads = leads.length;
  const followingLeads = leads.filter(l => l.status === 'contacted').length;
  const convertedLeads = leads.filter(l => l.status === 'converted').length;
  const lostLeads = leads.filter(l => l.status === 'lost').length;
  const totalStudents = mockWorkers.length;
  const totalCourses = mockCourses.length;
  const recruiters = mockAgents.filter(a => a.role === 'recruiter');

  // 待审批课程
  const pendingCourses = mockCourses.filter(c => c.status === 'pending_approval');
  // 待审批合同
  const pendingContracts = 2; // mock

  const filteredLeads = leads.filter(l => {
    if (search && !l.name.includes(search)) return false;
    return true;
  }).slice(0, 5);

  return (
    <div className="p-4 pb-20">
      <h1 className="text-base font-semibold mb-3">培训主管工作台</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-indigo-600">{totalLeads}</p>
          <p className="text-xs text-slate-500">总线索</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-green-600">{convertedLeads}</p>
          <p className="text-xs text-slate-500">已转化</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{totalCourses}</p>
          <p className="text-xs text-slate-500">课程数</p>
        </div>
      </div>

      {/* 审批入口 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/m/training_supervisor/approval/courses" className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 active:bg-slate-50">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center relative">
            <BookOpen className="h-6 w-6 text-amber-600" />
            {pendingCourses.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{pendingCourses.length}</span>
            )}
          </div>
          <span className="text-sm font-medium text-slate-700">课程审批</span>
          <span className="text-xs text-slate-400">{pendingCourses.length}个待审批</span>
        </Link>
        <Link href="/m/training_supervisor/approval/contracts" className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 active:bg-slate-50">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center relative">
            <FileText className="h-6 w-6 text-indigo-600" />
            {pendingContracts > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{pendingContracts}</span>
            )}
          </div>
          <span className="text-sm font-medium text-slate-700">合同审批</span>
          <span className="text-xs text-slate-400">{pendingContracts}个待审批</span>
        </Link>
      </div>

      {/* 招生情况 */}
      <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">招生概况</p>
          <Link href="/m/training_supervisor/leads" className="text-xs text-indigo-500 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><p className="text-sm font-semibold text-blue-600">{followingLeads}</p><p className="text-xs text-slate-400">跟进中</p></div>
          <div><p className="text-sm font-semibold text-amber-600">{leads.filter(l=>l.status==='qualified').length}</p><p className="text-xs text-slate-400">已合格</p></div>
          <div><p className="text-sm font-semibold text-green-600">{convertedLeads}</p><p className="text-xs text-slate-400">已转化</p></div>
          <div><p className="text-sm font-semibold text-red-600">{lostLeads}</p><p className="text-xs text-slate-400">已流失</p></div>
        </div>
      </div>

      {/* 最新线索 */}
      <div className="bg-white rounded-lg p-3 shadow-sm">
        <p className="text-sm font-medium mb-2">最新线索</p>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名" className="w-full border rounded px-2 py-1.5 text-xs mb-2" />
        {filteredLeads.map(l => (
          <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div>
              <p className="text-sm">{l.name} <span className="text-xs text-slate-400">{l.age || ''}岁</span></p>
              <p className="text-xs text-slate-400">{l.source} | {l.recruiterName}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              l.status === 'new' ? 'bg-blue-100 text-blue-700' :
              l.status === 'contacted' ? 'bg-amber-100 text-amber-700' :
              l.status === 'converted' ? 'bg-green-100 text-green-700' :
              l.status === 'lost' ? 'bg-red-100 text-red-700' :
              'bg-slate-100 text-slate-700'
            }`}>{STATUS_MAP[l.status] || l.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

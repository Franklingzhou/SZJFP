'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers, mockReferrals, mockCourses, mockRecruiterLeads } from '@/lib/data-service';
import { ChevronRight, BookOpen, Briefcase, Users, Clock } from 'lucide-react';

export default function InstructorHomePage() {
  const router = useRouter();
  const { user } = useMiniApp();

  // 使用共享数据
  const employedWorkers = mockWorkers.filter(w => w.status === 'working');
  const myReferrals = mockReferrals.filter(r => r.referrerId === user?.id);
  const totalCommission = myReferrals.reduce((s, r) => s + r.commissionAmount, 0);

  // 共享课程数据（排除待审批）
  const myCourses = mockCourses.filter(c => c.status !== 'pending_approval' && c.instructorId === user?.id);
  // 如果没有匹配到讲师ID，显示所有非待审批课程
  const displayCourses = myCourses.length > 0 ? myCourses : mockCourses.filter(c => c.status !== 'pending_approval');

  // 共享学员数据 = 线索中正在培训/已合格/已转化的
  const studentLeads = mockRecruiterLeads.filter(l =>
    ['training', 'qualified', 'converted'].includes(l.status)
  );

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 头部概览 */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-4 text-white mb-4">
        <p className="text-sm opacity-90">讲师 · {user?.name}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <p className="text-xl font-bold">{displayCourses.length}</p>
            <p className="text-xs opacity-80">课程</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{studentLeads.length}</p>
            <p className="text-xs opacity-80">学员</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">¥{totalCommission}</p>
            <p className="text-xs opacity-80">推荐佣金</p>
          </div>
        </div>
      </div>

      {/* 合单大厅 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">合单大厅</h2>
          <button onClick={() => router.push('/m/instructor/hall')} className="text-xs text-amber-600 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div
          onClick={() => router.push('/m/instructor/hall')}
          className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 active:bg-amber-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">推荐阿姨，签约自动佣金</p>
              <p className="text-xs text-slate-500 mt-0.5">为合单订单推荐阿姨，获得10%佣金</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        </div>
      </div>

      {/* 我的课程 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">我的课程</h2>
          <button onClick={() => router.push('/m/instructor/follow')} className="text-xs text-amber-600 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {displayCourses.slice(0, 3).map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer active:bg-slate-50"
              onClick={() => router.push(`/m/instructor/follow?courseId=${c.id}`)}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{c.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    c.status === 'ongoing' ? 'bg-blue-50 text-blue-700' :
                    c.status === 'upcoming' ? 'bg-amber-50 text-amber-700' :
                    'bg-green-50 text-green-700'
                  }`}>{c.status === 'ongoing' ? '进行中' : c.status === 'upcoming' ? '待开课' : '已结束'}</span>
                </div>
                <p className="text-xs text-slate-500">
                  <span className="inline-flex items-center gap-0.5"><Users className="h-3 w-3" />{c.currentStudents}/{c.maxStudents}</span>
                  <span className="mx-1">·</span>
                  <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{c.hours}课时</span>
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          ))}
        </div>
      </div>

      {/* 学员动态 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">学员动态</h2>
          <button onClick={() => router.push('/m/instructor/workers')} className="text-xs text-amber-600 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {studentLeads.slice(0, 3).map(s => (
            <div
              key={s.id}
              className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer active:bg-slate-50"
              onClick={() => router.push('/m/instructor/workers')}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                {s.name[0]}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{s.name}</p>
                <p className="text-xs text-slate-500">{s.intention || '未选择'} · 来源：{s.recruiterName}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                s.status === 'training' ? 'bg-blue-50 text-blue-700' :
                s.status === 'qualified' ? 'bg-green-50 text-green-700' :
                'bg-emerald-50 text-emerald-700'
              }`}>{s.status === 'training' ? '学习中' : s.status === 'qualified' ? '已合格' : '已转化'}</span>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          ))}
        </div>
      </div>

      {/* 推荐佣金 */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">推荐佣金</h2>
        {myReferrals.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl p-4 text-center">暂无推荐记录</p>
        ) : (
          <div className="space-y-2">
            {myReferrals.slice(0, 3).map(r => (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{r.orderTitle}</p>
                  <p className="text-xs text-slate-400">推荐：{r.workerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">¥{r.commissionAmount}</p>
                  <span className={`text-xs ${r.status === 'settled' ? 'text-green-600' : 'text-slate-400'}`}>
                    {r.status === 'settled' ? '已结算' : '待结算'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

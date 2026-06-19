'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, ChevronRight } from 'lucide-react';
import { useMiniApp } from '@/components/miniapp/context';
import { mockRecruiterLeads, mockCourses, mockOrders } from '@/lib/data-service';

export default function TrainingSupervisorProfilePage() {
  const router = useRouter();
  const { user, logout } = useMiniApp();

  const totalLeads = mockRecruiterLeads.length;
  const pendingCourses = mockCourses.filter((c: { status: string }) => c.status === 'pending_approval').length;
  const pendingContracts = mockOrders.filter((o: { status: string }) => o.status === 'pending').length;

  // 诚信分
  const [creditScore, setCreditScore] = useState(1000);
  useEffect(() => {
    if (user?.id) {
      fetch('/api/users?role=training_supervisor').then(r => r.json()).then(data => {
        const me = data?.data?.find((u: { id: string }) => u.id === user.id);
        if (me?.credit_score) setCreditScore(me.credit_score);
      }).catch(() => {});
    }
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    router.push('/m/login');
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-base font-semibold mb-4">我的</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-semibold">
            {user?.name?.[0] || '主'}
          </div>
          <div>
            <p className="text-lg font-semibold">{user?.name || '培训主管'}</p>
            <p className="text-sm text-slate-500">培训主管</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-indigo-600">{pendingCourses}</p>
            <p className="text-xs text-slate-400">待审课程</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-600">{pendingContracts}</p>
            <p className="text-xs text-slate-400">待审合同</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">{creditScore}</p>
            <p className="text-xs text-slate-400">诚信分</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm divide-y">
        <button onClick={() => router.push('/m/training_supervisor/approval/courses')} className="flex items-center gap-3 p-3 w-full text-left active:bg-slate-50">
          <span className="text-sm">课程审批与管理</span>
          <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
        </button>
        <button onClick={() => router.push('/m/training_supervisor/approval/contracts')} className="flex items-center gap-3 p-3 w-full text-left active:bg-slate-50">
          <span className="text-sm">合同审批</span>
          <ChevronRight className="h-4 w-4 text-slate-300 ml-auto" />
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full mt-6 py-3 bg-red-50 text-red-500 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
      >
        <LogOut className="h-4 w-4" /> 退出登录
      </button>
    </div>
  );
}

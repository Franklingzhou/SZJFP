'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockOrders, mockWorkers, mockRecruiterLeads, mockReviews } from '@/lib/data-service';
import { LogOut, Phone, Users, Briefcase, ClipboardList, Star, MessageSquare } from 'lucide-react';

export default function WorkerOpsProfilePage() {
  const router = useRouter();
  const { user, logout } = useMiniApp();

  const totalWorkers = mockWorkers.length;
  const totalLeads = mockRecruiterLeads.length;
  const myOrders = mockOrders.filter(o => o.status === 'interviewing' || o.status === 'signed');
  const freeWorkers = mockWorkers.filter(w => w.status === 'idle');

  // 诚信分
  const [creditScore, setCreditScore] = useState(1000);
  useEffect(() => {
    if (user?.id) {
      fetch('/api/users?role=worker_operator').then(r => r.json()).then(data => {
        const me = data?.data?.find((u: { id: string }) => u.id === user.id);
        if (me?.credit_score) setCreditScore(me.credit_score);
      }).catch(() => {});
    }
  }, [user?.id]);

  // 获取评价数据 - 阿姨/经纪人/招生/讲师来源的评价
  const reviewsFromWorker = mockReviews.filter(r => r.sourceRole === 'worker');
  const reviewsFromAgent = mockReviews.filter(r => r.sourceRole === 'agent');
  const reviewsFromRecruiter = mockReviews.filter(r => r.sourceRole === 'recruiter');
  const reviewsFromInstructor = mockReviews.filter(r => r.sourceRole === 'instructor');

  const handleLogout = () => {
    logout();
    router.push('/m/login');
  };

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 头部信息 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-xl font-semibold">
            {user?.name?.[0] || '运'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{user?.name || '阿姨运营'}</h2>
            <p className="text-sm text-slate-500">阿姨运营专员</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-rose-600">{totalWorkers}</p>
            <p className="text-xs text-slate-400">阿姨总数</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-600">{myOrders.length}</p>
            <p className="text-xs text-slate-400">进行中订单</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">{creditScore}</p>
            <p className="text-xs text-slate-400">诚信分</p>
          </div>
        </div>
      </div>

      {/* 功能列表 */}
      <div className="bg-white rounded-xl shadow-sm divide-y mb-4">
        <div className="flex items-center gap-3 p-3">
          <Users className="h-4 w-4 text-rose-400" />
          <span className="text-sm flex-1">阿姨管理</span>
          <span className="text-xs text-slate-400">{totalWorkers}位阿姨 · {freeWorkers.length}位空闲</span>
        </div>
        <div className="flex items-center gap-3 p-3">
          <Briefcase className="h-4 w-4 text-amber-400" />
          <span className="text-sm flex-1">合单大厅</span>
          <span className="text-xs text-slate-400">{myOrders.length}个进行中</span>
        </div>
        <div className="flex items-center gap-3 p-3">
          <ClipboardList className="h-4 w-4 text-blue-400" />
          <span className="text-sm flex-1">线索录入</span>
          <span className="text-xs text-slate-400">{totalLeads}条线索</span>
        </div>
        <div className="flex items-center gap-3 p-3">
          <Phone className="h-4 w-4 text-slate-400" />
          <span className="text-sm">{user?.phone || '-'}</span>
        </div>
      </div>

      {/* 评价模块 */}
      <div className="bg-white rounded-xl shadow-sm mb-4">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <MessageSquare className="h-4 w-4 text-amber-500" /> 评价
          </h3>
        </div>

        {/* 评价统计 */}
        <div className="p-3">
          <p className="text-sm text-slate-600">共 {mockReviews.length} 条评价，平均评分 {mockReviews.length > 0 ? (mockReviews.reduce((a: number, r: { rating: number }) => a + r.rating, 0) / mockReviews.length).toFixed(1) : '0'}</p>
        </div>

        {/* 评价列表 */}
        <div className="divide-y">
          {mockReviews.slice(0, 5).map((review: { id: string; rating: number; content: string; reviewer_role?: string; created_at?: string }) => {
            const roleColors: Record<string, string> = {
              worker: 'bg-rose-100 text-rose-600',
              agent: 'bg-blue-100 text-blue-600',
              recruiter: 'bg-amber-100 text-amber-600',
              instructor: 'bg-green-100 text-green-600',
              customer: 'bg-purple-100 text-purple-600',
            };
            const roleLabels: Record<string, string> = {
              worker: '阿姨',
              agent: '经纪人',
              recruiter: '招生',
              instructor: '讲师',
              customer: '客户',
            };
            const rRole = review.reviewer_role || 'customer';
            return (
              <div key={review.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[rRole] || 'bg-slate-100 text-slate-600'}`}>
                    {roleLabels[rRole] || rRole}
                  </span>
                  <div className="flex items-center ml-auto">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500">{review.content}</p>
                <p className="text-xs text-slate-300 mt-1">{review.created_at || ''}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl text-sm text-red-500 bg-red-50 flex items-center justify-center gap-2"
      >
        <LogOut className="h-4 w-4" /> 退出登录
      </button>
    </div>
  );
}

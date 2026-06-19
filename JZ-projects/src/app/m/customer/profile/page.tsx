'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockOrders, mockReviews } from '@/lib/data-service';
import { LogOut, Briefcase, Shield, Star } from 'lucide-react';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, logout } = useMiniApp();

  // 统计
  const myOrders = mockOrders.filter(o => o.customerId === user?.id);
  const myReviews = mockReviews.filter(r => r.sourceRole === 'customer' && r.targetId === user?.id);

  // 诚信分
  const [creditScore, setCreditScore] = useState(1000);
  useEffect(() => {
    if (user?.id) {
      fetch('/api/users?role=customer').then(r => r.json()).then(data => {
        const me = data?.data?.find((u: { id: string }) => u.id === user.id);
        if (me?.credit_score) setCreditScore(me.credit_score);
      }).catch(() => {});
    }
  }, [user?.id]);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="bg-white rounded-xl p-5 text-center">
        <div className="h-20 w-20 rounded-full bg-pink-100 flex items-center justify-center text-3xl font-bold text-pink-700 mx-auto">
          {user?.name?.[0] || '客'}
        </div>
        <h2 className="text-xl font-bold mt-3">{user?.name || '客户'}</h2>
        <p className="text-sm text-slate-400">优质家政服务，安心之选</p>
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="text-center">
            <div className="text-xl font-bold text-amber-600">{myOrders.length}</div>
            <div className="text-xs text-slate-400">订单数</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-xl font-bold">{creditScore}</div>
            <div className="text-xs text-slate-400">诚信分</div>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{myReviews.length}</div>
            <div className="text-xs text-slate-400">已评价</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <button onClick={() => router.push('/m/customer/orders')} className="flex items-center justify-between w-full px-4 py-3.5 border-b last:border-0 active:bg-slate-50">
          <div className="flex items-center gap-3"><Briefcase className="h-5 w-5 text-slate-400" /><span className="text-sm">我的订单</span></div>
          <div className="flex items-center gap-1"><span className="text-sm text-slate-400">{myOrders.length}单</span><span className="text-slate-300">›</span></div>
        </button>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3"><Shield className="h-5 w-5 text-slate-400" /><span className="text-sm">诚信分</span></div>
          <span className="text-sm text-slate-400">{creditScore}分</span>
        </div>
      </div>

      <button
        onClick={() => { logout(); router.push('/m/login'); }}
        className="w-full py-3 rounded-xl text-sm text-red-500 bg-red-50 flex items-center justify-center gap-2"
      >
        <LogOut className="h-4 w-4" /> 退出登录
      </button>
    </div>
  );
}

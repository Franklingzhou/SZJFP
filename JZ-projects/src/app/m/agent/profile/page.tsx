'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockOrders, mockReferrals, mockReviews } from '@/lib/data-service';
import { ROLE_REVIEW_CATEGORIES, REVIEW_SOURCE_LABELS } from '@/lib/types';
import type { ReviewSourceRole } from '@/lib/types';
import { Star, EyeOff, LogOut, ChevronRight, Copy, Users } from 'lucide-react';
import { updateRecord } from '@/lib/data-service';

export default function AgentProfilePage() {
  const router = useRouter();
  const { user, logout } = useMiniApp();

  // 评价数据 - 从API加载的真实评价
  const myReviews = mockReviews.filter(r => r.targetId === user?.id);
  const [hiddenReviews, setHiddenReviews] = useState<Set<string>>(() => {
    const hidden = new Set<string>();
    myReviews.forEach(r => { if (r.hidden) hidden.add(r.id); });
    return hidden;
  });

  // 加载诚信分
  const [creditScore, setCreditScore] = useState(1000);
  useEffect(() => {
    if (user?.id) {
      fetch('/api/users?role=agent').then(r => r.json()).then(data => {
        const me = data?.data?.find((u: { id: string }) => u.id === user.id);
        if (me?.credit_score) setCreditScore(me.credit_score);
      }).catch(() => {});
    }
  }, [user?.id]);

  const toggleHidden = async (id: string) => {
    const newHidden = new Set(hiddenReviews);
    const isHiding = !newHidden.has(id);
    if (isHiding) newHidden.add(id); else newHidden.delete(id);
    setHiddenReviews(newHidden);
    try {
      await updateRecord('reviews', id, { hidden: isHiding });
    } catch { /* 静默失败 */ }
  };

  const myReferrals = mockReferrals.filter(r => r.referrerId === user?.id);
  const totalCommission = myReferrals.reduce((s, r) => s + r.commissionAmount, 0);
  const myOrders = mockOrders.filter(o => o.agentId === user?.id);

  const handleLogout = () => {
    logout();
    router.push('/m/login');
  };

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 头部信息 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xl font-semibold">
            {user?.name?.[0]}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{user?.name}</h2>
            <p className="text-sm text-slate-500">经纪人</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">{myOrders.length}</p>
            <p className="text-xs text-slate-400">总订单</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-600">¥{totalCommission}</p>
            <p className="text-xs text-slate-400">推荐佣金</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">{creditScore}</p>
            <p className="text-xs text-slate-400">诚信分</p>
          </div>
        </div>
      </div>

      {/* 评价分类 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">我的评价</h3>
        {myReviews.length === 0 ? (
          <p className="text-xs text-slate-400">暂无评价</p>
        ) : (
          <div className="space-y-2">
            {myReviews.filter(r => !hiddenReviews.has(r.id)).map(review => (
              <div key={review.id} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {REVIEW_SOURCE_LABELS[review.sourceRole as ReviewSourceRole] || review.reviewerRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <button onClick={() => toggleHidden(review.id)} className="ml-1 text-slate-300 hover:text-slate-500" title="隐藏">
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{review.content}</p>
                <p className="text-xs text-slate-400 mt-1">{review.createdAt}</p>
              </div>
            ))}
          </div>
        )}
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

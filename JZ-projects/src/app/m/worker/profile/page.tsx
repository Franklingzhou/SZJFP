'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers, mockReviews } from '@/lib/data-service';
import { REVIEW_SOURCE_LABELS } from '@/lib/types';
import type { ReviewSourceRole } from '@/lib/types';
import { LogOut, Star, EyeOff } from 'lucide-react';
import { updateRecord } from '@/lib/data-service';

export default function WorkerProfilePage() {
  const router = useRouter();
  const { logout, userId } = useMiniApp();
  const worker = mockWorkers.find(w => w.id === userId) || mockWorkers[0];

  const handleLogout = () => {
    logout();
    router.push('/m/login');
  };

  // 获取阿姨的真实评价
  const myReviews = mockReviews.filter(r => r.targetId === worker.id);
  const [hiddenReviews, setHiddenReviews] = useState<Set<string>>(() => {
    const hidden = new Set<string>();
    myReviews.forEach(r => { if (r.hidden) hidden.add(r.id); });
    return hidden;
  });

  const toggleHidden = async (id: string) => {
    const newHidden = new Set(hiddenReviews);
    const isHiding = !newHidden.has(id);
    if (isHiding) newHidden.add(id); else newHidden.delete(id);
    setHiddenReviews(newHidden);
    await updateRecord('reviews', id, { hidden: isHiding });
  };

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 个人信息头部 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-xl font-semibold">
            {worker.name[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800">{worker.name}</h2>
            <p className="text-sm text-slate-500">{worker.jobTypes.join(' / ')}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            worker.status === 'idle' ? 'bg-green-50 text-green-700' :
            worker.status === 'working' ? 'bg-blue-50 text-blue-700' :
            'bg-slate-50 text-slate-500'
          }`}>
            {worker.status === 'idle' ? '空闲' : worker.status === 'working' ? '在户' : '待定'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold text-amber-600">{worker.creditScore}</p>
            <p className="text-xs text-slate-400">诚信分</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">{worker.points}</p>
            <p className="text-xs text-slate-400">积分</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">¥{worker.deposit}</p>
            <p className="text-xs text-slate-400">保证金</p>
          </div>
        </div>
      </div>

      {/* 评价区 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">我的评价</h3>
        {myReviews.length === 0 ? (
          <p className="text-xs text-slate-400">暂无评价</p>
        ) : (
          <div className="space-y-2">
            {myReviews.filter(r => !hiddenReviews.has(r.id)).map(review => (
              <div key={review.id} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {REVIEW_SOURCE_LABELS[review.sourceRole as ReviewSourceRole] || review.reviewerRole}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <button onClick={() => toggleHidden(review.id)} className="ml-1 text-slate-300 hover:text-slate-500">
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

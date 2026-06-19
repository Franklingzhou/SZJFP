'use client';

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { ROLE_REVIEW_CATEGORIES, REVIEW_SOURCE_LABELS } from '@/lib/types';
import type { ReviewSourceRole } from '@/lib/types';
import { Star, EyeOff } from 'lucide-react';

interface ReviewsProps {
  currentRole: string;
}

export default function ReviewsPage({ currentRole }: ReviewsProps) {
  const { user } = useMiniApp();
  const userId = user?.id || '';
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);

  const categories = ROLE_REVIEW_CATEGORIES[currentRole] || [];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/reviews?target_user_id=${userId}`, { headers });
      const data = await res.json();
      if (data.data) {
        setAllReviews(data.data);
        const hidden = new Set<string>();
        data.data.forEach((r: any) => { if (r.hidden) hidden.add(r.id); });
        setHiddenIds(hidden);
      }
    } catch (e) { console.error('评价加载失败:', e); }
    finally { setLoading(false); }
  };

  const toggleHidden = async (id: string) => {
    const isHidden = hiddenIds.has(id);
    const newHidden = new Set(hiddenIds);
    if (isHidden) newHidden.delete(id); else newHidden.add(id);
    setHiddenIds(newHidden);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/reviews', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, hidden: !isHidden }),
      });
    } catch (e) { console.error('更新失败:', e); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-slate-800">评价中心</h1>
        <button onClick={() => setShowHidden(!showHidden)} className="text-xs text-slate-400 flex items-center gap-1">
          <EyeOff className="h-3.5 w-3.5" />
          {showHidden ? '显示全部' : '含隐藏'}
        </button>
      </div>
      {categories.map(cat => {
        const catReviews = allReviews.filter(r => r.reviewer_role === cat);
        const visibleReviews = showHidden ? catReviews : catReviews.filter(r => !hiddenIds.has(r.id));
        return (
          <div key={cat} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {REVIEW_SOURCE_LABELS[cat as ReviewSourceRole] || cat}
              </span>
              <span className="text-xs text-slate-400">{catReviews.length}条</span>
            </div>
            {visibleReviews.length === 0 ? (
              <p className="text-xs text-slate-400 pl-2">暂无评价</p>
            ) : (
              <div className="space-y-2 pl-2">
                {visibleReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-xl p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {review.reviewer_id?.slice(0,8) || '匿名'}
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
                    <p className="text-xs text-slate-400 mt-1">{review.created_at?.slice(0,10) || ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {allReviews.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">暂无评价</div>
      )}
    </div>
  );
}

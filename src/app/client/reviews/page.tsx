'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Star, MessageSquare, Eye, EyeOff } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

interface Review { id: string; order_id: string; rating: number; content: string; status: string; created_at: string; worker_name?: string; order_title?: string; hidden?: boolean; }

interface Order { id: string; title: string; worker_id?: string; }

export default function ClientReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [createForm, setCreateForm] = useState({ rating: 5, content: '', order_id: '', target_user_id: '' });
  const [orders, setOrders] = useState<Order[]>([]);

  const loadReviews = async () => {
    try {
      const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
      const res = await fetch(`/api/reviews?reviewer_id=${userId}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.data) setReviews(data.data || []);
    } catch (e) { console.error(e); }
  };

  const loadOrders = async () => {
    try {
      const userId = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
      const res = await fetch(`/api/orders?customer_id=${userId}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.data) setOrders((data.data || []).map((o: Record<string, unknown>) => ({ id: o.id as string, title: o.title as string, worker_id: (o.worker_id as string) || '' })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadReviews(); loadOrders(); }, []);

  const handleSubmitReview = async () => {
    if (!createForm.content || !createForm.order_id) return alert('请选择订单并填写评价内容');
    const selectedOrder = orders.find(o => o.id === createForm.order_id);
    if (!selectedOrder?.worker_id) return alert('该订单暂无服务人员，无法评价');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({
          order_id: createForm.order_id,
          rating: createForm.rating,
          content: createForm.content,
          target_user_id: selectedOrder.worker_id,
          target_role: 'worker',
        }),
      });
      const data = await res.json();
      if (data.success || data.data) {
        alert('评价提交成功');
        setCreateForm({ rating: 5, content: '', order_id: '', target_user_id: '' });
        setActiveTab('list');
        loadReviews();
      } else {
        alert(data.error || '提交失败');
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-[#1e3a5f] mb-6">评价管理</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab('list')}
          className={cn('px-4 py-2 rounded-lg text-sm', activeTab === 'list' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-600')}>我的评价</button>
        <button onClick={() => setActiveTab('create')}
          className={cn('px-4 py-2 rounded-lg text-sm', activeTab === 'create' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-600')}>发布评价</button>
      </div>

      {activeTab === 'create' && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">选择订单 *</label>
            <select value={createForm.order_id} onChange={e => setCreateForm(p => ({ ...p, order_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">请选择订单</option>
              {orders.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">评分 *</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setCreateForm(p => ({ ...p, rating: s }))}>
                  <Star className={cn('w-6 h-6', s <= createForm.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">评价内容 *</label>
            <textarea value={createForm.content} onChange={e => setCreateForm(p => ({ ...p, content: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none" placeholder="请输入您的评价..." />
          </div>
          <button onClick={handleSubmitReview}
            className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#1e3a5f]/90">提交评价</button>
        </div>
      )}

      {activeTab === 'list' && (
        reviews.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无评价</div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className="bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn('w-4 h-4', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full',
                      r.status === 'approved' ? 'bg-green-50 text-green-600' :
                      r.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    )}>{r.status === 'approved' ? '已通过' : r.status === 'pending' ? '待审核' : '已拒绝'}</span>
                    {r.hidden && <EyeOff className="w-3.5 h-3.5 text-slate-300" />}
                  </div>
                </div>
                <p className="text-sm text-slate-700 mb-2">{r.content}</p>
                <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function CustomerOrdersPage() {
  const { user } = useMiniApp();
  const userId = user?.id || '';
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingOrder, setReviewingOrder] = useState<string | null>(null);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [signings, setSignings] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/orders', { headers });
      const data = await res.json();
      if (data.data) {
        // 放宽可见范围：signed/in_service/in_progress/completed
        const mine = data.data.filter((o: any) => {
          const rec = o as Record<string,unknown>;
          return rec.customer_id === userId &&
            (o.status === 'signed' || o.status === 'in_service' || o.status === 'in_progress' || o.status === 'completed');
        });
        setMyOrders(mine);
      }
    } catch (e) { console.error('订单加载失败:', e); }
    finally { setLoading(false); }
  };

  const loadSignings = async (orderId: string) => {
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/order-signings?order_id=${orderId}`, { headers });
      const data = await res.json();
      if (data.data) setSignings(data.data);
      else setSignings([]);
    } catch {
      setSignings([]);
    }
  };

  const handleToggleExpand = (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      setSignings([]);
    } else {
      setExpandedOrder(orderId);
      loadSignings(orderId);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewingOrder || !reviewContent.trim()) return;
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: reviewingOrder,
          reviewer_id: userId,
          reviewer_role: 'customer',
          target_user_id: '',  // 后续从订单取worker_id
          rating: reviewRating,
          content: reviewContent,
        }),
      });
      const result = await res.json();
      if (!result.success) alert('评价失败：' + (result.error || '请重试'));
    } catch (e) { console.error('提交评价失败', e); }
    setReviewingOrder(null);
    setReviewContent('');
    setReviewRating(5);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">我的订单</h2>
      <div className="space-y-3">
        {myOrders.map((order) => {
          const jobType = String((order as Record<string,unknown>).job_type || (order as any).jobType || '');
          const workerName = String((order as Record<string,unknown>).worker_name || (order as any).workerName || '待分配');
          const serviceFee = Number((order as Record<string,unknown>).service_fee || (order as any).serviceFee || 0);
          const salaryMinVal = Number((order as Record<string,unknown>).salary_min || (order as any).salaryMin || 0);
          const salaryMaxVal = Number((order as Record<string,unknown>).salary_max || (order as any).salaryMax || 0);
          const isExpanded = expandedOrder === order.id;
          return (
          <div key={order.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{order.title}</span>
              <Badge className={cn('text-xs', getStatusColor(order.status))}>
                {ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">工种：</span>{jobType}</div>
              <div><span className="text-muted-foreground">阿姨：</span>{workerName}</div>
              <div><span className="text-muted-foreground">地区：</span>{order.location}</div>
              <div><span className="text-muted-foreground">服务费：</span>{formatCurrency(serviceFee)}</div>
              {order.salary_type && <div><span className="text-muted-foreground">薪资类型：</span>{order.salary_type}</div>}
              {order.work_duration && <div><span className="text-muted-foreground">时长：</span>{order.work_duration}</div>}
              {order.contact_name && <div><span className="text-muted-foreground">联系人：</span>{order.contact_name}</div>}
              {order.contact_phone && <div><span className="text-muted-foreground">电话：</span>{order.contact_phone}</div>}
            </div>
            {order.signed_worker_id && (
              <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                ✅ 已签约阿姨ID：{order.signed_worker_id}
                {order.signed_at && <span className="ml-2">签约时间：{order.signed_at.slice(0, 10)}</span>}
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="font-bold text-amber-600">{formatCurrency(salaryMinVal)}-{formatCurrency(salaryMaxVal)}</span>
              <div className="flex gap-2">
                {order.status === 'in_service' && (
                  <Button size="sm" className="h-7 text-xs bg-pink-500 hover:bg-pink-600" onClick={() => { setReviewingOrder(order.id); setReviewContent(''); setReviewRating(5); }}>评价</Button>
                )}
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleToggleExpand(order.id)}>
                  {isExpanded ? '收起' : '详情'}
                </Button>
              </div>
            </div>

            {/* 签约记录面板 */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t space-y-2">
                <h4 className="text-sm font-medium">签约记录</h4>
                {signings.length > 0 ? (
                  <div className="space-y-2">
                    {signings.map((s: any) => (
                      <div key={s.id} className={cn('p-2 rounded text-xs', s.status === 'active' ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200 opacity-70')}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.worker_name || s.worker_id}</span>
                          <Badge className={cn('text-xs', s.status === 'active' ? 'bg-green-100 text-green-800' : s.status === 'replaced' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-800')}>
                            {s.status === 'active' ? '生效中' : s.status === 'replaced' ? '已替换' : '已取消'}
                          </Badge>
                          {s.worker_salary && <span className="text-muted-foreground">薪资：{formatCurrency(s.worker_salary)}</span>}
                        </div>
                        <div className="text-muted-foreground mt-1">
                          {s.contract_start_date && `合同：${s.contract_start_date} ~ ${s.contract_end_date || '未定'}`}
                          {s.replace_reason && ` | 原因：${s.replace_reason}`}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">暂无签约记录</div>
                )}
              </div>
            )}
          </div>
          );
        })}
        {myOrders.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无订单</div>
        )}
      </div>

      {/* 评价弹窗 */}
      <Dialog open={!!reviewingOrder} onOpenChange={(open) => { if (!open) setReviewingOrder(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>评价服务</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>评分</Label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setReviewRating(n)} className={`text-2xl ${n <= reviewRating ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
                ))}
              </div>
            </div>
            <div><Label>评价内容</Label>
              <Textarea className="mt-1" value={reviewContent} onChange={e => setReviewContent(e.target.value)} placeholder="请输入您的评价..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingOrder(null)}>取消</Button>
            <Button className="bg-pink-500 hover:bg-pink-600" onClick={handleSubmitReview} disabled={!reviewContent.trim()}>提交评价</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

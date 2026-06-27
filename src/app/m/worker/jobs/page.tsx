'use client';

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { ORDER_STATUS_LABELS, JOB_TYPES } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ViewTab = 'hall' | 'mine';

export default function WorkerJobsPage() {
  const { user } = useMiniApp();
  const userId = user?.id || '';

  const [viewTab, setViewTab] = useState<ViewTab>('hall');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [hallOrders, setHallOrders] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [myWorkerId, setMyWorkerId] = useState<string>('');
  const [appliedOrderIds, setAppliedOrderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [hallRes, myRes, workersRes, recsRes] = await Promise.all([
        fetch('/api/orders?scope=hall', { headers }),
        fetch('/api/orders', { headers }),
        fetch('/api/workers', { headers }),
        fetch('/api/recommendations?recommender_id=' + userId, { headers }),
      ]);

      const hallData = await hallRes.json();
      const myData = await myRes.json();
      const workersData = await workersRes.json();
      const recsData = await recsRes.json();

      // 接单大厅：未分配阿姨的开放订单
      if (hallData.data) {
        const available = hallData.data.filter((o: any) => {
          const rec = o as unknown as Record<string, unknown>;
          return !rec.worker_id && o.status !== 'completed' && o.status !== 'cancelled';
        });
        setHallOrders(available);
      }

      // 我的订单：已分配给我的订单
      if (myData.data) {
        setMyOrders(myData.data);
      }

      // 找到当前用户的worker记录
      if (workersData.data) {
        const myWorker = workersData.data.find((w: any) =>
          (w as Record<string,unknown>).user_id === userId || w.userId === userId
        );
        if (myWorker) setMyWorkerId(myWorker.id);
      }

      // 记录已投递的订单ID（防止重复投递）
      if (recsData.data) {
        const applied = new Set<string>(recsData.data.map((r: any) => r.order_id));
        setAppliedOrderIds(applied);
      }
    } catch (e) {
      console.error('订单数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 当前Tab的订单列表
  const currentOrders = viewTab === 'hall' ? hallOrders : myOrders;

  // 工种筛选
  const filtered = jobFilter === 'all'
    ? currentOrders
    : currentOrders.filter(o => {
        const jobType = String((o as Record<string,unknown>).job_type || (o as any).jobType || '');
        return jobType === jobFilter;
      });

  const handleApply = async (orderId: string) => {
    if (!myWorkerId) {
      alert('未找到您的阿姨档案，请先完善简历');
      return;
    }
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: orderId,
          worker_id: myWorkerId,
          recommender_id: userId,
          status: 'pending',
          message: '',
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('投递成功！经纪人确认后将通知您。');
        setAppliedOrderIds(prev => new Set([...prev, orderId]));
      } else {
        alert('投递失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('投递失败，请重试');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 顶部Tab切换 */}
      <div className="flex rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => { setViewTab('hall'); setJobFilter('all'); }}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-md transition-all',
            viewTab === 'hall' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'
          )}
        >
          接单大厅
        </button>
        <button
          onClick={() => { setViewTab('mine'); setJobFilter('all'); }}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-md transition-all',
            viewTab === 'mine' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'
          )}
        >
          我的订单
        </button>
      </div>

      {/* 工种筛选（仅在接单大厅显示） */}
      {viewTab === 'hall' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setJobFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
              jobFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border'
            )}
          >
            全部
          </button>
          {JOB_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setJobFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                jobFilter === t ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* 订单列表 */}
      <div className="space-y-3">
        {filtered.map((order) => {
          const jobType = String((order as Record<string,unknown>).job_type || (order as any).jobType || '');
          const agentName = String((order as Record<string,unknown>).agent_name || (order as Record<string,unknown>).agent_id || '未知');
          const salaryMinVal = Number((order as Record<string,unknown>).salary_min || (order as any).salaryMin || 0);
          const salaryMaxVal = Number((order as Record<string,unknown>).salary_max || (order as any).salaryMax || 0);
          const createdAt = String((order as Record<string,unknown>).created_at || '');
          return (
          <div key={order.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{order.title}</span>
                  <Badge className={cn('text-xs shrink-0', getStatusColor(order.status))}>
                    {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{jobType}</Badge>
                  <span className="text-xs text-muted-foreground">{order.location}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{order.description}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>发布：{agentName}</span>
                  <span>{createdAt}</span>
                </div>
              </div>
              <div className="text-right ml-4 shrink-0">
                <div className="text-lg font-bold text-amber-600">
                  {formatCurrency(salaryMinVal)}-{formatCurrency(salaryMaxVal)}
                </div>
                {viewTab === 'hall' ? (
                  appliedOrderIds.has(order.id) ? (
                    <Button size="sm" disabled className="mt-2 text-xs bg-slate-200 text-slate-500">已投递</Button>
                  ) : (
                    <Button size="sm" className="mt-2 bg-amber-500 hover:bg-amber-600 text-xs" onClick={() => handleApply(order.id)}>
                      立即接单
                    </Button>
                  )
                ) : (
                  <Badge className={cn('mt-2 text-xs', getStatusColor(order.status))}>
                    {ORDER_STATUS_LABELS[order.status as keyof typeof ORDER_STATUS_LABELS]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {viewTab === 'hall' ? '暂无符合条件的订单' : '暂无已接订单'}
          </div>
        )}
      </div>
    </div>
  );
}

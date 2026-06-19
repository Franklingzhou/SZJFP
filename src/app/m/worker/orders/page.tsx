'use client';

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { ORDER_STATUS_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function WorkerOrdersPage() {
  const { user } = useMiniApp();
  const userId = user?.id || '';

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [myWorkerId, setMyWorkerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 先获取worker记录以得到worker_id
      const workersRes = await fetch('/api/workers', { headers });
      const workersData = await workersRes.json();
      let workerId = '';
      if (workersData.data) {
        const myWorker = workersData.data.find((w: any) =>
          (w as Record<string, unknown>).user_id === userId || w.userId === userId
        );
        if (myWorker) {
          workerId = myWorker.id;
          setMyWorkerId(myWorker.id);
        }
      }

      // 用worker_id查推荐记录
      if (workerId) {
        const recsRes = await fetch(`/api/recommendations?worker_id=${workerId}`, { headers });
        const recsData = await recsRes.json();
        if (recsData.data) setRecommendations(recsData.data);
      }
    } catch (e) {
      console.error('推荐记录加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (recId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id: recId, status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        setRecommendations(prev =>
          prev.map(r => r.id === recId ? { ...r, status: newStatus } : r)
        );
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('操作失败，请重试');
    }
  };

  const filtered = filter === 'all'
    ? recommendations
    : recommendations.filter(r => r.status === filter);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-slate-400" />;
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待确认';
      case 'accepted': return '已接受';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-100 text-slate-600';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">我的推荐记录</h2>

      {/* 状态筛选 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: '全部' },
          { key: 'pending', label: '待确认' },
          { key: 'accepted', label: '已接受' },
          { key: 'rejected', label: '已拒绝' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
              filter === f.key ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 推荐记录列表 */}
      <div className="space-y-3">
        {filtered.map(rec => {
          const orderId = rec.order_id || '';
          const orderTitle = rec.order?.title || rec.order_title || '关联订单';
          const orderLocation = rec.order?.location || rec.order_location || '';
          const salaryMin = rec.order?.salary_min || rec.salary_min || 0;
          const salaryMax = rec.order?.salary_max || rec.salary_max || 0;
          const recommenderName = rec.recommender?.name || rec.recommender_name || '推荐人';
          const recommenderRole = rec.recommender_role || '';
          const notes = rec.notes || '';
          const createdAt = rec.created_at || '';

          return (
            <div key={rec.id} className="bg-white rounded-xl border p-4">
              {/* 顶部：状态 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {statusIcon(rec.status)}
                  <span className={cn('text-sm font-medium px-2 py-0.5 rounded-full', statusColor(rec.status))}>
                    {statusLabel(rec.status)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{createdAt}</span>
              </div>

              {/* 订单信息 */}
              <div className="space-y-2">
                <div className="font-semibold">{orderTitle}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {orderLocation && (
                    <div><span className="text-muted-foreground">地区：</span>{orderLocation}</div>
                  )}
                  {(salaryMin || salaryMax) ? (
                    <div><span className="text-muted-foreground">薪资：</span>
                      <span className="font-bold text-amber-600">
                        {formatCurrency(salaryMin)}-{formatCurrency(salaryMax)}
                      </span>
                    </div>
                  ) : null}
                  <div><span className="text-muted-foreground">推荐人：</span>{recommenderName}</div>
                  {recommenderRole && (
                    <div><span className="text-muted-foreground">角色：</span>{recommenderRole}</div>
                  )}
                </div>
                {notes && (
                  <div className="text-sm text-muted-foreground bg-slate-50 rounded p-2 mt-2">
                    {notes}
                  </div>
                )}
              </div>

              {/* 操作按钮（仅待确认状态） */}
              {rec.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                    onClick={() => handleStatusChange(rec.id, 'accepted')}
                  >
                    接受推荐
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs"
                    onClick={() => handleStatusChange(rec.id, 'rejected')}
                  >
                    婉拒
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {filter === 'all' ? '暂无推荐记录' : `暂无${statusLabel(filter)}的记录`}
          </div>
        )}
      </div>
    </div>
  );
}

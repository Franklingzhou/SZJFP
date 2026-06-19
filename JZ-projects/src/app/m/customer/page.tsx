'use client';

import React from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { mockOrders, mockWorkers, mockAgents } from '@/lib/data-service';
import { useRouter } from 'next/navigation';
import { ClipboardList, Star, ChevronRight, Phone, UserCircle } from 'lucide-react';

export default function CustomerPage() {
  const { user } = useMiniApp();
  const router = useRouter();

  const myOrders = mockOrders.filter(o => o.customerId === user?.id || o.customerId === 'c001');
  const inProgressOrders = myOrders.filter(o => o.status === 'signed' || o.status === 'interviewing');
  const completedOrders = myOrders.filter(o => o.status === 'completed');
  const pendingReviews = completedOrders.filter(o => !o.reviewed);

  // 模拟我的经纪人
  const myAgent = mockAgents.length > 0 ? mockAgents[0] : null;

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: '待确认', confirmed: '已确认', in_progress: '服务中',
      completed: '已完成', cancelled: '已取消',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700',
      confirmed: 'bg-blue-50 text-blue-700',
      in_progress: 'bg-green-50 text-green-700',
      completed: 'bg-slate-50 text-slate-600',
      cancelled: 'bg-red-50 text-red-600',
    };
    return map[status] || 'bg-slate-50 text-slate-600';
  };

  return (
    <div className="px-4 pt-4 pb-6">
      {/* 头部 */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">你好，{user?.name || '客户'}</h2>
        <p className="text-xs text-slate-400 mt-0.5">优质家政服务，安心之选</p>
      </div>

      {/* 我的经纪人 */}
      {myAgent && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <UserCircle className="h-4 w-4 text-amber-500" /> 我的经纪人
          </h3>
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-lg">
              {myAgent.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">{myAgent.name}</p>
              <p className="text-xs text-slate-400">{myAgent.experience} · 专注家政服务</p>
            </div>
            <a href={`tel:${myAgent.phone}`} className="p-2.5 rounded-xl bg-green-50 text-green-600">
              <Phone className="h-5 w-5" />
            </a>
          </div>
        </div>
      )}

      {/* 我的订单 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4 text-amber-500" /> 我的订单
          </h3>
          <button onClick={() => router.push('/m/customer/orders')} className="text-xs text-amber-600 flex items-center">
            全部 <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {myOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <p className="text-sm text-slate-400">暂无订单</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myOrders.slice(0, 5).map(order => {
              const worker = mockWorkers.find(w => w.id === order.workerId);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-slate-50"
                  onClick={() => router.push('/m/customer/orders')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-800">{order.serviceType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {worker ? `${worker.name} · ` : ''}¥{order.amount}/月
                    </p>
                    <p className="text-xs text-slate-300">{order.startDate}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 待评价 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <Star className="h-4 w-4 text-amber-500" /> 待评价
          </h3>
          <button onClick={() => router.push('/m/customer/reviews')} className="text-xs text-amber-600 flex items-center">
            全部评价 <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {pendingReviews.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <p className="text-sm text-slate-400">暂无待评价订单</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingReviews.slice(0, 3).map(order => {
              const worker = mockWorkers.find(w => w.id === order.workerId);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-slate-50"
                  onClick={() => router.push('/m/customer/reviews')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-800">{order.serviceType}</span>
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">待评价</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {worker ? `服务人员：${worker.name}` : ''}
                    </p>
                    <button
                      className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); router.push('/m/customer/reviews'); }}
                    >
                      去评价
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 服务中的阿姨联系方式 */}
      {inProgressOrders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">服务中的阿姨</h3>
          <div className="space-y-2">
            {inProgressOrders.map(order => {
              const worker = mockWorkers.find(w => w.id === order.workerId);
              if (!worker) return null;
              return (
                <div key={order.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                    {worker.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{worker.name}</p>
                    <p className="text-xs text-slate-400">{order.serviceType} · {order.startDate} 起</p>
                  </div>
                  <a href={`tel:${worker.phone}`} className="p-2 rounded-lg bg-green-50 text-green-600">
                    <Phone className="h-5 w-5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

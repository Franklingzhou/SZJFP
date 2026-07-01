'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers, mockOrders, mockHallOrders, mockRecruiterLeads } from '@/lib/data-service';
import Link from 'next/link';
import {
  Users, Briefcase, ClipboardList, ChevronRight, TrendingUp, Phone
} from 'lucide-react';

export default function WorkerOpsHomePage() {
  const router = useRouter();
  const { user } = useMiniApp();
  const workerCount = mockWorkers.length;
  const activeOrders = mockOrders.filter(o => o.status === 'interviewing' || o.status === 'signed').length;
  const totalLeads = mockRecruiterLeads.length;
  const hallOrders = mockHallOrders.length;

  // 空闲阿姨
  const freeWorkers = mockWorkers.filter(w => w.status === 'idle');

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 头部概览 */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-xl p-4 text-white mb-4">
        <p className="text-sm opacity-90">阿姨运营 · {user?.name || '运营专员'}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <p className="text-xl font-bold">{workerCount}</p>
            <p className="text-xs opacity-80">阿姨总数</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{activeOrders}</p>
            <p className="text-xs opacity-80">进行中订单</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{totalLeads}</p>
            <p className="text-xs opacity-80">线索数</p>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link href="/m/worker_operator/workers" className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 active:bg-slate-50">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <Users className="h-6 w-6 text-rose-500" />
          </div>
          <span className="text-sm font-medium text-slate-700">阿姨管理</span>
          <span className="text-xs text-slate-400">{workerCount}位阿姨</span>
        </Link>
        <Link href="/m/worker_operator/hall" className="bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-2 active:bg-slate-50">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <Briefcase className="h-6 w-6 text-amber-500" />
          </div>
          <span className="text-sm font-medium text-slate-700">合单大厅</span>
          <span className="text-xs text-slate-400">{hallOrders}个订单</span>
        </Link>
      </div>

      {/* 空闲阿姨推荐 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">空闲阿姨</h2>
          <Link href="/m/worker_operator/workers" className="text-xs text-rose-500 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {freeWorkers.slice(0, 3).map(w => (
            <div key={w.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-semibold text-sm">
                {w.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{w.name}</p>
                <p className="text-xs text-slate-500">{w.jobTypes.join(' · ')} | {w.origin || ''}</p>
              </div>
              <a href={`tel:${w.phone}`} className="p-2 rounded-lg bg-green-50 text-green-600">
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 最新合单 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">最新合单</h2>
          <Link href="/m/worker_operator/hall" className="text-xs text-rose-500 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {mockHallOrders.slice(0, 3).map(o => (
          <div key={o.id} className="bg-white rounded-xl p-3 shadow-sm mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{o.title}</p>
              <p className="text-xs text-slate-400">{o.jobType} · {o.salaryMin}-{o.salaryMax}元/月</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${o.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'}`}>
              {o.status === 'open' ? '待匹配' : '已匹配'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers } from '@/lib/data-service';
import { Phone, ChevronRight } from 'lucide-react';

export default function AgentWorkersPage() {
  const { user } = useMiniApp();
  const router = useRouter();
  const [tab, setTab] = useState<'my' | 'all'>('my');

  const myWorkers = mockWorkers.filter(w => w.creatorId === user?.id);
  const displayList = tab === 'my' ? myWorkers : mockWorkers;

  return (
    <div className="px-4 pt-4 pb-20">
      {/* Tab */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab('my')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'my' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border'}`}
        >我的阿姨 ({myWorkers.length})</button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'all' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border'}`}
        >全部阿姨 ({mockWorkers.length})</button>
      </div>

      {displayList.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">暂无阿姨数据</p>
      ) : (
        <div className="space-y-2">
          {displayList.map(w => (
            <div
              key={w.id}
              className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-slate-50"
              onClick={() => router.push(`/resume/${w.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">
                  {w.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{w.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${w.status === 'idle' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                      {w.status === 'idle' ? '空闲' : w.status === 'working' ? '在户' : '暂停'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{w.jobTypes?.join(' · ') || '未选择'} · {w.age}岁 · {w.origin}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:${w.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg bg-green-50 text-green-600">
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

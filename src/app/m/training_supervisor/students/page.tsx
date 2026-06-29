'use client';

import React, { useState } from 'react';
import { mockRecruiterLeads } from '@/lib/data-service';
import { RecruiterLead } from '@/lib/data-service';
import { Phone, ChevronRight } from 'lucide-react';

const STATUS_MAP: Record<string, string> = {
  new: '新线索', following: '跟进中', qualified: '已合格', converted: '已转化', lost: '已流失'
};

export default function TrainingSupervisorStudentsPage() {
  const [leads] = useState<RecruiterLead[]>(mockRecruiterLeads);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = leads.filter(l => {
    if (search && !l.name.includes(search)) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="p-4 pb-20">
      <h1 className="text-base font-semibold mb-3">学员管理</h1>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名" className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {['all','new','following','converted','lost'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {s === 'all' ? '全部' : STATUS_MAP[s]}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(l => (
          <div key={l.id} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {l.name}
                  {l.age && <span className="text-xs text-slate-400 ml-1">{l.age}岁</span>}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    l.level === 'A' ? 'bg-red-100 text-red-600' :
                    l.level === 'B' ? 'bg-amber-100 text-amber-600' :
                    l.level === 'C' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>{l.level}级</span>
                </p>
                <p className="text-xs text-slate-400">{l.source} | {l.recruiterName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  l.status === 'converted' ? 'bg-green-100 text-green-700' :
                  l.status === 'lost' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{STATUS_MAP[l.status]}</span>
                <a href={`tel:${l.phone}`} className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                  <Phone className="h-3.5 w-3.5 text-white" />
                </a>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-8">暂无学员</p>}
      </div>
    </div>
  );
}

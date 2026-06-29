'use client';

import React, { useState } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { mockRecruiterLeads, mockWorkers } from '@/lib/data-service';
import { Search, Filter, Phone, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function InstructorWorkersPage() {
  const { user } = useMiniApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'students' | 'all'>('students');
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  // 使用共享数据：学员 = 线索中已转化的（签约后即学员，转化后进简历池）
  const studentLeads = mockRecruiterLeads.filter(l =>
    l.status === 'converted'
  );

  const filteredStudents = studentLeads.filter(s => {
    if (filterType && !(s.intention || '').includes(filterType)) return false;
    if (search && !s.name.includes(search) && !(s.intention || '').includes(search)) return false;
    return true;
  });

  return (
    <div className="px-4 pt-4">
      {/* Tab */}
      <div className="flex gap-4 mb-3 border-b border-slate-100">
        <button
          onClick={() => setActiveTab('students')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'students' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'
          }`}
        >我的学员</button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'all' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'
          }`}
        >全部阿姨</button>
      </div>

      {activeTab === 'students' && (
        <div>
          {/* 搜索+筛选 */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索姓名或意向工种"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1 ${showFilter ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-500'}`}
            >
              <Filter className="h-4 w-4" /> 筛选
            </button>
          </div>

          {/* 筛选面板 */}
          {showFilter && (
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 mb-3">
              <div className="mb-2">
                <p className="text-xs text-slate-400 mb-1">工种</p>
                <div className="flex flex-wrap gap-1.5">
                  {['月嫂', '育儿嫂', '保姆', '钟点工', '护工'].map(t => (
                    <button key={t} onClick={() => setFilterType(filterType === t ? '' : t)}
                      className={`px-2.5 py-1 rounded-full text-xs ${filterType === t ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">状态</p>
                <div className="flex gap-1.5">
                  {[
                    { val: '', label: '全部' },
                    { val: 'converted', label: '已转化' },
                  ].map(s => (
                    <button key={s.val} onClick={() => setFilterStatus(s.val)}
                      className={`px-2.5 py-1 rounded-full text-xs ${filterStatus === s.val ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                    >{s.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400 mb-2">学员来源于招生线索中正在培训/已合格/已转化的</p>

          {/* 学员列表 */}
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">暂无符合条件的学员</p>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map(s => (
                <div
                  key={s.id}
                  className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-slate-50"
                  onClick={() => router.push(`/resume/${s.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm">
                      {s.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{s.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700`}>
                          已转化
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{s.intention || '未选择'} · 来源：{s.recruiterName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${s.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg bg-green-50 text-green-600">
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
      )}

      {activeTab === 'all' && (
        <div className="space-y-2">
          {mockWorkers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">暂无阿姨数据</p>
          ) : (
            mockWorkers.map(w => (
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
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

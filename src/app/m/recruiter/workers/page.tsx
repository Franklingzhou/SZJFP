'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers, mockRecruiterLeads } from '@/lib/data-service';
import { JobType } from '@/lib/types';
import { Phone, ChevronRight, Filter, X, FileText } from 'lucide-react';

export default function RecruiterWorkersPage() {
  const router = useRouter();
  const { user } = useMiniApp();
  const [tab, setTab] = useState<'students' | 'all'>('students');
  const [showFilter, setShowFilter] = useState(false);

  // 筛选状态
  const [filterJobType, setFilterJobType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterAgeMin, setFilterAgeMin] = useState('');
  const [filterAgeMax, setFilterAgeMax] = useState('');
  const [filterSalaryMin, setFilterSalaryMin] = useState('');
  const [filterSalaryMax, setFilterSalaryMax] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 我的学员 = 我创建的阿姨 + 已签约的招生线索
  const myStudents = mockWorkers.filter(w => w.creatorId === user?.id);
  const signedLeads = mockRecruiterLeads.filter(l => l.status === 'signed' && l.recruiterId === user?.id);
  const allStudents = [...myStudents, ...signedLeads.map(l => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    age: 0,
    origin: '',
    jobTypes: [] as JobType[],
    experience: 0,
    skills: [],
    expectedSalaryMin: 0,
    expectedSalaryMax: 0,
    status: 'pending' as const,
    creatorId: l.recruiterId,
    creatorName: l.recruiterName,
    createdAt: l.createdAt,
    isFromLead: true,
    leadRemark: l.remark,
  }))];

  // 搜索+筛选后的学员
  let filteredStudents = allStudents;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredStudents = filteredStudents.filter(w =>
      w.name.toLowerCase().includes(q) || w.phone.includes(q) || w.jobTypes.some(j => j.toLowerCase().includes(q))
    );
  }
  if (filterJobType) filteredStudents = filteredStudents.filter(w => w.jobTypes.includes(filterJobType as JobType));
  if (filterStatus) filteredStudents = filteredStudents.filter(w => w.status === filterStatus);
  if (filterOrigin) filteredStudents = filteredStudents.filter(w => w.origin.includes(filterOrigin));
  if (filterAgeMin) filteredStudents = filteredStudents.filter(w => w.age >= parseInt(filterAgeMin));
  if (filterAgeMax) filteredStudents = filteredStudents.filter(w => w.age <= parseInt(filterAgeMax));
  if (filterSalaryMin) filteredStudents = filteredStudents.filter(w => w.expectedSalaryMin >= parseInt(filterSalaryMin));
  if (filterSalaryMax) filteredStudents = filteredStudents.filter(w => w.expectedSalaryMax <= parseInt(filterSalaryMax));

  const hasActiveFilter = filterJobType || filterStatus || filterOrigin || filterAgeMin || filterAgeMax || filterSalaryMin || filterSalaryMax;

  const clearFilters = () => {
    setFilterJobType(''); setFilterStatus(''); setFilterOrigin('');
    setFilterAgeMin(''); setFilterAgeMax(''); setFilterSalaryMin(''); setFilterSalaryMax('');
  };

  return (
    <div className="pb-20 px-4 pt-4">
      {/* Tab切换 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab('students')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'students' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border'}`}
        >
          我的学员
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'all' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border'}`}
        >
          全部阿姨
        </button>
      </div>

      {tab === 'students' ? (
        <>
          {/* 搜索框 */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="搜索学员姓名/电话/工种"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>
          {/* 筛选按钮 */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">{filteredStudents.length} 位学员{hasActiveFilter ? '（已筛选）' : ''}</p>
            <button
              onClick={() => setShowFilter(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs ${hasActiveFilter ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              <Filter className="h-3 w-3" /> 筛选 {hasActiveFilter && `(${[filterJobType, filterStatus, filterOrigin, filterAgeMin && '年龄', filterSalaryMin && '薪资'].filter(Boolean).length})`}
            </button>
          </div>

          {/* 学员列表 */}
          <div className="space-y-2">
            {filteredStudents.map(w => (
              <div
                key={w.id}
                className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-slate-50"
                onClick={() => router.push(`/resume/${w.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                    {w.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{w.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${w.status === 'idle' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                        {w.status === 'idle' ? '空闲' : '在户'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{w.jobTypes.join(' · ')} · {w.age}岁 · {w.origin}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${w.phone}`} onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg bg-green-50 text-green-600">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
                {w.expectedSalaryMin > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-xs text-slate-500">期望薪资：¥{w.expectedSalaryMin}-{w.expectedSalaryMax}/月</p>
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/resume/${w.id}`); }}
                      className="flex items-center gap-1 text-xs text-amber-600">
                      <FileText className="h-3 w-3" /> 查看简历
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">暂无学员</p>
            )}
          </div>
        </>
      ) : (
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

      {/* 筛选弹窗 */}
      {showFilter && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowFilter(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">筛选学员</h3>
              <div className="flex items-center gap-3">
                {hasActiveFilter && <button onClick={clearFilters} className="text-xs text-red-500">清除</button>}
                <X className="h-6 w-6 text-slate-400 cursor-pointer" onClick={() => setShowFilter(false)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">工种</label>
              <select value={filterJobType} onChange={e => setFilterJobType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">全部</option>
                <option value="保姆">保姆</option>
                <option value="月嫂">月嫂</option>
                <option value="育儿嫂">育儿嫂</option>
                <option value="护工">护工</option>
                <option value="保洁">保洁</option>
                <option value="钟点工">钟点工</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">状态</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">全部</option>
                <option value="idle">空闲</option>
                <option value="working">在户</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">籍贯</label>
              <input value={filterOrigin} onChange={e => setFilterOrigin(e.target.value)} placeholder="如：安徽" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">年龄范围</label>
              <div className="flex gap-2">
                <input value={filterAgeMin} onChange={e => setFilterAgeMin(e.target.value)} placeholder="最小" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <span className="self-center text-slate-400">-</span>
                <input value={filterAgeMax} onChange={e => setFilterAgeMax(e.target.value)} placeholder="最大" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">期望薪资范围（元/月）</label>
              <div className="flex gap-2">
                <input value={filterSalaryMin} onChange={e => setFilterSalaryMin(e.target.value)} placeholder="最低" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <span className="self-center text-slate-400">-</span>
                <input value={filterSalaryMax} onChange={e => setFilterSalaryMax(e.target.value)} placeholder="最高" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={() => setShowFilter(false)} className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium">确定筛选</button>
          </div>
        </div>
      )}
    </div>
  );
}

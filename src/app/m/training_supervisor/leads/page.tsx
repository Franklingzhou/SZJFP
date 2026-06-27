'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LEAD_STATUS_LABELS, JOB_TYPES } from '@/lib/types';
import type { LeadStatus } from '@/lib/types';
import { mockRecruiterLeads, mockAgents } from '@/lib/data-service';
import type { RecruiterLead } from '@/lib/data-service';
import { initDataFromApi, createRecord, updateRecord, refreshData } from '@/lib/data-service';
import { Search, Plus, Phone, X, Send, Mail, ScanLine, User, Filter, ArrowRightLeft } from 'lucide-react';

type FollowFilter = 'all' | 'new' | 'following' | 'signed' | 'lost';

const FOLLOW_FILTER_LABELS: Record<FollowFilter, string> = {
  all: '全部',
  new: '新线索',
  following: '跟进中',
  signed: '已签约',
  lost: '流失',
};

const FOLLOW_RESULT_OPTIONS = [
  { value: 'following', label: '有意向' },
  { value: 'signed', label: '已成交' },
  { value: 'lost', label: '流失' },
];

interface FollowRecord {
  date: string;
  content: string;
  result: string;
}

const initialFollowRecords: Record<string, FollowRecord[]> = {
  rl001: [{ date: '2026-05-20', content: '首次联系，了解基本意向', result: '有意向' }],
  rl002: [
    { date: '2026-05-18', content: '电话联系，了解意向和经验', result: '有意向' },
    { date: '2026-05-19', content: '推荐保姆培训课程，确认报名', result: '跟进中' },
  ],
  rl003: [
    { date: '2026-05-15', content: '电话沟通，了解基本情况', result: '有意向' },
    { date: '2026-05-16', content: '推荐育儿嫂培训，已报名', result: '跟进中' },
    { date: '2026-05-25', content: '培训结业，成绩优秀', result: '已成交' },
  ],
  rl004: [
    { date: '2026-05-10', content: '门店来访，初步联系', result: '有意向' },
    { date: '2026-05-12', content: '推荐钟点工培训，报名', result: '跟进中' },
    { date: '2026-05-20', content: '培训合格，转成正式简历', result: '已成交' },
  ],
  rl005: [
    { date: '2026-05-08', content: '电话联系，了解保洁经验', result: '流失' },
    { date: '2026-05-12', content: '二次回访，仍无意向', result: '流失' },
  ],
};

export default function TrainingSupervisorLeadsPage() {
  const [leads, setLeads] = useState<RecruiterLead[]>([...mockRecruiterLeads]);
  const leadIdCounter = useRef(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FollowFilter>('all');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [followRecords, setFollowRecords] = useState<Record<string, FollowRecord[]>>(initialFollowRecords);

  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadAge, setLeadAge] = useState('');
  const [leadOrigin, setLeadOrigin] = useState('');
  const [leadIntention, setLeadIntention] = useState('');
  const [leadNote, setLeadNote] = useState('');
  const [assignRecruiter, setAssignRecruiter] = useState('');

  const [showFollowRecord, setShowFollowRecord] = useState<string | null>(null);
  const [followContent, setFollowContent] = useState('');
  const [followResult, setFollowResult] = useState('');

  const [showContractForm, setShowContractForm] = useState(false);
  const [contractName, setContractName] = useState('');
  const [contractIdCard, setContractIdCard] = useState('');
  const [contractCourse, setContractCourse] = useState('');
  const [contractPrice, setContractPrice] = useState('');
  const [contractIdResult, setContractIdResult] = useState<{ gender: string; birthday: string } | null>(null);

  // 初始化加载数据
  useEffect(() => {
    initDataFromApi().then(() => {
      setLeads([...mockRecruiterLeads]);
    });
  }, []);

  // 获取所有招生人员
  const recruiters = mockAgents.filter(a => a.role === 'recruiter' && a.reviewStatus === 'approved');

  let filteredLeads = leads;
  if (search) filteredLeads = filteredLeads.filter(l => l.name.includes(search) || l.phone.includes(search));
  if (filter !== 'all') {
    if (filter === 'new') filteredLeads = filteredLeads.filter(l => l.status === 'new');
    else if (filter === 'following') filteredLeads = filteredLeads.filter(l => l.status === 'following');
    else if (filter === 'signed') filteredLeads = filteredLeads.filter(l => l.status === 'signed');
    else if (filter === 'lost') filteredLeads = filteredLeads.filter(l => l.status === 'lost');
  }
  if (recruiterFilter !== 'all') {
    filteredLeads = filteredLeads.filter(l => l.recruiterId === recruiterFilter);
  }

  const statusColors: Record<LeadStatus, string> = {
    new: 'bg-slate-50 text-slate-600',
    following: 'bg-blue-50 text-blue-700',
    contacted: 'bg-cyan-50 text-cyan-700',
    signed: 'bg-green-50 text-green-700',
    training: 'bg-amber-50 text-amber-700',
    qualified: 'bg-purple-50 text-purple-700',
    converted: 'bg-emerald-50 text-emerald-700',
    lost: 'bg-red-50 text-red-700',
  };

  const handleAddLead = async () => {
    if (!leadName || !leadPhone) return;
    const recruiterId = assignRecruiter || recruiterFilter !== 'all' ? recruiterFilter : '';
    const recruiter = recruiters.find(r => r.id === recruiterId);
    try {
      const result = await createRecord('leads', {
        name: leadName,
        phone: leadPhone,
        age: leadAge ? parseInt(leadAge) : null,
        origin: leadOrigin || '',
        intention: leadIntention || '',
        source: '主管录入',
        status: 'new',
        level: 'C',
        recruiter_id: recruiterId || null,
        note: leadNote || '',
      } as unknown as Record<string, unknown>);
      if (result.success) {
        await refreshData();
        setLeads([...mockRecruiterLeads]);
        alert(`线索已录入：${leadName} (${leadPhone})`);
        setShowLeadForm(false);
        setLeadName(''); setLeadPhone(''); setLeadAge(''); setLeadOrigin(''); setLeadIntention(''); setLeadNote('');
        setAssignRecruiter('');
      } else {
        alert('录入失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('录入失败，请重试');
    }
  };

  const handleAddFollowRecord = async () => {
    if (!followContent || !showFollowRecord) return;
    const resultLabel = FOLLOW_RESULT_OPTIONS.find(o => o.value === followResult)?.label || '已跟进';
    const newRecord: FollowRecord = {
      date: new Date().toISOString().slice(0, 10),
      content: followContent,
      result: resultLabel,
    };
    setFollowRecords(prev => ({
      ...prev,
      [showFollowRecord]: [...(prev[showFollowRecord] || []), newRecord],
    }));
    if (followResult) {
      try {
        const updateResult = await updateRecord('leads', showFollowRecord, {
          status: followResult,
        });
        if (updateResult.success) {
          await refreshData();
          setLeads([...mockRecruiterLeads]);
        }
      } catch {
        // 仍然在前端更新
        setLeads(prev => prev.map(l => l.id === showFollowRecord ? { ...l, status: followResult as LeadStatus } : l));
      }
    }
    setFollowContent('');
    setFollowResult('');
  };

  const handleSignLead = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    if (lead.status === 'signed') {
      alert('该线索已签约');
      return;
    }
    if (!confirm(`确认将 ${lead.name} 签约？签约后将自动创建待审核简历。`)) return;
    try {
      // 调用签约API（自动创建worker(pending) + contract + resume_review）
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session': localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token') || '' },
        body: JSON.stringify({
          job_types: lead.intention || '',
          experience_years: 0,
          expected_salary_min: 4000,
          expected_salary_max: 6000,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await refreshData();
        setLeads([...mockRecruiterLeads]);
        alert(`已签约！${lead.name} 的简历已自动创建，等待管理员审核。`);
      } else {
        alert('签约失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('签约失败，请重试');
    }
    setSelectedLead(null);
  };

  const [assigningLead, setAssigningLead] = useState<string | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState('');

  const handleAssign = async (leadId: string) => {
    if (!selectedConsultant) return;
    const consultant = recruiters.find(c => c.id === selectedConsultant);
    if (!consultant) return;
    try {
      const result = await updateRecord('leads', leadId, {
        recruiter_id: consultant.id,
      });
      if (result.success) {
        await refreshData();
        setLeads([...mockRecruiterLeads]);
        alert(`已将线索分配给 ${consultant.name}`);
      } else {
        alert('分配失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('分配失败，请重试');
    }
    setAssigningLead(null);
    setSelectedConsultant('');
  };

  const handleContractIdScan = () => {
    const id = contractIdCard.trim();
    if (id.length !== 18) { alert('请输入18位身份证号码'); return; }
    const weights = [7,9,10,5,8,4,2,1,6,3,7,9,10,5,8,4,2];
    const checks = ['1','0','X','9','8','7','6','5','4','3','2'];
    let sum = 0;
    for (let i = 0; i < 17; i++) sum += parseInt(id[i]) * weights[i];
    if (id[17].toUpperCase() !== checks[sum % 11]) { alert('身份证校验码不正确，请核对'); return; }
    const year = id.substring(6, 10);
    const month = id.substring(10, 12);
    const day = id.substring(12, 14);
    const gender = parseInt(id[16]) % 2 === 1 ? '男' : '女';
    setContractIdResult({ gender, birthday: `${year}-${month}-${day}` });
  };

  const handleSendContract = () => {
    if (!contractName || !contractIdCard || !contractCourse || !contractPrice) {
      alert('请填写完整信息');
      return;
    }
    alert(`合同已发送给 ${contractName}\n身份证：${contractIdCard}\n课程：${contractCourse}\n价格：¥${contractPrice}\n\n对方将通过微信小程序查看并短信验证签署。`);
    setShowContractForm(false);
    setContractName(''); setContractIdCard(''); setContractCourse(''); setContractPrice('');
    setContractIdResult(null);
  };

  const openContractForm = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setContractName(lead.name);
      setContractIdCard('');
      setContractCourse('');
      setContractPrice('');
      setContractIdResult(null);
      setShowContractForm(true);
    }
  };

  return (
    <div className="pb-20 px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-slate-800">线索管理</h1>
        <button
          onClick={() => setShowLeadForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg"
        >
          <Plus className="h-3 w-3" /> 录线索
        </button>
      </div>

      {/* 搜索 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名或电话" className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm bg-white" />
      </div>

      {/* 招生筛选 */}
      <div className="flex gap-2 mb-2 overflow-x-auto">
        <button
          onClick={() => setRecruiterFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex items-center gap-1 ${recruiterFilter === 'all' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white text-slate-500 border border-slate-200'}`}
        >
          <Filter className="h-3 w-3" /> 全部招生
        </button>
        {recruiters.map(r => (
          <button
            key={r.id}
            onClick={() => setRecruiterFilter(r.id)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${recruiterFilter === r.id ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white text-slate-500 border border-slate-200'}`}
          >
            {r.name}
          </button>
        ))}
      </div>

      {/* 状态筛选 */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {(Object.entries(FOLLOW_FILTER_LABELS) as [FollowFilter, string][]).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${filter === k ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-white text-slate-500 border border-slate-200'}`}>{v}</button>
        ))}
      </div>

      {/* 线索列表 */}
      <div className="space-y-2">
        {filteredLeads.map(l => {
          const recruiter = recruiters.find(r => r.id === l.recruiterId);
          return (
            <div
              key={l.id}
              className="bg-white rounded-xl p-4 shadow-sm cursor-pointer active:bg-slate-50"
              onClick={() => setSelectedLead(selectedLead === l.id ? null : l.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">{l.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{l.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[l.status]}`}>{LEAD_STATUS_LABELS[l.status]}</span>
                  </div>
                  <p className="text-xs text-slate-500">{l.intention || l.remark} · {l.origin || l.source} {l.age ? `· ${l.age}岁` : ''}</p>
                  {recruiter && <p className="text-[10px] text-blue-500">招生：{recruiter.name}</p>}
                </div>
                <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} className="p-2 rounded-lg bg-green-50 text-green-600"><Phone className="h-4 w-4" /></a>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={e => { e.stopPropagation(); setAssigningLead(l.id); setSelectedConsultant(''); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1"
                >
                  <ArrowRightLeft className="h-3 w-3" /> 分配
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleSignLead(l.id); }}
                  className={`text-xs px-3 py-1.5 rounded-lg ${l.status === 'signed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
                >
                  {l.status === 'signed' ? '已签约' : '签约'}
                </button>
              </div>
              {selectedLead === l.id && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex text-xs mb-1"><span className="text-slate-400 w-16">电话：</span><a href={`tel:${l.phone}`} className="text-blue-600">{l.phone}</a></div>
                  <div className="flex text-xs mb-3"><span className="text-slate-400 w-16">意向：</span><span className="text-slate-700">{l.intention || '未选择'} · {l.origin || l.source} {l.age ? `· ${l.age}岁` : ''}</span></div>

                  <div className="flex gap-3">
                    <div className="flex-1 border border-blue-100 rounded-xl p-3 bg-blue-50">
                      <p className="text-xs font-semibold text-blue-700 mb-2">跟进内容</p>
                      <textarea
                        value={showFollowRecord === l.id ? followContent : ''}
                        onChange={e => { if (showFollowRecord !== l.id) setShowFollowRecord(l.id); setFollowContent(e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        placeholder="输入本次跟进内容…"
                        className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-xs bg-white resize-none"
                        rows={2}
                      />
                      <p className="text-xs font-semibold text-blue-700 mb-1.5 mt-1.5">跟进结果</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {FOLLOW_RESULT_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (showFollowRecord !== l.id) setShowFollowRecord(l.id); setFollowResult(opt.value); }}
                            className={`py-1 text-xs rounded-lg border transition-colors ${
                              (showFollowRecord === l.id ? followResult : '') === opt.value
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); if (showFollowRecord !== l.id) setShowFollowRecord(l.id); handleAddFollowRecord(); }}
                          disabled={!followContent}
                          className="flex-1 py-1.5 bg-blue-500 text-white text-xs rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" /> 提交
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openContractForm(l.id); }}
                          className="flex-1 py-1.5 bg-amber-500 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                        >
                          <Mail className="h-3 w-3" /> 合同
                        </button>
                      </div>
                    </div>

                    <div className="w-[45%] border border-slate-100 rounded-xl p-2.5 bg-white">
                      <p className="text-xs font-semibold text-slate-500 mb-1.5">跟进记录</p>
                      {(followRecords[l.id] || []).length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3">暂无记录</p>
                      ) : (
                        <div className="space-y-0 max-h-48 overflow-y-auto">
                          {(followRecords[l.id] || []).map((r, i) => (
                            <div key={i} className="flex gap-2">
                              <div className="flex flex-col items-center">
                                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5" />
                                {i < (followRecords[l.id] || []).length - 1 && <div className="w-0.5 flex-1 bg-slate-200 mt-0.5" />}
                              </div>
                              <div className="flex-1 pb-2">
                                <span className="text-[10px] text-slate-400">{r.date}</span>
                                <p className="text-xs text-slate-700 leading-tight">{r.content}</p>
                                <span className="inline-block text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded mt-0.5">{r.result}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredLeads.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">暂无线索</p>
        )}
      </div>

      {/* 录线索弹窗 */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowLeadForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">录入线索</h3>
              <X className="h-6 w-6 text-slate-400 cursor-pointer" onClick={() => setShowLeadForm(false)} />
            </div>
            <input value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="姓名" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="电话" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input value={leadAge} onChange={e => setLeadAge(e.target.value)} placeholder="年龄" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input value={leadOrigin} onChange={e => setLeadOrigin(e.target.value)} placeholder="籍贯" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            </div>
            <select value={leadIntention} onChange={e => setLeadIntention(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">选择意向工种</option>
              {JOB_TYPES.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
            <div>
              <label className="text-xs text-slate-500">分配招生人员</label>
              <select value={assignRecruiter} onChange={e => setAssignRecruiter(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">待分配</option>
                {recruiters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <input value={leadNote} onChange={e => setLeadNote(e.target.value)} placeholder="备注" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button onClick={handleAddLead} className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium">确认录入</button>
          </div>
        </div>
      )}

      {/* 分配弹窗 */}
      {assigningLead && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => { setAssigningLead(null); setSelectedConsultant(''); }}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">分配招生人员</h3>
              <X className="h-6 w-6 text-slate-400 cursor-pointer" onClick={() => { setAssigningLead(null); setSelectedConsultant(''); }} />
            </div>
            <p className="text-xs text-slate-500">选择招生人员后，线索将分配给其跟进</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {recruiters.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedConsultant(r.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left ${
                    selectedConsultant === r.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">{r.name[0]}</div>
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.phone}</p>
                  </div>
                </button>
              ))}
              {recruiters.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">暂无已审核的招生人员</p>
              )}
            </div>
            <button
              onClick={() => handleAssign(assigningLead)}
              disabled={!selectedConsultant}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50"
            >
              确认分配
            </button>
          </div>
        </div>
      )}

      {/* 发送合同弹窗 */}
      {showContractForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowContractForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">发送合同</h3>
              <X className="h-6 w-6 text-slate-400 cursor-pointer" onClick={() => setShowContractForm(false)} />
            </div>
            <p className="text-xs text-slate-500">填写合同信息，发送给学员微信小程序查看并短信验证签署</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">姓名</label>
                <input value={contractName} onChange={e => setContractName(e.target.value)} placeholder="学员姓名" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">身份证号码</label>
                <div className="flex gap-2">
                  <input value={contractIdCard} onChange={e => setContractIdCard(e.target.value.replace(/[^0-9Xx]/g, '').slice(0, 18))} placeholder="18位身份证号码" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <button onClick={handleContractIdScan} disabled={contractIdCard.length !== 18} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 text-xs rounded-lg disabled:opacity-50 whitespace-nowrap">
                    <ScanLine className="h-3.5 w-3.5" /> 识别
                  </button>
                </div>
                {contractIdResult && (
                  <div className="mt-1 flex gap-3 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {contractIdResult.gender}</span>
                    <span>出生：{contractIdResult.birthday}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">课程</label>
                <select value={contractCourse} onChange={e => setContractCourse(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">选择课程</option>
                  <option value="月嫂初级班">月嫂初级班</option>
                  <option value="月嫂高级班">月嫂高级班</option>
                  <option value="育儿嫂培训班">育儿嫂培训班</option>
                  <option value="保姆技能班">保姆技能班</option>
                  <option value="老人护理班">老人护理班</option>
                  <option value="保洁培训班">保洁培训班</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">价格（元）</label>
                <input type="number" value={contractPrice} onChange={e => setContractPrice(e.target.value)} placeholder="培训费用" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={handleSendContract} disabled={!contractName || !contractIdCard || !contractCourse || !contractPrice} className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-1">
              <Mail className="h-4 w-4" /> 发送合同
            </button>
            <button onClick={() => setShowContractForm(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium">取消</button>
          </div>
        </div>
      )}
    </div>
  );
}

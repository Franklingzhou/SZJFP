'use client';

import React, { useState, useEffect } from 'react';
import { LEAD_STATUS_LABELS } from '@/lib/types';
import type { LeadStatus } from '@/lib/types';
import { mockRecruiterLeads } from '@/lib/data-service';
import type { RecruiterLead } from '@/lib/data-service';
import { initDataFromApi, createRecord, updateRecord, fetchData } from '@/lib/data-service';
import { Search, Plus, Phone, X, Send, Mail, ScanLine, User } from 'lucide-react';

type FollowFilter = 'all' | 'new' | 'following' | 'signed' | 'lost';

const FOLLOW_FILTER_LABELS: Record<FollowFilter, string> = {
  all: '全部',
  new: '新线索',
  following: '跟进中',
  signed: '已签约',
  lost: '流失',
};

// 跟进结果单选选项（2.0对齐）
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

export default function RecruiterFollowPage() {
  const [leads, setLeads] = useState<RecruiterLead[]>([...mockRecruiterLeads]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FollowFilter>('all');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [followRecords, setFollowRecords] = useState<Record<string, FollowRecord[]>>(initialFollowRecords);

  // 从API加载真实线索数据
  useEffect(() => {
    const loadLeads = async () => {
      await initDataFromApi();
      try {
        const res = await fetchData<{data: RecruiterLead[]}>('leads');
        if (res?.data && res.data.length > 0) {
          setLeads(res.data);
        }
      } catch {}
    };
    loadLeads();
  }, []);

  // 录线索表单
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadAge, setLeadAge] = useState('');
  const [leadOrigin, setLeadOrigin] = useState('');
  const [leadIntention, setLeadIntention] = useState('');
  const [leadNote, setLeadNote] = useState('');

  // 跟进内容输入
  const [showFollowRecord, setShowFollowRecord] = useState<string | null>(null);
  const [followContent, setFollowContent] = useState('');
  const [followResult, setFollowResult] = useState('');

  // 编辑线索
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editIntention, setEditIntention] = useState('');
  const [editRemark, setEditRemark] = useState('');

  // 发送合同表单
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractName, setContractName] = useState('');
  const [contractIdCard, setContractIdCard] = useState('');
  const [contractCourse, setContractCourse] = useState('');
  const [contractPrice, setContractPrice] = useState('');
  const [contractIdResult, setContractIdResult] = useState<{ gender: string; birthday: string } | null>(null);

  let filteredLeads = leads;
  if (search) filteredLeads = filteredLeads.filter(l => l.name.includes(search) || l.phone.includes(search));
  if (filter !== 'all') {
    if (filter === 'new') filteredLeads = filteredLeads.filter(l => l.status === 'new');
    else if (filter === 'following') filteredLeads = filteredLeads.filter(l => l.status === 'following');
    else if (filter === 'signed') filteredLeads = filteredLeads.filter(l => l.status === 'signed');
    else if (filter === 'lost') filteredLeads = filteredLeads.filter(l => l.status === 'lost');
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
    try {
      const result = await createRecord('leads', {
        name: leadName,
        phone: leadPhone,
        age: leadAge ? parseInt(leadAge) : null,
        origin: leadOrigin || null,
        intention: leadIntention || null,
        source: '门店',
        status: 'new',
        gender: '女',
      } as Record<string, unknown>);
      if (result?.success) {
        // 同时更新本地状态
        const newLead: RecruiterLead = {
          id: (result.data as Record<string, unknown>)?.id as string || `rl_new_${Date.now()}`,
          name: leadName,
          phone: leadPhone,
          age: leadAge ? parseInt(leadAge) : undefined,
          origin: leadOrigin || undefined,
          intention: leadIntention || undefined,
          source: '门店',
          status: 'new',
          level: 'C',
          recruiterId: 'r001',
          recruiterName: '陈招生',
          createdAt: new Date().toISOString().slice(0, 10),
          remark: leadNote || '',
        };
        setLeads(prev => [...prev, newLead]);
        alert(`线索已录入：${leadName} (${leadPhone})`);
        setShowLeadForm(false);
        setLeadName(''); setLeadPhone(''); setLeadAge(''); setLeadOrigin(''); setLeadIntention(''); setLeadNote('');
      } else {
        alert('录入失败：' + (result?.error || '请重试'));
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
    // 更新线索状态到API
    if (followResult) {
      setLeads(prev => prev.map(l => l.id === showFollowRecord ? { ...l, status: followResult as LeadStatus } : l));
      try {
        await updateRecord('leads', showFollowRecord, { status: followResult } as Record<string, unknown>);
      } catch {}
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
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'signed' as LeadStatus } : l));
        alert(`已签约！${lead.name} 的简历已自动创建，等待管理员审核。`);
        setSelectedLead(null);
      } else {
        alert('签约失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('签约失败，请重试');
    }
  };

  // 编辑线索
  const startEditLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    setEditingLeadId(leadId);
    setEditName(lead.name);
    setEditPhone(lead.phone);
    setEditAge(lead.age?.toString() || '');
    setEditOrigin(lead.origin || '');
    setEditIntention(lead.intention || '');
    setEditRemark(lead.remark || '');
  };

  const handleSaveEditLead = async () => {
    if (!editingLeadId || !editName || !editPhone) return;
    try {
      const result = await updateRecord('leads', editingLeadId, {
        name: editName,
        phone: editPhone,
        age: editAge ? parseInt(editAge) : null,
        origin: editOrigin || null,
        intention: editIntention || null,
        remark: editRemark || null,
      } as Record<string, unknown>);
      if (result?.success) {
        setLeads(prev => prev.map(l => l.id === editingLeadId ? {
          ...l,
          name: editName,
          phone: editPhone,
          age: editAge ? parseInt(editAge) : undefined,
          origin: editOrigin || undefined,
          intention: editIntention || undefined,
          remark: editRemark || '',
        } : l));
        setEditingLeadId(null);
      } else {
        alert('保存失败：' + (result?.error || '请重试'));
      }
    } catch {
      alert('保存失败，请重试');
    }
  };

  // 身份证自动识别（发送合同）
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
        <h1 className="text-lg font-semibold text-slate-800">跟进管理</h1>
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

      {/* 状态筛选：全部/新线索/跟进中/已成交/流失 */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {(Object.entries(FOLLOW_FILTER_LABELS) as [FollowFilter, string][]).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${filter === k ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-white text-slate-500 border border-slate-200'}`}>{v}</button>
        ))}
      </div>

      {/* 线索列表 */}
      <div className="space-y-2">
        {filteredLeads.map(l => (
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
              </div>
              <a href={`tel:${l.phone}`} onClick={e => e.stopPropagation()} className="p-2 rounded-lg bg-green-50 text-green-600"><Phone className="h-4 w-4" /></a>
            </div>
            {/* 签约/编辑按钮 - 电话下方 */}
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={e => { e.stopPropagation(); startEditLead(l.id); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200"
              >
                编辑
              </button>
              <button
                onClick={e => { e.stopPropagation(); handleSignLead(l.id); }}
                className={`text-xs px-3 py-1.5 rounded-lg ${l.status === 'signed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
              >
                {l.status === 'signed' ? '已签约' : '签约'}
              </button>
            </div>
            {/* 展开详情 - 左右两模块 */}
            {selectedLead === l.id && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex text-xs mb-1"><span className="text-slate-400 w-16">电话：</span><a href={`tel:${l.phone}`} className="text-blue-600">{l.phone}</a></div>
                <div className="flex text-xs mb-3"><span className="text-slate-400 w-16">意向：</span><span className="text-slate-700">{l.intention || '未选择'} · {l.origin || l.source} {l.age ? `· ${l.age}岁` : ''}</span></div>

                <div className="flex gap-3">
                  {/* 左侧：跟进内容 */}
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
                        <Mail className="h-3 w-3" /> 发送合同
                      </button>
                    </div>
                  </div>

                  {/* 右侧：跟进记录（缩小） */}
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
        ))}
        {filteredLeads.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-8">暂无线索</p>
        )}
      </div>

      {/* 录线索弹窗 */}
      {showLeadForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowLeadForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">录入招生线索</h3>
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
              <option value="保姆">保姆</option>
              <option value="月嫂">月嫂</option>
              <option value="育儿嫂">育儿嫂</option>
              <option value="护工">护工</option>
              <option value="保洁">保洁</option>
              <option value="钟点工">钟点工</option>
            </select>
            <input value={leadNote} onChange={e => setLeadNote(e.target.value)} placeholder="备注（来源等）" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <button onClick={handleAddLead} className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium">确认录入</button>
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
                <input
                  value={contractName}
                  onChange={e => setContractName(e.target.value)}
                  placeholder="学员姓名"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">身份证号码</label>
                <div className="flex gap-2">
                  <input
                    value={contractIdCard}
                    onChange={e => setContractIdCard(e.target.value.replace(/[^0-9Xx]/g, '').slice(0, 18))}
                    placeholder="18位身份证号码"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleContractIdScan}
                    disabled={contractIdCard.length !== 18}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 text-xs rounded-lg disabled:opacity-50 whitespace-nowrap"
                  >
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
                <select
                  value={contractCourse}
                  onChange={e => setContractCourse(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
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
                <input
                  type="number"
                  value={contractPrice}
                  onChange={e => setContractPrice(e.target.value)}
                  placeholder="培训费用"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleSendContract}
              disabled={!contractName || !contractIdCard || !contractCourse || !contractPrice}
              className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Mail className="h-4 w-4" /> 发送合同
            </button>
            <button onClick={() => setShowContractForm(false)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium">取消</button>
          </div>
        </div>
      )}
      {/* 编辑线索弹窗 */}
      {editingLeadId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setEditingLeadId(null)}>
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">编辑线索</h3>
              <button onClick={() => setEditingLeadId(null)} className="p-1"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs text-slate-500">姓名</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div><label className="text-xs text-slate-500">电话</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editPhone} onChange={e => setEditPhone(e.target.value)} /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-xs text-slate-500">年龄</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editAge} onChange={e => setEditAge(e.target.value)} /></div>
              </div>
              <div><label className="text-xs text-slate-500">籍贯</label><input className="w-full border rounded-lg px-3 py-2 text-sm" value={editOrigin} onChange={e => setEditOrigin(e.target.value)} /></div>
              <div><label className="text-xs text-slate-500">意向工种</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editIntention} onChange={e => setEditIntention(e.target.value)}>
                  <option value="">请选择</option><option value="保姆">保姆</option><option value="月嫂">月嫂</option><option value="钟点工">钟点工</option><option value="育婴师">育婴师</option><option value="护工">护工</option><option value="催乳师">催乳师</option><option value="厨娘">厨娘</option>
                </select>
              </div>
              <div><label className="text-xs text-slate-500">备注</label><textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={editRemark} onChange={e => setEditRemark(e.target.value)} /></div>
            </div>
            <button onClick={handleSaveEditLead} className="w-full py-3 bg-[#1e3a5f] text-white rounded-xl font-medium">保存</button>
            <button onClick={() => setEditingLeadId(null)} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-medium">取消</button>
          </div>
        </div>
      )}
    </div>
  );
}

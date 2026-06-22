'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers, mockOrders, mockReferrals, mockRecruiterLeads } from '@/lib/data-service';
import { initDataFromApi, createRecord, updateRecord } from '@/lib/data-service';
import { LEAD_STATUS_LABELS } from '@/lib/types';
import type { LeadStatus } from '@/lib/types';
import {
  Users, GraduationCap, DollarSign, ChevronRight, Plus,
  Star, FileText, UserPlus, Briefcase, Phone, X
} from 'lucide-react';

// 培训订单模拟数据
const mockTrainingOrders = [
  { id: 'to1', name: '月嫂初级班', student: '李阿姨', price: 2980, status: '进行中', startDate: '2025-01-08' },
  { id: 'to2', name: '育儿嫂技能提升班', student: '王姐', price: 1980, status: '已完成', startDate: '2024-12-20' },
  { id: 'to3', name: '保姆入门班', student: '张大姐', price: 980, status: '待开课', startDate: '2025-01-20' },
];

export default function RecruiterHomePage() {
  const router = useRouter();
  const { user } = useMiniApp();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);

  // 录线索表单
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadAge, setLeadAge] = useState('');
  const [leadOrigin, setLeadOrigin] = useState('');
  const [leadIntention, setLeadIntention] = useState('');
  const [leadNote, setLeadNote] = useState('');

  const myReferrals = mockReferrals.filter(r => r.referrerId === user?.id);
  const totalCommission = myReferrals.reduce((s, r) => s + r.commissionAmount, 0);
  const employedWorkers = mockWorkers.filter(w => w.creatorId === user?.id && w.status === 'busy');
  const monthlyLeads = mockRecruiterLeads.filter(l => l.createdAt >= '2025-01-01');

  const handleAddLead = async () => {
    if (!leadName || !leadPhone) return;
    const result = await createRecord('leads', {
      name: leadName,
      phone: leadPhone,
      age: leadAge ? Number(leadAge) : null,
      origin: leadOrigin || null,
      intention: leadIntention || null,
      note: leadNote || null,
      source: '手动录入',
      status: 'new',
      gender: '女',
    });
    if (result.success) {
      alert(`线索已录入：${leadName} (${leadPhone})`);
      await initDataFromApi(); // 刷新数据
    } else {
      alert('录入失败: ' + (result.error || '请重试'));
    }
    setShowLeadForm(false);
    setLeadName(''); setLeadPhone(''); setLeadAge(''); setLeadOrigin(''); setLeadIntention(''); setLeadNote('');
  };

  const handleSignLead = async (leadId: string) => {
    const lead = mockRecruiterLeads.find(l => l.id === leadId);
    if (!lead) return;
    if (lead.status === 'signed') {
      alert('该线索已签约');
      return;
    }
    if (!confirm(`确认将 ${lead.name} 签约？签约后将自动创建待审核简历。`)) return;
    try {
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
        await initDataFromApi();
        alert(`已签约！${lead.name} 的简历已自动创建，等待管理员审核。`);
      } else {
        alert('签约失败: ' + (result.error || '请重试'));
      }
      setSelectedLead(null);
    } catch {
      alert('签约失败，请重试');
    }
  };

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 头部概览 */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-4 text-white mb-4">
        <p className="text-sm opacity-90">招生 · {user?.name}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center cursor-pointer" onClick={() => {}}>
            <p className="text-xl font-bold">{monthlyLeads.length}</p>
            <p className="text-xs opacity-80">学员</p>
          </div>
          <div className="text-center cursor-pointer" onClick={() => {}}>
            <p className="text-xl font-bold">{employedWorkers.length}</p>
            <p className="text-xs opacity-80">上户</p>
          </div>
          <div className="text-center cursor-pointer" onClick={() => {}}>
            <p className="text-xl font-bold">¥{totalCommission}</p>
            <p className="text-xs opacity-80">本月佣金</p>
          </div>
        </div>
      </div>

      {/* 录入阿姨 */}
      <div className="bg-white rounded-xl shadow-sm mb-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">录入阿姨</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/m/recruiter/workers')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200"
          >
            <FileText className="h-4 w-4" /> 录简历
          </button>
          <button
            onClick={() => setShowLeadForm(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
          >
            <UserPlus className="h-4 w-4" /> 录线索
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">招生线索培训合格后，可一键转成正式简历</p>
      </div>

      {/* 合单大厅 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">合单大厅</h2>
          <button onClick={() => router.push('/m/recruiter/hall')} className="text-xs text-amber-600 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div
          onClick={() => router.push('/m/recruiter/hall')}
          className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 active:bg-amber-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-800">推荐阿姨，签约自动佣金</p>
              <p className="text-xs text-slate-500 mt-0.5">为合单订单推荐阿姨，获得15%佣金</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </div>
        </div>
      </div>

      {/* 线索列表 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">线索列表</h2>
          <button onClick={() => router.push('/m/recruiter/follow')} className="text-xs text-amber-600 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {mockRecruiterLeads.filter(l => l.status === 'following').map(lead => (
            <div
              key={lead.id}
              className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-slate-50"
              onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                  {lead.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{lead.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      lead.status === 'new' ? 'bg-slate-100 text-slate-600' :
                      lead.status === 'following' ? 'bg-blue-50 text-blue-600' :
                      lead.status === 'signed' ? 'bg-green-50 text-green-600' :
                      'bg-red-50 text-red-600'
                    }`}>{LEAD_STATUS_LABELS[lead.status]}</span>
                  </div>
                  <p className="text-xs text-slate-500">{lead.source} · {lead.remark}</p>
                </div>
                <Phone className="h-4 w-4 text-green-500" />
              </div>
              {/* 展开详情 */}
              {selectedLead === lead.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  <div className="flex text-xs"><span className="text-slate-400 w-16">电话：</span><span className="text-slate-700">{lead.phone}</span></div>
                  <div className="flex text-xs"><span className="text-slate-400 w-16">来源：</span><span className="text-slate-700">{lead.source}</span></div>
                  <div className="flex text-xs"><span className="text-slate-400 w-16">备注：</span><span className="text-slate-700">{lead.remark}</span></div>
                  <div className="flex text-xs"><span className="text-slate-400 w-16">日期：</span><span className="text-slate-700">{lead.createdAt}</span></div>
                  <div className="flex gap-2 mt-2">
                    <a href={`tel:${lead.phone}`} className="flex-1 py-2 bg-green-500 text-white text-xs rounded-lg text-center">呼叫</a>
                    {lead.status !== 'signed' && lead.status !== 'lost' && (
                      <button onClick={(e) => { e.stopPropagation(); handleSignLead(lead.id); }}
                        className="flex-1 py-2 bg-amber-500 text-white text-xs rounded-lg">签约</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 培训订单 */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">培训订单</h2>
        <div className="space-y-2">
          {mockTrainingOrders.map(to => (
            <div
              key={to.id}
              className="bg-white rounded-xl p-3 shadow-sm cursor-pointer active:bg-slate-50"
              onClick={() => setSelectedTraining(selectedTraining === to.id ? null : to.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{to.name}</p>
                  <p className="text-xs text-slate-500">学员：{to.student} · {to.startDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">¥{to.price}</p>
                  <span className={`text-xs ${to.status === '已完成' ? 'text-green-600' : to.status === '进行中' ? 'text-blue-600' : 'text-slate-400'}`}>
                    {to.status}
                  </span>
                </div>
              </div>
              {selectedTraining === to.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  <div className="flex text-xs"><span className="text-slate-400 w-16">课程：</span><span className="text-slate-700">{to.name}</span></div>
                  <div className="flex text-xs"><span className="text-slate-400 w-16">学员：</span><span className="text-slate-700">{to.student}</span></div>
                  <div className="flex text-xs"><span className="text-slate-400 w-16">费用：</span><span className="text-amber-600 font-medium">¥{to.price}</span></div>
                  <div className="flex text-xs"><span className="text-slate-400 w-16">开课：</span><span className="text-slate-700">{to.startDate}</span></div>
                  <div className="flex text-xs"><span className="text-slate-400 w-16">状态：</span><span className="text-slate-700">{to.status}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 推荐佣金 */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">推荐佣金</h2>
        {myReferrals.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl p-4 text-center">暂无推荐记录</p>
        ) : (
          <div className="space-y-2">
            {myReferrals.slice(0, 2).map(r => (
              <div key={r.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{r.orderTitle}</p>
                  <p className="text-xs text-slate-400">推荐：{r.workerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">¥{r.commissionAmount}</p>
                  <span className={`text-xs ${r.status === 'settled' ? 'text-green-600' : 'text-slate-400'}`}>
                    {r.status === 'settled' ? '已结算' : '待结算'}
                  </span>
                </div>
              </div>
            ))}
          </div>
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

    </div>
  );
}

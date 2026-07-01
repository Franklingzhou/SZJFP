'use client';

import React, { useState, useEffect } from 'react';
import { mockCustomers, mockWorkers, initDataFromApi, createRecord, updateRecord, refreshData, fetchData } from '@/lib/data-service';
import { useMiniApp } from '@/components/miniapp/context';
import AddCustomerForm from '@/components/miniapp/add-customer-form';
import { Phone, Plus, Search, Pencil, Send, MessageSquare } from 'lucide-react';

export default function AgentCustomersPage() {
  const { user } = useMiniApp();
  const [customers, setCustomers] = useState<typeof mockCustomers>(mockCustomers);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<typeof mockCustomers[0] | null>(null);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [followTarget, setFollowTarget] = useState<typeof mockCustomers[0] | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderCustomerId, setOrderCustomerId] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({ jobType: '保姆', salary: '', address: '', remark: '' });
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [followContent, setFollowContent] = useState('');
  const [followResult, setFollowResult] = useState('有意向');
  const [followRecords, setFollowRecords] = useState<Record<string, Array<{content: string; result: string; time: string}>>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // 初始化加载真实数据
  useEffect(() => {
    initDataFromApi().then(() => {
      setCustomers([...mockCustomers]);
      // 加载跟进记录
      loadAllFollowRecords();
    });
  }, []);

  const loadAllFollowRecords = async () => {
    try {
      const data = await fetchData<any[]>('customer-followups');
      if (data && Array.isArray(data)) {
        const records: Record<string, Array<{content: string; result: string; time: string}>> = {};
        data.forEach((f: any) => {
          const cid = f.customer_id || f.customerId;
          if (cid) {
            if (!records[cid]) records[cid] = [];
            records[cid].push({
              content: f.content || '',
              result: f.result || '',
              time: new Date(f.created_at || f.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
            });
          }
        });
        setFollowRecords(records);
      }
    } catch (e) { console.error('加载跟进记录失败:', e); }
  };

  const filtered = customers.filter(c => {
    return !search || c.name.includes(search) || c.phone.includes(search) || (c.requirement || '').includes(search);
  });

  const selected = customers.find(c => c.id === selectedCustomer);

  const handleCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${phone}`, '_self');
  };

  const handleEdit = (customer: typeof mockCustomers[0], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer({ ...customer });
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;
    setSavingEdit(true);
    try {
      const result = await updateRecord('customers', editingCustomer.id, {
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        requirement: editingCustomer.requirement,
        address: editingCustomer.address,
      } as Record<string, unknown>);
      if (result.success) {
        await refreshData();
        setCustomers([...mockCustomers]);
      } else {
        alert('保存失败：' + (result.error || '请重试'));
      }
    } catch (e) { alert('保存失败，请重试'); }
    finally { setSavingEdit(false); setEditingCustomer(null); }
  };

  const handleCreateOrder = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderCustomerId(customerId);
    setOrderForm({ jobType: '保姆', salary: '', address: '', remark: '' });
    setShowOrderForm(true);
  };

  const handleSubmitOrder = async () => {
    if (!orderCustomerId) return;
    setOrderSubmitting(true);
    try {
      const salaryParts = orderForm.salary.split('-').map(s => parseInt(s.trim()) || 0);
      const result = await createRecord('orders', {
        title: `${orderForm.jobType}服务`,
        job_type: orderForm.jobType,
        salary_min: salaryParts[0] || 5000,
        salary_max: salaryParts[1] || salaryParts[0] || 8000,
        location: orderForm.address || '待定',
        description: orderForm.remark || '',
        customer_id: orderCustomerId,
        status: 'open',
      } as Record<string, unknown>);
      if (result.success) {
        setOrderSuccess(true);
        setTimeout(() => {
          setShowOrderForm(false);
          setOrderSuccess(false);
          setOrderCustomerId(null);
        }, 1500);
      } else {
        alert('发单失败：' + (result.error || '请重试'));
      }
    } catch (e) { alert('发单失败，请重试'); }
    finally { setOrderSubmitting(false); }
  };

  return (
    <div className="px-4 pt-4">
      {/* 搜索 + 录入 */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索客户姓名/电话/需求"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 text-sm flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> 录客户
        </button>
      </div>

      {/* 客户列表 */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">暂无客户</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 cursor-pointer active:bg-slate-50"
              onClick={() => setSelectedCustomer(selectedCustomer === c.id ? null : c.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-lg">
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{c.name}</span>
                    <span className="text-xs text-slate-400">{c.phone}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">需求：{c.requirement ?? '暂无'}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setEditingCustomer({ ...c }); }} className="p-1" title="编辑资料">
                  <Pencil className="h-4 w-4 text-blue-500" />
                </button>
                <button onClick={(e) => handleCall(c.phone, e)} className="p-1" title="呼叫">
                  <Phone className="h-4 w-4 text-green-500" />
                </button>
              </div>

              {/* 展开详情 */}
              {selectedCustomer === c.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex text-xs">
                    <span className="text-slate-400 w-16">电话：</span>
                    <span className="text-slate-700">{c.phone}</span>
                  </div>
                  <div className="flex text-xs">
                    <span className="text-slate-400 w-16">需求：</span>
                    <span className="text-slate-700">{c.requirement ?? '暂无'}</span>
                  </div>
                  <div className="flex text-xs">
                    <span className="text-slate-400 w-16">地址：</span>
                    <span className="text-slate-700">{c.address ?? '暂无'}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); setFollowTarget({ ...c }); setShowFollowModal(true); }} className="flex-1 py-2 bg-blue-500 text-white text-xs rounded-lg flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3" /> 跟进内容
                    </button>
                    <button onClick={(e) => handleCreateOrder(c.id, e)} className="flex-1 py-2 bg-amber-500 text-white text-xs rounded-lg flex items-center justify-center gap-1">
                      <Send className="h-3 w-3" /> 一键发单
                    </button>
                  </div>
                  {/* 跟进记录 */}
                  {followRecords[c.id] && followRecords[c.id].length > 0 && (
                    <div className="mt-2 bg-slate-50 rounded-lg p-2">
                      <div className="text-xs text-slate-500 mb-1">跟进记录</div>
                      {followRecords[c.id].map((r, i) => (
                        <div key={i} className="text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-400">{r.time}</span> <span className="text-amber-600">[{r.result}]</span> {r.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddCustomerForm open={showAdd} onClose={() => setShowAdd(false)} onSubmitted={() => setShowAdd(false)} />

      {/* 客户资料编辑弹窗 */}
      {editingCustomer && !showFollowModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">编辑客户资料 - {editingCustomer.name}</h3>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 text-xl">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">姓名</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={editingCustomer.name} onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">电话</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={editingCustomer.phone} onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">需求</label>
                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} value={editingCustomer.requirement || ''} onChange={e => setEditingCustomer({ ...editingCustomer, requirement: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">地址</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={editingCustomer.address || ''} onChange={e => setEditingCustomer({ ...editingCustomer, address: e.target.value })} />
              </div>
            </div>
            <button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="w-full mt-4 bg-blue-500 text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
            >
              {savingEdit ? '保存中...' : '保存修改'}
            </button>
          </div>
        </div>
      )}

      {/* 跟进内容弹窗 */}
      {showFollowModal && followTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">跟进内容 - {followTarget.name}</h3>
              <button onClick={() => { setShowFollowModal(false); setFollowTarget(null); }} className="text-slate-400 text-xl">&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">跟进内容</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="请输入本次跟进内容..."
                  value={followContent}
                  onChange={e => setFollowContent(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-2 block">跟进结果</label>
                <div className="flex flex-wrap gap-2">
                  {['有意向', '跟进中', '已成交', '流失'].map(s => (
                    <button
                      key={s}
                      className={`px-3 py-1.5 rounded-full text-xs border ${followResult === s ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-200'}`}
                      onClick={() => setFollowResult(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={async () => {
                if (followContent.trim() && followTarget) {
                  const records = { ...followRecords };
                  if (!records[followTarget.id]) records[followTarget.id] = [];
                  const newRecord = {
                    content: followContent,
                    result: followResult,
                    time: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                  };
                  records[followTarget.id] = [newRecord, ...records[followTarget.id]];
                  setFollowRecords(records);
                  // 持久化到API
                  try {
                    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
                    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                    if (token) headers['x-session'] = token;
                    await fetch(`/api/customer-followups`, {
                      method: 'POST',
                      headers,
                      body: JSON.stringify({ customer_id: followTarget.id, content: followContent, result: followResult }),
                    });
                  } catch (e) { console.error('保存跟进记录失败:', e); }
                  setFollowContent('');
                  setFollowResult('有意向');
                  setShowFollowModal(false);
                  setFollowTarget(null);
                }
              }}
              className="w-full mt-4 bg-amber-500 text-white py-2.5 rounded-xl font-medium"
            >
              提交跟进
            </button>
          </div>
        </div>
      )}

      {/* 一键发单弹窗 */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">一键发单</h3>
              <button onClick={() => setShowOrderForm(false)} className="text-slate-400 text-xl">&times;</button>
            </div>
            {orderSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <Send className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-lg font-semibold text-green-600">发单成功！</p>
                <p className="text-sm text-slate-500 mt-1">订单已推送到阿姨接单大厅和合单大厅</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">工种</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={orderForm.jobType} onChange={e => setOrderForm({ ...orderForm, jobType: e.target.value })}>
                      <option>保姆</option><option>月嫂</option><option>育婴师</option><option>钟点工</option><option>保洁</option><option>护工</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">薪资（元/月）</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="如：6000-8000" value={orderForm.salary} onChange={e => setOrderForm({ ...orderForm, salary: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">工作地址</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="详细地址" value={orderForm.address} onChange={e => setOrderForm({ ...orderForm, address: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">备注要求</label>
                    <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="描述客户的具体需求" value={orderForm.remark} onChange={e => setOrderForm({ ...orderForm, remark: e.target.value })} />
                  </div>
                </div>
                <button onClick={handleSubmitOrder} disabled={orderSubmitting} className="w-full mt-4 bg-amber-500 text-white py-2.5 rounded-xl font-medium disabled:opacity-50">{orderSubmitting ? '发单中...' : '确认发单'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { mockWorkers, mockOrders, mockReferrals, mockHallOrders } from '@/lib/data-service';
import { WORKER_STATUS_LABELS, ORDER_STATUS_LABELS, JOB_TYPES } from '@/lib/types';
import AddCustomerForm from '@/components/miniapp/add-customer-form';
import {
  Users, ChevronRight, Plus, Copy, Send, Pencil, X,
  Briefcase, UserCheck, UserPlus, ClipboardList, FileText, UserCircle
} from 'lucide-react';

export default function AgentHomePage() {
  const router = useRouter();
  const { user } = useMiniApp();
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showPostOrder, setShowPostOrder] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // 页面获得焦点时刷新数据（从合单大厅返回时触发）
  React.useEffect(() => {
    const onFocus = async () => {
      const { refreshData } = await import('@/lib/data-service');
      await refreshData();
      setDataVersion(v => v + 1);
    };
    window.addEventListener('focus', onFocus);
    // 首次加载也刷新
    onFocus();
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // 发单表单
  const [orderTitle, setOrderTitle] = useState('');
  const [orderJobType, setOrderJobType] = useState('保姆');
  const [orderSalaryMin, setOrderSalaryMin] = useState('');
  const [orderSalaryMax, setOrderSalaryMax] = useState('');
  const [orderLocation, setOrderLocation] = useState('');
  const [orderDesc, setOrderDesc] = useState('');

  // 我的发单（dataVersion变化时重新计算）
  void dataVersion;
  const myApplications = mockHallOrders.filter(o => o.agentId === user?.id);
  const recentOrders = mockOrders.filter(o => o.agentId === user?.id).slice(0, 5);
  const myReferrals = mockReferrals.filter(r => r.referrerId === user?.id);
  const totalCommission = myReferrals.reduce((s, r) => s + r.commissionAmount, 0);

  // 空闲阿姨
  const freeWorkers = mockWorkers.filter(w => w.status === 'idle' || w.status === 'paused');

  const handlePostOrder = async () => {
    if (!orderTitle || !orderSalaryMin || !orderSalaryMax || !orderLocation) {
      alert('请填写完整订单信息');
      return;
    }
    try {
      const { createRecord, refreshData } = await import('@/lib/data-service');
      await createRecord('orders', {
        title: orderTitle,
        job_type: orderJobType,
        salary_min: Number(orderSalaryMin),
        salary_max: Number(orderSalaryMax),
        location: orderLocation,
        description: orderDesc,
        status: 'created',
      });
      await refreshData();
      alert('发单成功！已推送到阿姨接单大厅和合单大厅');
    } catch {
      alert('发单失败，请重试');
    }
    setShowPostOrder(false);
    setOrderTitle('');
    setOrderJobType('保姆');
    setOrderSalaryMin('');
    setOrderSalaryMax('');
    setOrderLocation('');
    setOrderDesc('');
  };

  const handleCopyOrder = (o: typeof mockOrders[0]) => {
    const text = `【家政招聘】${o.title}\n工种：${o.jobType}\n薪资：${o.salaryMin}-${o.salaryMax}元/月\n地点：${o.location}\n要求：${o.description}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('订单内容已复制，可粘贴到微信群发送');
    });
  };

  return (
    <div className="pb-20 px-4 pt-4">
      {/* 头部概览 */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl p-4 text-white mb-4">
        <p className="text-sm opacity-90">经纪人 · {user?.name}</p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center">
            <p className="text-xl font-bold">{myApplications.length}</p>
            <p className="text-xs opacity-80">我的发单</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">{recentOrders.length}</p>
            <p className="text-xs opacity-80">进行中订单</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold">¥{totalCommission}</p>
            <p className="text-xs opacity-80">推荐佣金</p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setShowPostOrder(true)}
          className="flex-1 bg-amber-600 text-white rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm active:bg-amber-700"
        >
          <Plus className="h-5 w-5" /> 一键发单
        </button>
        <button
          onClick={() => router.push('/m/agent/hall')}
          className="flex-1 bg-white border border-amber-300 text-amber-700 rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm active:bg-amber-50"
        >
          <ClipboardList className="h-5 w-5" /> 合单大厅
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => router.push('/m/agent/workers')}
          className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm active:bg-slate-50"
        >
          <UserPlus className="h-5 w-5" /> 录入阿姨
        </button>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-3 flex items-center justify-center gap-2 shadow-sm active:bg-slate-50"
        >
          <UserCircle className="h-5 w-5" /> 录入客户
        </button>
      </div>

      {/* 空闲阿姨 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">空闲阿姨</h2>
          <button onClick={() => router.push('/m/agent/workers')} className="text-xs text-amber-600 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {freeWorkers.slice(0, 5).map(w => (
            <button
              key={w.id}
              onClick={() => router.push(`/resume/${w.id}`)}
              className="flex-shrink-0 bg-white rounded-xl p-3 shadow-sm w-28 text-center"
            >
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-1 font-bold text-amber-700 text-sm">{w.name[0]}</div>
              <p className="text-xs font-medium text-slate-700 truncate">{w.name}</p>
              <p className="text-xs text-slate-400">{w.jobTypes.join('、')}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 最新订单 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">最新订单</h2>
          <button onClick={() => router.push('/m/agent/orders')} className="text-xs text-amber-600 flex items-center gap-1">
            查看全部 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400 bg-white rounded-xl p-4 text-center">暂无订单</p>
          ) : recentOrders.map(o => (
            <div key={o.id} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{o.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  o.status === 'signed' ? 'bg-blue-50 text-blue-700' :
                  o.status === 'completed' ? 'bg-green-50 text-green-700' :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {ORDER_STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{o.jobType} · {o.salaryMin}-{o.salaryMax}元/月</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setShowEditOrder(o.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-600 bg-blue-50"
                >
                  <Pencil className="h-3 w-3" /> 修改
                </button>
                <button
                  onClick={() => handleCopyOrder(o)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-amber-600 bg-amber-50"
                >
                  <Copy className="h-3 w-3" /> 复制转发
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 推荐佣金记录 */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">推荐佣金</h2>
        {myReferrals.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white rounded-xl p-4 text-center">暂无推荐记录</p>
        ) : (
          <div className="space-y-2">
            {myReferrals.slice(0, 3).map(r => (
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

      {/* 一键发单弹窗 */}
      {showPostOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowPostOrder(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">一键发单</h3>
              <X className="h-6 w-6 text-slate-400" onClick={() => setShowPostOrder(false)} />
            </div>
            <div>
              <label className="text-xs text-slate-500">订单标题 *</label>
              <input value={orderTitle} onChange={e => setOrderTitle(e.target.value)} placeholder="例：望京住家保姆" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">工种</label>
                <select value={orderJobType} onChange={e => setOrderJobType(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
                  {JOB_TYPES.map(j => <option key={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">地点 *</label>
                <input value={orderLocation} onChange={e => setOrderLocation(e.target.value)} placeholder="例：朝阳区望京" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">最低薪资(元/月) *</label>
                <input value={orderSalaryMin} onChange={e => setOrderSalaryMin(e.target.value)} placeholder="5000" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">最高薪资(元/月) *</label>
                <input value={orderSalaryMax} onChange={e => setOrderSalaryMax(e.target.value)} placeholder="8000" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">详细要求</label>
              <textarea value={orderDesc} onChange={e => setOrderDesc(e.target.value)} placeholder="请描述工作内容、要求等" className="w-full border rounded-lg px-3 py-2 text-sm mt-1 h-20" />
            </div>
            <button onClick={handlePostOrder} className="w-full bg-amber-600 text-white rounded-xl py-3 font-medium">
              确认发单
            </button>
            <p className="text-xs text-slate-400 text-center">发单后将推送到阿姨接单大厅和合单大厅</p>
          </div>
        </div>
      )}

      {/* 修改订单弹窗 */}
      {showEditOrder && (() => {
        const order = mockOrders.find(o => o.id === showEditOrder);
        if (!order) return null;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowEditOrder(null)}>
            <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">修改订单</h3>
                <X className="h-6 w-6 text-slate-400" onClick={() => setShowEditOrder(null)} />
              </div>
              <div>
                <label className="text-xs text-slate-500">订单标题</label>
                <input defaultValue={order.title} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500">最低薪资</label>
                  <input defaultValue={order.salaryMin} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">最高薪资</label>
                  <input defaultValue={order.salaryMax} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">地点</label>
                <input defaultValue={order.location} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">详细要求</label>
                <textarea defaultValue={order.description} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 h-20" />
              </div>
              <button onClick={() => { alert('订单修改成功'); setShowEditOrder(null); }} className="w-full bg-amber-600 text-white rounded-xl py-3 font-medium">
                保存修改
              </button>
            </div>
          </div>
        );
      })()}

      {/* 录入弹窗 */}
      <AddCustomerForm open={showAddCustomer} onClose={() => setShowAddCustomer(false)} onSubmitted={() => setShowAddCustomer(false)} />
    </div>
  );
}

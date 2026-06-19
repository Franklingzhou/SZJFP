'use client';

import React, { useState, useEffect } from 'react';
import { useMiniApp } from '@/components/miniapp/context';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Role, JobType } from '@/lib/types';
import { JOB_TYPES } from '@/lib/types';
import { Briefcase, MapPin, UserCheck, ChevronDown, ChevronUp, Plus, Copy, X, Check, Send, FileText, Edit3 } from 'lucide-react';

interface HallProps {
  currentRole: Role;
  currentUserId?: string; // 兼容旧调用，内部优先用context
}

export default function HallPage({ currentRole, currentUserId }: HallProps) {
  const { user } = useMiniApp();
  const userId = user?.id || currentUserId || '';

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Record<string, string>>({});
  const [showPublish, setShowPublish] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hall' | 'published' | 'recommended'>('hall');
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [showWorkerPicker, setShowWorkerPicker] = useState<string | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerJobFilter, setWorkerJobFilter] = useState<JobType | ''>('');

  // 发单表单
  const [title, setTitle] = useState('');
  const [jobType, setJobType] = useState<JobType>('保姆');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // 数据state
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [allRecommendations, setAllRecommendations] = useState<Array<{id:string;order_id:string;worker_id:string;recommender_id:string;status:string;rejection_reason?:string;created_at:string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [ordersRes, workersRes, recsRes] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/workers', { headers }),
        fetch('/api/recommendations?recommender_id=' + userId, { headers }),
      ]);

      const ordersData = await ordersRes.json();
      const workersData = await workersRes.json();
      const recsData = await recsRes.json();

      if (ordersData.data) setAllOrders(ordersData.data);
      if (workersData.data) setAllWorkers(workersData.data);
      if (recsData.data) setAllRecommendations(recsData.data);
    } catch (e) {
      console.error('合单大厅数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const reload = () => { loadData(); };

  // 合单大厅：未匹配的订单（没有worker_id且状态未完成/已关闭）
  const hallOrders = allOrders.filter(o => {
    const rec = o as unknown as Record<string, unknown>;
    return !rec.worker_id && o.status !== 'completed' && o.status !== 'cancelled';
  });

  // 推荐人可用的阿姨：归属自己或空闲的阿姨
  const availableWorkers = allWorkers.filter(
    (w) => (w as Record<string,unknown>).creator_id === userId || w.status === 'idle'
  );

  // 我的发单（经纪人自己发布的）
  const myPublishedOrders = allOrders.filter(o => {
    const rec = o as unknown as Record<string, unknown>;
    return rec.agent_id === userId;
  });

  // 我的推荐
  const myRecommendations = allRecommendations.filter(r => r.recommender_id === userId);

  // 也可以从orders中找到我推荐的（有worker_id且recommender_id是我）
  const myRecommendedOrders = allOrders.filter(o => {
    const rec = o as unknown as Record<string, unknown>;
    return myRecommendations.some(r => r.order_id === (o.id || rec.id));
  });

  const handleRecommend = (orderId: string, workerId: string) => {
    setSelectedWorker((prev) => ({ ...prev, [orderId]: workerId }));
  };

  const handleSubmitRecommend = async (orderId: string) => {
    const workerId = selectedWorker[orderId];
    if (!workerId) return;
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: orderId,
          worker_id: workerId,
          recommender_id: userId,
          status: 'pending',
          message: '',
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('推荐成功！已为订单推荐阿姨，签约后将自动计算推荐佣金。');
        await reload();
      } else {
        alert('推荐失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('推荐失败，请重试');
    }
  };

  const handleCopyOrder = (order: any) => {
    const jobType = String((order as Record<string,unknown>).job_type || order.jobType || '');
    const salaryMin = Number((order as Record<string,unknown>).salary_min || order.salaryMin || 0);
    const salaryMax = Number((order as Record<string,unknown>).salary_max || order.salaryMax || 0);
    const text = `【家政招聘】${order.title}\n工种：${jobType}\n薪资：${formatCurrency(salaryMin)}-${formatCurrency(salaryMax)}元/月\n地点：${order.location}\n要求：${order.description}\n——来自家政共创平台`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(order.id);
      setTimeout(() => setCopyToast(null), 2000);
    });
  };

  const handlePublish = async () => {
    if (!title || !salaryMin || !salaryMax || !location) {
      alert('请填写完整信息');
      return;
    }
    try {
      const token = localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title,
          job_type: jobType,
          salary_min: Number(salaryMin),
          salary_max: Number(salaryMax),
          location,
          description,
          agent_id: userId,
          status: 'created',
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('发单成功！已推送到阿姨接单大厅和合单大厅，可复制订单内容转发微信群。');
        setShowPublish(false);
        setTitle(''); setSalaryMin(''); setSalaryMax(''); setLocation(''); setDescription('');
        await reload();
      } else {
        alert('发单失败：' + (result.error || '请重试'));
      }
    } catch {
      alert('发单失败，请重试');
    }
  };

  // 顶部Tab配置
  const tabs: { key: 'hall' | 'published' | 'recommended'; label: string; show: boolean }[] = [
    { key: 'hall', label: '合单订单', show: true },
    { key: 'published', label: '我的发单', show: currentRole === 'agent' },
    { key: 'recommended', label: '我的推荐', show: true },
  ];
  const visibleTabs = tabs.filter(t => t.show);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <span className="font-bold text-lg">合单大厅</span>
          </div>
          {currentRole === 'agent' && (
            <button
              onClick={() => setShowPublish(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm"
            >
              <Plus className="h-4 w-4" /> 发单
            </button>
          )}
        </div>
        <p className="text-amber-100 text-sm">推荐阿姨，签约后自动归属佣金</p>
        <div className="flex gap-4 mt-3">
          <div className="text-center">
            <div className="text-xl font-bold">{hallOrders.length}</div>
            <div className="text-xs text-amber-100">待推荐订单</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{availableWorkers.length}</div>
            <div className="text-xs text-amber-100">可推荐阿姨</div>
          </div>
          {currentRole === 'agent' && (
            <div className="text-center">
              <div className="text-xl font-bold">{myPublishedOrders.length}</div>
              <div className="text-xs text-amber-100">我的发单</div>
            </div>
          )}
        </div>
      </div>

      {/* 顶部Tab切换 */}
      {visibleTabs.length > 1 && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 发单弹窗 */}
      {showPublish && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">一键发单</h2>
              <button onClick={() => setShowPublish(false)} className="p-1"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">发单后将同时推送到阿姨接单大厅和合单大厅</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">订单标题</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="如：急招月嫂" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">工种</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {JOB_TYPES.map(jt => (
                    <button key={jt} onClick={() => setJobType(jt)}
                      className={`px-3 py-1.5 rounded-full text-xs ${jobType === jt ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}
                    >{jt}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-slate-500">最低薪资</label>
                  <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="元/月" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500">最高薪资</label>
                  <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="元/月" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500">工作地点</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：北京市朝阳区" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-slate-500">需求描述</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="描述具体要求..." className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" />
              </div>
              <button onClick={handlePublish} className="w-full bg-amber-600 text-white rounded-xl py-3 text-sm font-medium">
                发布订单
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 复制提示 */}
      {copyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm z-50 shadow-lg flex items-center gap-1">
          <Check className="h-4 w-4" /> 已复制，可粘贴到微信群
        </div>
      )}

      {/* 合单订单Tab */}
      {activeTab === 'hall' && (
        <>
          {hallOrders.map((order) => {
            const isExpanded = expandedOrder === order.id;
            const selected = selectedWorker[order.id];
            const jobType = String((order as Record<string,unknown>).job_type || order.jobType || '');
            const salaryMinVal = Number((order as Record<string,unknown>).salary_min || order.salaryMin || 0);
            const salaryMaxVal = Number((order as Record<string,unknown>).salary_max || order.salaryMax || 0);
            const agentName = String((order as Record<string,unknown>).agent_name || (order as Record<string,unknown>).agent_id || '未知');

            return (
              <div key={order.id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  className="w-full px-4 py-3 text-left"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{order.title}</span>
                        <Badge variant="outline" className="text-xs">{jobType}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.location}
                        </span>
                        <span className="font-bold text-amber-600">
                          {formatCurrency(salaryMinVal)}-{formatCurrency(salaryMaxVal)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        发布人: {agentName}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t">
                    <p className="text-sm text-muted-foreground mt-3">{order.description}</p>

                    {/* 复制转发 */}
                    <button
                      onClick={() => handleCopyOrder(order)}
                      className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-amber-600 bg-amber-50 border border-amber-200"
                    >
                      <Copy className="h-3.5 w-3.5" /> 复制订单内容，转发微信群
                    </button>

                    {/* Recommend Worker - 选择阿姨 */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium">推荐阿姨</span>
                        </div>
                        <button
                          onClick={() => { setShowWorkerPicker(order.id); setWorkerSearch(''); setWorkerJobFilter(''); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-amber-600 bg-amber-50 border border-amber-200"
                        >
                          <Plus className="h-3.5 w-3.5" /> 选择阿姨
                        </button>
                      </div>

                      {/* 已选阿姨 */}
                      {selected && (() => {
                        const w = availableWorkers.find(wk => wk.id === selected);
                        if (!w) return null;
                        return (
                          <div className="flex items-center gap-3 p-2.5 rounded-lg border border-amber-500 bg-amber-50">
                            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                              {w.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{w.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {Number((w as Record<string,unknown>).experience_years || 0)}年经验 · {typeof w.specialties === 'string' ? w.specialties.split(',').slice(0, 2).join('、') : (Array.isArray(w.specialties) ? w.specialties.slice(0, 2).join('、') : '')}
                              </div>
                            </div>
                            <div className="text-xs font-bold text-amber-600 shrink-0">
                              {formatCurrency(Number((w as Record<string,unknown>).expected_salary_min || 0))}-{formatCurrency(Number((w as Record<string,unknown>).expected_salary_max || 0))}
                            </div>
                            <button onClick={() => setSelectedWorker(prev => { const n = {...prev}; delete n[order.id]; return n; })} className="p-1">
                              <X className="h-4 w-4 text-slate-400" />
                            </button>
                          </div>
                        );
                      })()}

                      {selected && (
                        <Button
                          className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => handleSubmitRecommend(order.id)}
                        >
                          确认推荐，签约后自动归属佣金
                        </Button>
                      )}
                    </div>

                    {/* Commission Hint */}
                    <div className="mt-3 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-xs text-blue-700">
                        推荐佣金规则：推荐阿姨签约成功后，你将获得订单佣金的
                        {currentRole === 'agent' ? ' 30%' : currentRole === 'recruiter' ? ' 15%' : ' 10%'}
                        作为推荐奖励，系统自动计算并入账。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {hallOrders.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无可推荐的订单</p>
            </div>
          )}
        </>
      )}

      {/* 我的发单Tab（仅经纪人） */}
      {activeTab === 'published' && currentRole === 'agent' && (
        <>
          {myPublishedOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无发单记录</p>
              <button
                onClick={() => setShowPublish(true)}
                className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm"
              >
                去发单
              </button>
            </div>
          ) : (
            myPublishedOrders.map(order => {
              const jobType = String((order as Record<string,unknown>).job_type || order.jobType || '');
              const salaryMinVal = Number((order as Record<string,unknown>).salary_min || order.salaryMin || 0);
              const salaryMaxVal = Number((order as Record<string,unknown>).salary_max || order.salaryMax || 0);
              return (
              <div key={order.id} className="bg-white rounded-xl border p-4">
                {editingOrder === order.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">订单标题</label>
                      <input defaultValue={order.title} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" id={`edit-title-${order.id}`} />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500">最低薪资</label>
                        <input defaultValue={salaryMinVal} type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" id={`edit-min-${order.id}`} />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500">最高薪资</label>
                        <input defaultValue={salaryMaxVal} type="number" className="w-full border rounded-lg px-3 py-2 text-sm mt-1" id={`edit-max-${order.id}`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">工作地点</label>
                      <input defaultValue={order.location} className="w-full border rounded-lg px-3 py-2 text-sm mt-1" id={`edit-loc-${order.id}`} />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">需求描述</label>
                      <textarea defaultValue={order.description} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm mt-1 resize-none" id={`edit-desc-${order.id}`} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingOrder(null)} className="flex-1 py-2 border rounded-lg text-sm text-slate-600">取消</button>
                      <button onClick={() => { setEditingOrder(null); setCopyToast('订单已修改'); setTimeout(() => setCopyToast(null), 2000); }} className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm">保存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{order.title}</span>
                      <Badge variant="outline" className="text-xs">{jobType}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{order.location}</span>
                      <span className="font-bold text-amber-600">{formatCurrency(salaryMinVal)}-{formatCurrency(salaryMaxVal)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-slate-500">等待推荐</span>
                      <button onClick={() => setEditingOrder(order.id)} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-600 bg-blue-50"><Edit3 className="h-3 w-3" /> 修改</button>
                      <button onClick={() => handleCopyOrder(order)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-amber-600 bg-amber-50"><Copy className="h-3 w-3" /> 复制转发</button>
                    </div>
                  </>
                )}
              </div>
              );
            })
          )}
        </>
      )}

      {/* 我的推荐Tab */}
      {activeTab === 'recommended' && (
        <>
          {myRecommendations.length === 0 && myRecommendedOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Send className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无推荐记录</p>
              <button
                onClick={() => setActiveTab('hall')}
                className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm"
              >
                去推荐阿姨
              </button>
            </div>
          ) : (
            <>
              {myRecommendations.map(r => {
                const order = allOrders.find(o => o.id === r.order_id);
                const worker = allWorkers.find(w => w.id === r.worker_id);
                return (
                  <div key={r.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{order?.title || '未知订单'}</p>
                      <p className="text-xs text-slate-500 mt-1">推荐：{worker?.name || r.worker_id}</p>
                      <p className="text-xs text-slate-400">佣金比例：{currentRole === 'agent' ? '30%' : currentRole === 'recruiter' ? '15%' : '10%'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs ${r.status === 'accepted' ? 'text-green-600' : r.status === 'rejected' ? 'text-red-500' : 'text-slate-400'}`}>
                        {r.status === 'accepted' ? '已接受' : r.status === 'rejected' ? '已拒绝' : r.status === 'pending' ? '待确认' : r.status}
                      </span>
                      {r.status === 'rejected' && r.rejection_reason && (
                        <p className="text-xs text-red-400 mt-0.5">理由：{r.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {myRecommendedOrders.map(o => {
                const workerId = String((o as Record<string,unknown>).worker_id || o.workerId || '');
                const w = allWorkers.find(wk => wk.id === workerId || (wk as unknown as Record<string, unknown>).userId === workerId);
                return (
                <div key={o.id} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{o.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        推荐阿姨: {w ? w.name : workerId}
                      </p>
                    </div>
                    <Badge className="text-xs bg-amber-100 text-amber-700">已推荐</Badge>
                  </div>
                </div>
                );
              })}
            </>
          )}
        </>
      )}

      {/* 选择阿姨弹窗 */}
      {showWorkerPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">选择阿姨</h2>
              <button onClick={() => setShowWorkerPicker(null)} className="p-1"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            {/* 搜索和筛选 */}
            <div className="px-4 py-2 border-b space-y-2">
              <input
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
                placeholder="搜索阿姨姓名..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setWorkerJobFilter('')}
                  className={cn('px-2.5 py-1 rounded-full text-xs', workerJobFilter === '' ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-50 text-slate-500 border border-slate-200')}
                >全部</button>
                {JOB_TYPES.map(jt => (
                  <button
                    key={jt}
                    onClick={() => setWorkerJobFilter(jt)}
                    className={cn('px-2.5 py-1 rounded-full text-xs', workerJobFilter === jt ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-50 text-slate-500 border border-slate-200')}
                  >{jt}</button>
                ))}
              </div>
            </div>
            {/* 阿姨列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {availableWorkers
                .filter(w => !workerSearch || w.name.includes(workerSearch))
                .filter(w => !workerJobFilter || (typeof w.job_types === 'string' ? w.job_types.includes(workerJobFilter) : (Array.isArray(w.jobTypes) ? w.jobTypes.includes(workerJobFilter) : false)))
                .map(w => {
                  const orderId = showWorkerPicker;
                  const isSelected = orderId ? selectedWorker[orderId] === w.id : false;
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        if (orderId) {
                          handleRecommend(orderId, w.id);
                          setShowWorkerPicker(null);
                        }
                      }}
                      className={cn(
                        'w-full p-3 rounded-xl text-left transition-colors',
                        isSelected ? 'ring-2 ring-amber-500 bg-amber-50' : 'bg-slate-50 hover:bg-slate-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 shrink-0">
                          {w.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{w.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {Number((w as Record<string,unknown>).experience_years || 0)}年经验 · {typeof w.specialties === 'string' ? w.specialties.split(',').slice(0, 2).join('、') : (Array.isArray(w.specialties) ? w.specialties.slice(0, 2).join('、') : '')}
                          </div>
                          <div className="text-xs text-amber-600 mt-0.5">{formatCurrency(Number((w as Record<string,unknown>).expected_salary_min || 0))}-{formatCurrency(Number((w as Record<string,unknown>).expected_salary_max || 0))}元/月</div>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-amber-500 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              {availableWorkers.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">暂无可推荐的阿姨</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

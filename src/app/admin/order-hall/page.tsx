'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Filter, MapPin, Clock, DollarSign, UserPlus, ArrowRight, ShoppingBag, Phone, X } from 'lucide-react';

interface Order {
  id: string;
  title: string | null;
  job_type: string | null;
  service_type: string | null;
  amount: number | null;
  location: string | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  start_date: string | null;
  work_duration: string | null;
  status: string;
  worker_id: string | null;
  signed_worker_id: string | null;
  agent_id: string | null;
  customer_id: string | null;
  created_at: string;
}

interface Worker {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  job_type: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待派单',
  assigned: '已分配',
  confirmed: '已确认',
  in_progress: '服务中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  assigned: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待派单' },
  { key: 'assigned', label: '已分配' },
  { key: 'in_progress', label: '服务中' },
  { key: 'completed', label: '已完成' },
];

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function maskPhone(phone: string): string {
  if (phone.length >= 7) return phone.slice(0, 3) + '****' + phone.slice(-4);
  return phone;
}

export default function OrderHallPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 分配阿姨弹窗
  const [showAssign, setShowAssign] = useState(false);
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusTab !== 'all') params.set('status', statusTab);

      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: getAuthHeaders(false),
      });
      const result = await res.json();
      if (result.data) {
        let filtered = result.data as Order[];
        // 前端搜索过滤
        if (searchText) {
          const kw = searchText.toLowerCase();
          filtered = filtered.filter(o =>
            (o.title || '').toLowerCase().includes(kw) ||
            (o.contact_name || '').toLowerCase().includes(kw) ||
            (o.location || '').toLowerCase().includes(kw) ||
            (o.id || '').toLowerCase().includes(kw) ||
            (o.service_type || '').toLowerCase().includes(kw) ||
            (o.job_type || '').toLowerCase().includes(kw)
          );
        }
        setOrders(filtered);
        // 清除已不存在的选中订单
        setSelectedOrder(prev => prev ? filtered.find(o => o.id === prev.id) || null : null);
      } else {
        setOrders([]);
        if (result.error) setError(result.error);
      }
    } catch (e) {
      console.error('加载订单失败:', e);
      setError('加载失败，请重试');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [searchText, statusTab]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // 打开分配阿姨弹窗
  const openAssign = async (order: Order) => {
    setAssignOrder(order);
    setShowAssign(true);
    setWorkerSearch('');
    setAssigning(false);
    // 加载可用阿姨列表
    try {
      const res = await fetch('/api/workers?status=available', {
        headers: getAuthHeaders(false),
      });
      const result = await res.json();
      if (result.data) {
        setWorkers(result.data);
      } else {
        setWorkers([]);
      }
    } catch {
      setWorkers([]);
    }
  };

  // 执行分配
  const handleAssign = async (workerId: string) => {
    if (!assignOrder) return;
    setAssigning(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: assignOrder.id,
          worker_id: workerId,
          status: 'assigned',
        }),
      });
      const result = await res.json();
      if (!result.success) {
        alert(result.error || '分配失败');
        return;
      }
      setShowAssign(false);
      setAssignOrder(null);
      loadOrders();
    } catch (e) {
      console.error('分配失败:', e);
      alert('分配失败');
    } finally {
      setAssigning(false);
    }
  };

  // 取消订单
  const handleCancel = async (orderId: string) => {
    if (!confirm('确定要取消此订单吗？')) return;
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: orderId, status: 'cancelled' }),
      });
      loadOrders();
    } catch (e) {
      console.error('取消失败:', e);
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const filteredWorkers = workers.filter(w =>
    !workerSearch ||
    w.name.toLowerCase().includes(workerSearch.toLowerCase()) ||
    (w.phone || '').includes(workerSearch)
  );

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">订单大厅</h1>
          <p className="text-sm text-muted-foreground mt-1">查看和分配待处理订单</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {pendingCount > 0 && (
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
              待派单: {pendingCount}
            </Badge>
          )}
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索订单标题、客户姓名、地址..."
                className="pl-10"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Filter className="h-4 w-4 text-slate-400" />
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusTab(tab.key)}
                  className={`px-3 py-1.5 rounded-full transition-all ${
                    statusTab === tab.key
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center text-red-500">
            <p>{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={loadOrders}>重试</Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && !error && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">加载中...</CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && orders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            暂无订单数据
          </CardContent>
        </Card>
      )}

      {/* 订单列表 */}
      {!loading && !error && orders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：订单卡片列表 */}
          <div className="space-y-3">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${
                  selectedOrder?.id === order.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-xs">
                        {order.service_type || order.job_type || '未分类'}
                      </Badge>
                      <span className="text-xs text-slate-400">{order.id?.slice(0, 12)}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900">
                      {order.title || order.contact_name || '未命名订单'}
                    </h3>
                    {order.contact_phone && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {maskPhone(order.contact_phone)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {order.amount != null && (
                      <div className="flex items-center gap-1 text-green-600 font-semibold">
                        <DollarSign className="h-4 w-4" />
                        <span>¥{order.amount}</span>
                      </div>
                    )}
                    <Badge className={`text-xs mt-1 ${STATUS_COLORS[order.status] || 'bg-slate-100'}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {order.location && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> {order.location}
                    </div>
                  )}
                  {order.start_date && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3.5 w-3.5" /> {formatDate(order.start_date)}
                      {order.work_duration && ` · ${order.work_duration}`}
                    </div>
                  )}
                  {order.description && (
                    <p className="text-slate-600 line-clamp-2 mt-2">{order.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-xs text-slate-400">创建于 {formatDate(order.created_at)}</span>
                  <span className="flex items-center gap-1 text-blue-600 text-xs">
                    查看详情 <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 右侧：订单详情 */}
          <div className="lg:sticky lg:top-4 h-fit">
            {selectedOrder ? (
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">订单详情</h2>
                    <Badge className={STATUS_COLORS[selectedOrder.status] || 'bg-slate-100'}>
                      {STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">基本信息</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">订单编号</span>
                        <span className="font-mono text-xs">{selectedOrder.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">标题</span>
                        <span className="font-medium">{selectedOrder.title || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">类型</span>
                        <span>{selectedOrder.service_type || selectedOrder.job_type || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">联系人</span>
                        <span>{selectedOrder.contact_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">联系电话</span>
                        <span>{selectedOrder.contact_phone ? maskPhone(selectedOrder.contact_phone) : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">服务信息</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">地址</span>
                        <span className="text-right ml-4">{selectedOrder.location || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">开始日期</span>
                        <span>{selectedOrder.start_date ? formatDate(selectedOrder.start_date) : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">时长</span>
                        <span>{selectedOrder.work_duration || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">金额</span>
                        <span className="font-medium text-green-600">
                          {selectedOrder.amount != null ? `¥${selectedOrder.amount}` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.description && (
                    <div>
                      <h3 className="text-xs font-medium text-slate-400 uppercase mb-2">需求描述</h3>
                      <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                        {selectedOrder.description}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    {selectedOrder.status === 'pending' && (
                      <>
                        <Button className="flex-1 gap-1" onClick={() => openAssign(selectedOrder)}>
                          <UserPlus className="h-4 w-4" /> 分配阿姨
                        </Button>
                        <Button variant="outline" className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => handleCancel(selectedOrder.id)}>
                          <X className="h-4 w-4" /> 取消订单
                        </Button>
                      </>
                    )}
                    {selectedOrder.status === 'assigned' && (
                      <Button variant="outline" className="flex-1" onClick={() => openAssign(selectedOrder)}>
                        <UserPlus className="h-4 w-4" /> 更换阿姨
                      </Button>
                    )}
                    {['completed', 'cancelled'].includes(selectedOrder.status) && (
                      <p className="text-sm text-slate-400">此订单已{STATUS_LABELS[selectedOrder.status]}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-slate-400">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-slate-200" />
                  <p>选择左侧订单查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 分配阿姨弹窗 */}
      <Dialog open={showAssign} onOpenChange={(open) => { if (!open) { setShowAssign(false); setAssignOrder(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>分配阿姨</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {assignOrder && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{assignOrder.title || assignOrder.service_type}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {assignOrder.location} · ¥{assignOrder.amount || 0}
                </p>
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10"
                placeholder="搜索阿姨姓名、手机号..."
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredWorkers.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">暂无可用阿姨</p>
              ) : (
                filteredWorkers.map(worker => (
                  <div
                    key={worker.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => !assigning && handleAssign(worker.id)}
                  >
                    <div>
                      <p className="font-medium text-sm">{worker.name}</p>
                      <p className="text-xs text-slate-400">
                        {worker.phone ? maskPhone(worker.phone) : ''} · {worker.job_type || '未分类'}
                      </p>
                    </div>
                    <Badge className={worker.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                      {worker.status === 'available' ? '空闲' : worker.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAssign(false); setAssignOrder(null); }} disabled={assigning}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, X, Check } from 'lucide-react';

interface HallOrder {
  id: string;
  title: string;
  job_type: string;
  salary_min: number;
  salary_max: number;
  location: string;
  description: string;
  service_type: string;
  created_at: string;
  agent_name: string;
}

interface AvailableWorker {
  id: string;
  name: string;
  phone: string;
  skills: string;
  job_types: string;
  work_experience: number | null;
  hometown: string;
  status: string;
}

type FilterTab = 'all' | string;

const JOB_TYPES = ['全部', '保洁', '月嫂', '育婴', '护工', '钟点工', '做饭', '收纳'];

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function HallPage() {
  const [orders, setOrders] = useState<HallOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // 推荐弹窗
  const [recommendModal, setRecommendModal] = useState<{ open: boolean; orderId: string }>({ open: false, orderId: '' });
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 选择阿姨弹窗
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [availableWorkers, setAvailableWorkers] = useState<AvailableWorker[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');
  const [workerJobFilter, setWorkerJobFilter] = useState<string>('all');

  // 复制反馈
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('job_type', activeTab);
      const res = await fetch(`/api/orders/hall?${params.toString()}`, {
        headers: getAuthHeaders(false),
      });
      const json = await res.json();
      if (json.data) setOrders(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 打开推荐弹窗时加载可用阿姨
  const openRecommendModal = async (orderId: string) => {
    setRecommendModal({ open: true, orderId });
    setSelectedWorkerId('');
    setNotes('');
    setWorkerSearch('');
    setWorkerJobFilter('all');
    setWorkersLoading(true);
    try {
      const res = await fetch('/api/workers?status=idle', {
        headers: getAuthHeaders(false),
      });
      const json = await res.json();
      if (json.data) setAvailableWorkers(json.data);
      else setAvailableWorkers([]);
    } catch {
      setAvailableWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!selectedWorkerId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          order_id: recommendModal.orderId,
          worker_id: selectedWorkerId,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success || res.ok) {
        alert('推荐成功');
        setRecommendModal({ open: false, orderId: '' });
        setSelectedWorkerId('');
        setNotes('');
        setShowWorkerPicker(false);
      } else {
        alert(json.error || '推荐失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyText = async (order: HallOrder) => {
    try {
      const text = [
        `【${order.job_type}】${order.title}`,
        order.salary_min && order.salary_max ? `薪资：${order.salary_min}-${order.salary_max}元` : order.salary_min ? `薪资：${order.salary_min}元起` : '薪资面议',
        order.location ? `地点：${order.location}` : '',
        order.service_type ? `服务类型：${order.service_type}` : '',
        order.description ? `要求：${order.description}` : '',
      ].filter(Boolean).join('\n');
      await navigator.clipboard.writeText(text);
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback for older browsers
      try {
        const textarea = document.createElement('textarea');
        const text = [
          `【${order.job_type}】${order.title}`,
          order.salary_min && order.salary_max ? `薪资：${order.salary_min}-${order.salary_max}元` : order.salary_min ? `薪资：${order.salary_min}元起` : '薪资面议',
          order.location ? `地点：${order.location}` : '',
          order.service_type ? `服务类型：${order.service_type}` : '',
          order.description ? `要求：${order.description}` : '',
        ].filter(Boolean).join('\n');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(order.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        alert('复制失败，请手动复制');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const statusColor = (jobType: string) => {
    const colors: Record<string, string> = {
      '保洁': 'bg-blue-100 text-blue-700',
      '月嫂': 'bg-pink-100 text-pink-700',
      '育婴': 'bg-purple-100 text-purple-700',
      '护工': 'bg-green-100 text-green-700',
      '钟点工': 'bg-orange-100 text-orange-700',
      '做饭': 'bg-yellow-100 text-yellow-700',
      '收纳': 'bg-teal-100 text-teal-700',
    };
    return colors[jobType] || 'bg-slate-100 text-slate-700';
  };

  // 提取阿姨列表中所有不重复工种
  const workerJobTypes = ['全部', ...Array.from(new Set(
    availableWorkers.flatMap(w => (w.job_types || w.skills || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean))
  ))];

  // 过滤阿姨列表
  const filteredWorkers = availableWorkers.filter(w => {
    const matchSearch = !workerSearch ||
      (w.name || '').toLowerCase().includes(workerSearch.toLowerCase()) ||
      (w.phone || '').includes(workerSearch);
    const matchJob = workerJobFilter === 'all' ||
      (w.job_types || w.skills || '').includes(workerJobFilter);
    return matchSearch && matchJob;
  });

  // 选中阿姨信息
  const selectedWorker = availableWorkers.find(w => w.id === selectedWorkerId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#1e3a5f]">订单大厅</h1>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          刷新
        </Button>
      </div>

      {/* 工种筛选 Tab */}
      <div className="flex gap-2 flex-wrap">
        {JOB_TYPES.map((type) => (
          <Button
            key={type}
            variant={activeTab === (type === '全部' ? 'all' : type) ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(type === '全部' ? 'all' : type)}
            className={activeTab === (type === '全部' ? 'all' : type) ? 'bg-[#1e3a5f]' : ''}
          >
            {type}
          </Button>
        ))}
      </div>

      {/* 订单列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无待匹配订单</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                {/* 标题行 + 工种标签 */}
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-[#1e3a5f] text-sm leading-5 flex-1">
                    {order.title}
                  </h3>
                  <Badge className={`ml-2 shrink-0 text-xs ${statusColor(order.job_type)}`}>
                    {order.job_type}
                  </Badge>
                </div>

                {/* 薪资范围 */}
                <div className="text-lg font-bold text-[#f59e0b]">
                  {order.salary_min && order.salary_max
                    ? `${order.salary_min}-${order.salary_max}元`
                    : order.salary_min
                    ? `${order.salary_min}元起`
                    : '薪资面议'}
                </div>

                {/* 信息行 */}
                <div className="space-y-1 text-xs text-slate-500">
                  {order.location && (
                    <div>📍 {order.location}</div>
                  )}
                  {order.service_type && (
                    <div>📋 {order.service_type}</div>
                  )}
                  {order.description && (
                    <div className="line-clamp-2">📝 {order.description}</div>
                  )}
                </div>

                {/* 底部：经纪人 + 时间 + 操作 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    <span>{order.agent_name}</span>
                    <span className="ml-2">{formatDate(order.created_at)}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2"
                      onClick={() => handleCopyText(order)}
                    >
                      {copiedId === order.id ? '已复制' : '复制文本'}
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 px-2 bg-[#1e3a5f]"
                      onClick={() => openRecommendModal(order.id)}
                    >
                      推荐阿姨
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 推荐阿姨弹窗 */}
      {recommendModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1e3a5f]">推荐阿姨</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => { setRecommendModal({ open: false, orderId: '' }); setShowWorkerPicker(false); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 已选阿姨信息 */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">选择阿姨</label>
              {selectedWorker ? (
                <div className="flex items-center gap-3 p-3 border-2 border-green-300 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">{selectedWorker.name}</div>
                    <div className="text-xs text-slate-500">
                      {selectedWorker.phone}
                      {selectedWorker.skills && <span className="ml-2">{selectedWorker.skills}</span>}
                      {selectedWorker.work_experience && <span className="ml-2">{selectedWorker.work_experience}年经验</span>}
                    </div>
                  </div>
                  <Check className="w-5 h-5 text-green-600" />
                  <button className="text-xs text-blue-600 hover:underline" onClick={() => { setSelectedWorkerId(''); setShowWorkerPicker(true); }}>
                    更换
                  </button>
                </div>
              ) : (
                <button
                  className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
                  onClick={() => setShowWorkerPicker(true)}
                >
                  + 点击选择阿姨
                </button>
              )}
            </div>

            {/* 推荐留言 */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">推荐留言</label>
              <Textarea
                placeholder="填写推荐留言（可选）"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRecommendModal({ open: false, orderId: '' }); setShowWorkerPicker(false); }}>
                取消
              </Button>
              <Button
                className="bg-[#1e3a5f]"
                disabled={!selectedWorkerId || submitting}
                onClick={handleRecommend}
              >
                {submitting ? '提交中...' : '确认推荐'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 选择阿姨子弹窗 */}
      {showWorkerPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl space-y-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1e3a5f]">选择阿姨</h3>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setShowWorkerPicker(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索姓名或电话..."
                className="pl-9"
                value={workerSearch}
                onChange={(e) => setWorkerSearch(e.target.value)}
              />
            </div>

            {/* 工种分类标签 */}
            <div className="flex gap-2 flex-wrap">
              {workerJobTypes.map((type) => (
                <Button
                  key={type}
                  variant={workerJobFilter === (type === '全部' ? 'all' : type) ? 'default' : 'outline'}
                  size="sm"
                  className={workerJobFilter === (type === '全部' ? 'all' : type) ? 'bg-[#1e3a5f]' : ''}
                  onClick={() => setWorkerJobFilter(type === '全部' ? 'all' : type)}
                >
                  {type}
                </Button>
              ))}
            </div>

            {/* 阿姨列表 */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {workersLoading ? (
                <div className="text-center py-8 text-slate-400">加载阿姨列表...</div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">暂无可用阿姨</div>
              ) : (
                filteredWorkers.map((w) => (
                  <div
                    key={w.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm ${
                      selectedWorkerId === w.id
                        ? 'border-green-400 bg-green-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => {
                      setSelectedWorkerId(w.id);
                      setShowWorkerPicker(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{w.name || '未知'}</span>
                          {w.status && (
                            <Badge className={`text-xs ${statusColor(w.status)}`}>{w.status}</Badge>
                          )}
                          {selectedWorkerId === w.id && (
                            <Check className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {w.phone && <span>{w.phone}</span>}
                          {w.work_experience && <span className="ml-3">{w.work_experience}年经验</span>}
                          {w.hometown && <span className="ml-3">籍贯: {w.hometown}</span>}
                        </div>
                        {(w.skills || w.job_types) && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {(w.job_types || w.skills || '').split(/[,，、]/).filter(Boolean).map((skill, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 底部 */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-xs text-slate-400">共 {filteredWorkers.length} 位阿姨</span>
              <Button variant="outline" size="sm" onClick={() => setShowWorkerPicker(false)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

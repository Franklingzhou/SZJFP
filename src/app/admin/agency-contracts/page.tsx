'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Search, Eye, CheckCircle, XCircle, FileText, Download } from 'lucide-react';

// 合同状态配置
const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-slate-100 text-slate-700' },
  signed: { label: '已签约', color: 'bg-blue-100 text-blue-700' },
  active: { label: '生效中', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已驳回', color: 'bg-red-100 text-red-700' },
};

// 列表项类型
interface AgencyContract {
  id: string;
  title: string;
  order_id: string;
  order_title?: string;
  party_a_id: string;
  party_a_name: string;
  party_b_id: string;
  party_b_name: string;
  party_b_phone: string;
  party_b_id_card: string;
  party_c_id: string;
  party_c_name: string;
  party_c_phone: string;
  amount: number;
  service_fee: number;
  start_date: string;
  end_date: string;
  status: string;
  agent_confirmed_at: string;
  agent_confirm_note: string;
  worker_confirmed_at: string;
  worker_confirm_note: string;
  reject_reason: string;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  title: string;
  customer_name?: string;
  salary_min: number;
  salary_max: number;
  location: string;
  status: string;
}

interface Worker {
  id: string;
  name: string;
  phone: string;
  status: string;
}

export default function AgencyContractsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<AgencyContract[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<AgencyContract | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 创建表单
  const [formData, setFormData] = useState({
    order_id: '',
    title: '',
    party_b_id: '',
    party_b_name: '',
    party_b_phone: '',
    party_b_id_card: '',
    party_c_name: '',
    party_c_phone: '',
    amount: '',
    service_fee: '',
    start_date: '',
    end_date: '',
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [contractsRes, ordersRes, workersRes] = await Promise.all([
        fetch('/api/agency-contracts'),
        fetch('/api/orders?status=open'),
        fetch('/api/workers?resume_review_status=approved'),
      ]);

      const contractsData = await contractsRes.json();
      const ordersData = await ordersRes.json();
      const workersData = await workersRes.json();

      if (contractsData.success) {
        setContracts(contractsData.data || []);
      }
      if (ordersData.data) {
        setOrders(ordersData.data);
      }
      if (workersData.data) {
        setWorkers(workersData.data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  // 搜索过滤
  const filteredContracts = contracts.filter(c => {
    const matchKeyword = !searchKeyword || 
      c.title?.includes(searchKeyword) || 
      c.party_b_name?.includes(searchKeyword) ||
      c.party_b_phone?.includes(searchKeyword);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchKeyword && matchStatus;
  });

  // 创建合同
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch('/api/agency-contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setFormData({
          order_id: '',
          title: '',
          party_b_id: '',
          party_b_name: '',
          party_b_phone: '',
          party_b_id_card: '',
          party_c_name: '',
          party_c_phone: '',
          amount: '',
          service_fee: '',
          start_date: '',
          end_date: '',
        });
        loadData();
      } else {
        alert(data.error || '创建失败');
      }
    } catch (err) {
      alert('创建失败');
    } finally {
      setActionLoading(false);
    }
  }

  // 签约确认操作
  async function handleSign(contract: AgencyContract, action: string) {
    if (!confirm('确认执行此操作？')) return;
    
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agency-contracts/${contract.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadData();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (err) {
      alert('操作失败');
    } finally {
      setActionLoading(false);
    }
  }

  // 选择订单后填充信息
  function handleOrderSelect(orderId: string) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setFormData(prev => ({
        ...prev,
        order_id: orderId,
        title: order.title,
        party_c_name: order.customer_name || '',
      }));
    }
  }

  // 选择阿姨后填充信息
  function handleWorkerSelect(workerId: string) {
    const worker = workers.find(w => w.id === workerId);
    if (worker) {
      setFormData(prev => ({
        ...prev,
        party_b_id: workerId,
        party_b_name: worker.name,
        party_b_phone: worker.phone,
      }));
    }
  }

  // 格式化金额
  function formatMoney(amount: number | string) {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '-' : `¥${num.toFixed(2)}`;
  }

  // 格式化日期
  function formatDate(date: string) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="text-slate-500 hover:text-slate-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-slate-800">中介合同管理</h1>
          </div>
          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
            经纪人专用
          </Badge>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* 工具栏 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label>搜索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="合同标题/乙方姓名/电话"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="w-[160px]">
                <Label>状态</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="signed">已签约</SelectItem>
                    <SelectItem value="active">生效中</SelectItem>
                    <SelectItem value="rejected">已驳回</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => setShowCreateModal(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                新建合同
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 合同列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              暂无合同数据
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-slate-800">{contract.title || '未命名合同'}</h3>
                        <Badge className={statusConfig[contract.status]?.color}>
                          {statusConfig[contract.status]?.label || contract.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                        <div>
                          <span className="text-slate-400">甲方：</span>
                          <span>{contract.party_a_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">乙方：</span>
                          <span>{contract.party_b_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">金额：</span>
                          <span>{formatMoney(contract.amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">服务费：</span>
                          <span>{formatMoney(contract.service_fee)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">起始：</span>
                          <span>{formatDate(contract.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">终止：</span>
                          <span>{formatDate(contract.end_date)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">经纪人确认：</span>
                          <span className={contract.agent_confirmed_at ? 'text-green-600' : 'text-slate-400'}>
                            {contract.agent_confirmed_at ? '✓' : '待确认'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">阿姨确认：</span>
                          <span className={contract.worker_confirmed_at ? 'text-green-600' : 'text-slate-400'}>
                            {contract.worker_confirmed_at ? '✓' : '待确认'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => {
                        setSelectedContract(contract);
                        setShowDetailModal(true);
                      }}>
                        <Eye className="h-4 w-4 mr-1" />
                        详情
                      </Button>
                      
                      {contract.status === 'draft' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-600"
                          onClick={() => handleSign(contract, 'agent_confirm')}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          我确认
                        </Button>
                      )}
                      
                      {contract.status === 'signed' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600"
                          onClick={() => handleSign(contract, 'activate')}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          生效
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 创建合同弹窗 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建中介合同</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>关联订单 <span className="text-red-500">*</span></Label>
              <Select value={formData.order_id} onValueChange={handleOrderSelect} required>
                <SelectTrigger>
                  <SelectValue placeholder="请选择订单" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map(order => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.title} - {order.customer_name || '客户'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>乙方（阿姨） <span className="text-red-500">*</span></Label>
              <Select value={formData.party_b_id} onValueChange={handleWorkerSelect} required>
                <SelectTrigger>
                  <SelectValue placeholder="请选择阿姨" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map(worker => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name} - {worker.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>合同金额</Label>
                <Input
                  type="number"
                  placeholder="服务费金额"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>服务费</Label>
                <Input
                  type="number"
                  placeholder="平台服务费"
                  value={formData.service_fee}
                  onChange={(e) => setFormData({ ...formData, service_fee: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>合同起始日期</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>合同终止日期</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>丙方姓名（可选）</Label>
                <Input
                  placeholder="客户姓名"
                  value={formData.party_c_name}
                  onChange={(e) => setFormData({ ...formData, party_c_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>丙方电话（可选）</Label>
                <Input
                  placeholder="客户电话"
                  value={formData.party_c_phone}
                  onChange={(e) => setFormData({ ...formData, party_c_phone: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button type="submit" disabled={actionLoading} className="bg-amber-500 hover:bg-amber-600">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 合同详情弹窗 */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>合同详情</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">合同标题</div>
                  <div className="font-medium">{selectedContract.title || '未命名'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">状态</div>
                  <Badge className={statusConfig[selectedContract.status]?.color}>
                    {statusConfig[selectedContract.status]?.label}
                  </Badge>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">甲方</div>
                  <div className="font-medium">{selectedContract.party_a_name}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">乙方</div>
                  <div className="font-medium">{selectedContract.party_b_name}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">乙方电话</div>
                  <div className="font-medium">{selectedContract.party_b_phone}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">合同金额</div>
                  <div className="font-medium text-amber-600">{formatMoney(selectedContract.amount)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">丙方</div>
                  <div className="font-medium">{selectedContract.party_c_name || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">丙方电话</div>
                  <div className="font-medium">{selectedContract.party_c_phone || '-'}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">合同期限</div>
                  <div className="font-medium">{formatDate(selectedContract.start_date)} ~ {formatDate(selectedContract.end_date)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded">
                  <div className="text-slate-500 mb-1">创建时间</div>
                  <div className="font-medium">{formatDate(selectedContract.created_at)}</div>
                </div>
              </div>

              {/* 确认状态 */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">签约确认状态</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className={cn('p-3 rounded', selectedContract.agent_confirmed_at ? 'bg-green-50' : 'bg-yellow-50')}>
                    <div className="text-slate-500 mb-1">经纪人确认</div>
                    <div className={selectedContract.agent_confirmed_at ? 'text-green-600' : 'text-yellow-600'}>
                      {selectedContract.agent_confirmed_at ? `✓ ${formatDate(selectedContract.agent_confirmed_at)}` : '待确认'}
                    </div>
                    {selectedContract.agent_confirm_note && (
                      <div className="text-xs text-slate-500 mt-1">{selectedContract.agent_confirm_note}</div>
                    )}
                  </div>
                  <div className={cn('p-3 rounded', selectedContract.worker_confirmed_at ? 'bg-green-50' : 'bg-yellow-50')}>
                    <div className="text-slate-500 mb-1">阿姨确认</div>
                    <div className={selectedContract.worker_confirmed_at ? 'text-green-600' : 'text-yellow-600'}>
                      {selectedContract.worker_confirmed_at ? `✓ ${formatDate(selectedContract.worker_confirmed_at)}` : '待确认'}
                    </div>
                    {selectedContract.worker_confirm_note && (
                      <div className="text-xs text-slate-500 mt-1">{selectedContract.worker_confirm_note}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailModal(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Search, Trash2, Eye, X, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

const SIGNING_STATUS_LABELS: Record<string, string> = {
  active: '生效中',
  replaced: '已替换',
  cancelled: '已取消',
};

const SIGNING_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  replaced: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-800',
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function OrderSigningsPage() {
  const [signings, setSignings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedSigning, setSelectedSigning] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSignings();
  }, []);

  const loadSignings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/order-signings', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.data) setSignings(data.data);
      else setSignings([]);
    } catch (e) {
      console.error('加载签约记录失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除该签约记录？')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/order-signings?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (result.ok) {
        setSignings(prev => prev.filter(s => s.id !== id));
      } else {
        alert('删除失败: ' + (result.error || '未知错误'));
      }
    } catch (e) {
      alert('删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = signings.filter(s => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchSearch = !search ||
      (s.order_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.worker_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.worker_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = signings.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">签约记录管理</h1>
          <p className="text-sm text-muted-foreground mt-1">查看和管理所有订单签约历史</p>
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={loadSignings}>
          <RefreshCw className="h-4 w-4" /> 刷新
        </Button>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索订单ID、阿姨ID..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {Object.entries(SIGNING_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v} ({statusCounts[k] || 0})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 数据概览卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{signings.length}</div>
            <div className="text-xs text-muted-foreground mt-1">签约总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts['active'] || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">生效中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-slate-500">{statusCounts['replaced'] || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">已替换</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{statusCounts['cancelled'] || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">已取消</div>
          </CardContent>
        </Card>
      </div>

      {/* 签约列表 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">暂无签约记录</CardContent></Card>
        ) : (
          filtered.map((s) => (
            <Card
              key={s.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={cn('text-xs', SIGNING_STATUS_COLORS[s.status] || 'bg-slate-100')}>
                        {SIGNING_STATUS_LABELS[s.status] || s.status}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700">
                        阿姨: {s.worker_name || s.worker_id || '-'}
                      </span>
                      <Link
                        href={`/admin/orders?detail=${s.order_id}`}
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" /> 订单: {s.order_id?.slice(0, 8)}...
                      </Link>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">薪资：</span>
                        <span className="font-medium">{s.worker_salary ? formatCurrency(s.worker_salary) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">合同期限：</span>
                        <span>{s.contract_start_date || '-'} ~ {s.contract_end_date || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">实际上岗：</span>
                        <span>{s.work_start_date || '-'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">签约时间：</span>
                        <span>{s.created_at?.slice(0, 10) || '-'}</span>
                      </div>
                    </div>
                    {s.replace_reason && (
                      <div className="mt-2 p-2 bg-amber-50 rounded text-sm text-amber-700">
                        换人原因：{s.replace_reason}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedSigning(s)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 详情弹窗 */}
      <Dialog open={!!selectedSigning} onOpenChange={() => setSelectedSigning(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>签约详情</DialogTitle>
          </DialogHeader>
          {selectedSigning && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">签约ID：</span>
                  <span className="font-mono text-xs">{selectedSigning.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  <Badge className={cn('text-xs', SIGNING_STATUS_COLORS[selectedSigning.status] || 'bg-slate-100')}>
                    {SIGNING_STATUS_LABELS[selectedSigning.status] || selectedSigning.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">订单ID：</span>
                  <Link href={`/admin/orders?detail=${selectedSigning.order_id}`} className="text-blue-600 hover:underline">
                    {selectedSigning.order_id?.slice(0, 12)}...
                  </Link>
                </div>
                <div>
                  <span className="text-muted-foreground">阿姨：</span>
                  <span>{selectedSigning.worker_name || selectedSigning.worker_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">薪资：</span>
                  <span>{selectedSigning.worker_salary ? formatCurrency(selectedSigning.worker_salary) : '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">实际上岗：</span>
                  <span>{selectedSigning.work_start_date || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">合同开始：</span>
                  <span>{selectedSigning.contract_start_date || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">合同结束：</span>
                  <span>{selectedSigning.contract_end_date || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">创建时间：</span>
                  <span>{selectedSigning.created_at}</span>
                </div>
                {selectedSigning.replace_reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">换人原因：</span>
                    <span className="text-amber-700">{selectedSigning.replace_reason}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSigning(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

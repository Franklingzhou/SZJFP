'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Gift, Plus, TrendingUp, User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PointRecord {
  id: string;
  user_id: string;
  action: string;
  points: number;
  related_order_id: string | null;
  created_at: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
  phone: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
};

export default function PointsPage() {
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // 新增积分弹窗
  const [showDialog, setShowDialog] = useState(false);
  const [formUserId, setFormUserId] = useState('');
  const [formAction, setFormAction] = useState('');
  const [formPoints, setFormPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // 统计
  const [totalPoints, setTotalPoints] = useState(0);
  const [todayPoints, setTodayPoints] = useState(0);

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/point-records?limit=500', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('API failed');
      const json = await res.json();
      const data = (json.data || []) as PointRecord[];
      setRecords(data);

      // 统计
      const allPoints = data.reduce((sum, r) => sum + r.points, 0);
      setTotalPoints(allPoints);
      const today = new Date().toISOString().split('T')[0];
      const todayTotal = data.filter(r => r.created_at?.startsWith(today)).reduce((sum, r) => sum + r.points, 0);
      setTodayPoints(todayTotal);
    } catch (e) {
      console.error('[points] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=500', { headers: getAuthHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      setUsers((json.data || json.users || []) as UserOption[]);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { loadRecords(); loadUsers(); }, [loadRecords, loadUsers]);

  const handleAdd = async () => {
    if (!formUserId || !formAction || formPoints === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/point-records', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: formUserId, action: formAction, points: formPoints }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '操作失败');
        return;
      }
      setShowDialog(false);
      setFormUserId('');
      setFormAction('');
      setFormPoints(0);
      await loadRecords();
    } catch (e) {
      alert('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.action?.toLowerCase().includes(s) || r.user_id?.toLowerCase().includes(s);
  });

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse text-slate-400">加载中...</div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">积分管理</h1>
        <p className="text-sm text-slate-500 mt-1">管理用户积分记录，支持手动增减积分</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><Gift className="h-5 w-5 text-amber-600" /></div>
            <div><div className="text-2xl font-bold">{totalPoints}</div><div className="text-xs text-slate-500">累计积分变动</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="h-5 w-5 text-green-600" /></div>
            <div><div className="text-2xl font-bold">{todayPoints}</div><div className="text-xs text-slate-500">今日积分变动</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><User className="h-5 w-5 text-blue-600" /></div>
            <div><div className="text-2xl font-bold">{records.length}</div><div className="text-xs text-slate-500">总记录数</div></div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="搜索行为或用户ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Button onClick={() => { setShowDialog(true); loadUsers(); }} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4 mr-1" />手动调整积分
        </Button>
      </div>

      {/* 积分记录表格 */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">用户ID</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">行为</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">积分变动</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">关联订单</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paged.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">暂无积分记录</td></tr>
              )}
              {paged.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.user_id}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{r.action}</Badge>
                  </td>
                  <td className={cn("px-4 py-3 text-right font-medium", r.points > 0 ? "text-green-600" : "text-red-600")}>
                    {r.points > 0 ? '+' : ''}{r.points}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{r.related_order_id || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">共 {filtered.length} 条记录</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
            <span className="flex items-center text-sm text-slate-500 px-2">第 {page}/{totalPages} 页</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      {/* 新增积分弹窗 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>手动调整积分</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择用户</Label>
              <Select value={formUserId} onValueChange={setFormUserId}>
                <SelectTrigger><SelectValue placeholder="选择用户..." /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role}) — {u.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>行为描述</Label>
              <Input placeholder="如：手动调整、活动奖励" value={formAction} onChange={e => setFormAction(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>积分变动（正数为增加，负数为扣减）</Label>
              <Input type="number" value={formPoints.toString()} onChange={e => setFormPoints(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={submitting || !formUserId || !formAction || formPoints === 0}>
              {submitting ? '提交中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

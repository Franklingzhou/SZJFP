'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Ban, UserCheck, Edit2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  worker: '阿姨',
  agent: '经纪人',
  recruiter: '招生',
  instructor: '讲师',
  customer: '客户',
  admin: '管理员',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
};

const REVIEW_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
  resigned: { label: '已离职', color: 'bg-slate-100 text-slate-800' },
};

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  review_status: string;
  is_active: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  register_source: string | null;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterReviewStatus, setFilterReviewStatus] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  // Dialogs
  const [rejectDialog, setRejectDialog] = useState<User | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [roleDialog, setRoleDialog] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    loadData();
  }, [page, filterRole, filterReviewStatus, filterActive]);

  async function loadData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (filterRole !== 'all') params.set('role', filterRole);
      if (filterReviewStatus !== 'all') params.set('review_status', filterReviewStatus);
      if (filterActive !== 'all') params.set('is_active', filterActive);

      const res = await fetch(`/api/admin/users?${params}`, { headers });
      const result = await res.json();
      if (result.data) {
        setUsers(result.data);
        setTotal(result.total || 0);
      } else {
        setUsers([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('加载用户失败:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId: string) {
    await updateUser(userId, { review_status: 'approved' });
  }

  async function handleReject() {
    if (!rejectDialog) return;
    await updateUser(rejectDialog.id, { review_status: 'rejected' });
    setRejectDialog(null);
    setRejectNote('');
  }

  async function handleDisable(userId: string) {
    await updateUser(userId, { is_active: false });
  }

  async function handleEnable(userId: string) {
    await updateUser(userId, { is_active: true, review_status: 'approved' });
  }

  async function handleChangeRole() {
    if (!roleDialog || !newRole) return;
    await updateUser(roleDialog.id, { role: newRole });
    setRoleDialog(null);
    setNewRole('');
  }

  async function updateUser(id: string, updates: Record<string, unknown>) {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ id, ...updates }),
      });
      const result = await res.json();
      if (!result.success) {
        alert('操作失败：' + (result.error || '请重试'));
        return;
      }
      loadData();
    } catch (err) {
      console.error('更新用户失败:', err);
      alert('操作失败，请重试');
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="text-sm text-muted-foreground">共 {total} 个用户</div>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm">角色:</Label>
          <Select value={filterRole} onValueChange={v => { setFilterRole(v); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">审核状态:</Label>
          <Select value={filterReviewStatus} onValueChange={v => { setFilterReviewStatus(v); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="pending">待审核</SelectItem>
              <SelectItem value="approved">已通过</SelectItem>
              <SelectItem value="rejected">已拒绝</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">启用状态:</Label>
          <Select value={filterActive} onValueChange={v => { setFilterActive(v); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="true">已启用</SelectItem>
              <SelectItem value="false">已停用</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>刷新</Button>
      </div>

      {/* 用户列表 */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600">姓名</th>
                <th className="text-left p-3 font-medium text-slate-600">手机号</th>
                <th className="text-left p-3 font-medium text-slate-600">角色</th>
                <th className="text-left p-3 font-medium text-slate-600">审核状态</th>
                <th className="text-left p-3 font-medium text-slate-600">启用</th>
                <th className="text-left p-3 font-medium text-slate-600">来源</th>
                <th className="text-left p-3 font-medium text-slate-600">注册时间</th>
                <th className="text-left p-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b hover:bg-slate-50">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-slate-600">{u.phone}</td>
                  <td className="p-3">
                    <Badge variant="outline">{ROLE_LABELS[u.role] || u.role}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={cn('text-xs', REVIEW_STATUS_MAP[u.review_status]?.color || 'bg-slate-100')}>
                      {REVIEW_STATUS_MAP[u.review_status]?.label || u.review_status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge className={cn('text-xs', u.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600')}>
                      {u.is_active ? '启用' : '停用'}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{u.register_source === 'admin' ? '后台录入' : '自助注册'}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {u.review_status === 'pending' && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => handleApprove(u.id)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> 通过
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => { setRejectDialog(u); setRejectNote(''); }}>
                            <XCircle className="h-3.5 w-3.5 mr-1" /> 拒绝
                          </Button>
                        </>
                      )}
                      {u.review_status === 'approved' && u.is_active && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600" onClick={() => handleDisable(u.id)}>
                          <Ban className="h-3.5 w-3.5 mr-1" /> 停用
                        </Button>
                      )}
                      {(!u.is_active || u.review_status === 'rejected') && (
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => handleEnable(u.id)}>
                          <UserCheck className="h-3.5 w-3.5 mr-1" /> 启用
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setRoleDialog(u); setNewRole(u.role); }}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> 角色
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">暂无用户</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
          <span className="text-sm text-slate-600">第 {page} / {totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
        </div>
      )}

      {/* 拒绝弹窗 */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝用户 - {rejectDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>拒绝理由（可选）</Label>
              <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="输入拒绝理由..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>取消</Button>
            <Button variant="destructive" onClick={handleReject}>确认拒绝</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改角色弹窗 */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改角色 - {roleDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>当前角色</Label>
              <p className="text-sm text-slate-600 mt-1">{ROLE_LABELS[roleDialog?.role || ''] || roleDialog?.role}</p>
            </div>
            <div>
              <Label>新角色</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog(null)}>取消</Button>
            <Button onClick={handleChangeRole}>确认修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

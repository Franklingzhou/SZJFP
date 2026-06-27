'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserCircle, Phone, Calendar, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Shield, Users, Briefcase, GraduationCap, Megaphone, Eye, UserCheck, ArrowRight } from 'lucide-react';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
  review_status: string;
  is_active: boolean;
  wechat_openid: string | null;
  created_at: string;
  updated_at: string | null;
  pending_role?: string | null;
  pending_role_status?: string | null;
}

type RoleTab = 'all' | 'pending' | 'admin' | 'agent' | 'customer' | 'worker' | 'instructor' | 'recruiter' | 'training_supervisor';

const ROLE_TABS: { key: RoleTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: '全部用户', icon: <Users className="h-4 w-4" />, color: 'bg-slate-600' },
  { key: 'pending', label: '待审核', icon: <Eye className="h-4 w-4" />, color: 'bg-yellow-500' },
  { key: 'admin', label: '管理员', icon: <Shield className="h-4 w-4" />, color: 'bg-red-500' },
  { key: 'agent', label: '经纪人', icon: <Briefcase className="h-4 w-4" />, color: 'bg-blue-500' },
  { key: 'customer', label: '客户', icon: <UserCircle className="h-4 w-4" />, color: 'bg-green-500' },
  { key: 'worker', label: '阿姨', icon: <UserCheck className="h-4 w-4" />, color: 'bg-orange-500' },
  { key: 'instructor', label: '讲师', icon: <GraduationCap className="h-4 w-4" />, color: 'bg-purple-500' },
  { key: 'recruiter', label: '招生', icon: <Megaphone className="h-4 w-4" />, color: 'bg-yellow-500' },
  { key: 'training_supervisor', label: '培训主管', icon: <Eye className="h-4 w-4" />, color: 'bg-indigo-500' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  agent: '经纪人',
  customer: '客户',
  worker: '阿姨',
  instructor: '讲师',
  recruiter: '招生',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  agent: 'bg-blue-100 text-blue-800',
  customer: 'bg-green-100 text-green-800',
  worker: 'bg-orange-100 text-orange-800',
  instructor: 'bg-purple-100 text-purple-800',
  recruiter: 'bg-yellow-100 text-yellow-800',
  training_supervisor: 'bg-indigo-100 text-indigo-800',
  worker_operator: 'bg-teal-100 text-teal-800',
};

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

function getUserStatusDisplay(user: User): { label: string; color: string } {
  if (!user.is_active && user.review_status === 'rejected') return { label: '已拒绝', color: 'bg-red-100 text-red-800' };
  if (!user.is_active && user.review_status === 'resigned') return { label: '已离职', color: 'bg-slate-100 text-slate-600' };
  if (!user.is_active) return { label: '已禁用', color: 'bg-gray-100 text-gray-700' };
  if (user.review_status === 'pending' && !user.pending_role) return { label: '待审核', color: 'bg-yellow-100 text-yellow-800' };
  if (user.pending_role_status === 'pending') return { label: '转岗审核中', color: 'bg-blue-100 text-blue-800' };
  return { label: '正常', color: 'bg-green-100 text-green-800' };
}

/** 判断是否属于待审核Tab（新注册审核 或 转岗审核） */
function isPendingUser(user: User): boolean {
  return user.review_status === 'pending' || user.pending_role_status === 'pending';
}

export default function RolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleTab, setRoleTab] = useState<RoleTab>('all');
  // A13: 拒绝原因弹窗
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; userId: string; userName: string; isTransfer: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: getAuthHeaders(false) });
      const result = await res.json();
      if (result.data) setUsers(result.data);
    } catch (e) {
      console.error('用户数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 审核通过：新注册 → PATCH /api/users/[id]，转岗 → POST /api/auth/role-transfer/approve
  const handleApprove = async (userId: string, isTransfer: boolean) => {
    const label = isTransfer ? '确认通过该用户的转岗申请？（通过后将自动封存原外部身份）' : '确认通过该用户的注册申请？';
    if (!confirm(label)) return;
    try {
      let res;
      if (isTransfer) {
        res = await fetch('/api/auth/role-transfer/approve', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ user_id: userId, action: 'approve' }),
        });
      } else {
        res = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ review_status: 'approved' }),
        });
      }
      const result = await res.json();
      if (result.success || result.user || result.message) {
        loadData();
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('审核失败:', e);
      alert('操作失败，请重试');
    }
  };

  // 拒绝：先弹窗收集原因
  const handleRejectClick = (userId: string, userName: string, isTransfer: boolean) => {
    setRejectReason('');
    setRejectDialog({ open: true, userId, userName, isTransfer });
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog) return;
    if (!rejectReason.trim()) {
      alert('请填写拒绝原因');
      return;
    }
    try {
      let res;
      if (rejectDialog.isTransfer) {
        res = await fetch('/api/auth/role-transfer/approve', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ user_id: rejectDialog.userId, action: 'reject', comment: rejectReason.trim() }),
        });
      } else {
        res = await fetch(`/api/users/${rejectDialog.userId}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ review_status: 'rejected', reject_reason: rejectReason.trim() }),
        });
      }
      const result = await res.json();
      if (result.success || result.user || result.message) {
        setRejectDialog(null);
        loadData();
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('拒绝失败:', e);
      alert('操作失败，请重试');
    }
  };

  // 禁用/启用：PUT /api/users
  const handleToggleActive = async (user: User) => {
    const newActive = !user.is_active;
    const label = newActive ? '启用' : '禁用';
    if (!confirm(`确认${label}用户"${user.name}"？`)) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: user.id, is_active: newActive }),
      });
      const result = await res.json();
      if (result.success) {
        loadData();
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('状态切换失败:', e);
      alert('操作失败，请重试');
    }
  };

  // 筛选
  const filtered = users.filter(u => {
    if (roleTab === 'pending') {
      if (!isPendingUser(u)) return false;
    } else if (roleTab !== 'all') {
      if (u.role !== roleTab) return false;
    }
    const matchSearch = !searchTerm ||
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const getRoleCount = (role: RoleTab) => {
    if (role === 'all') return users.length;
    if (role === 'pending') return users.filter(u => isPendingUser(u)).length;
    return users.filter(u => u.role === role).length;
  };

  const pendingCount = users.filter(u => isPendingUser(u)).length;

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">角色管理</h1>
        <p className="text-sm text-muted-foreground mt-1">管理用户角色、审核与账号状态</p>
      </div>

      {/* 搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索姓名、电话..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 角色Tab */}
      <div className="flex gap-2 flex-wrap">
        {ROLE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setRoleTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              roleTab === tab.key
                ? `${tab.color} text-white shadow-sm`
                : 'bg-white text-slate-600 border hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label} ({getRoleCount(tab.key)})
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 用户列表 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">暂无用户记录</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(user => {
            const statusDisplay = getUserStatusDisplay(user);
            const isNewRegistration = user.review_status === 'pending' && !user.pending_role;
            const isTransfer = user.pending_role_status === 'pending';
            const isPending = isNewRegistration || isTransfer;

            return (
              <Card key={user.id} className={`hover:shadow-md transition-shadow ${isPending ? 'ring-1 ring-yellow-300' : ''}`}>
                <CardContent className="p-5">
                  {/* 头部：姓名+角色+状态 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <UserCircle className="h-5 w-5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{user.name || '-'}</span>
                      <Badge className={`text-xs ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-800'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      <Badge className={`text-xs ${statusDisplay.color}`}>
                        {statusDisplay.label}
                      </Badge>
                    </div>
                  </div>

                  {/* 转岗方向指示 */}
                  {isTransfer && user.pending_role && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <Badge className={`text-xs ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-800'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-blue-500" />
                      <Badge className={`text-xs ${ROLE_COLORS[user.pending_role] || 'bg-blue-100 text-blue-800'}`}>
                        {ROLE_LABELS[user.pending_role] || user.pending_role}
                      </Badge>
                    </div>
                  )}

                  {/* 详情 */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{user.phone || '-'}</span>
                    </div>
                    {isNewRegistration && (
                      <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-0.5">
                        新注册 · 申请成为 {ROLE_LABELS[user.role] || user.role}
                      </div>
                    )}
                    {isTransfer && (
                      <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-0.5">
                        转岗申请 · {ROLE_LABELS[user.role] || user.role} → {user.pending_role ? ROLE_LABELS[user.pending_role] || user.pending_role : '?'}
                      </div>
                    )}
                    {(user as any).reject_reason && user.review_status === 'rejected' && (
                      <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mt-1">
                        拒绝原因：{(user as any).reject_reason}
                      </div>
                    )}
                  </div>

                  {/* 底部：时间+操作 */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      <span>{user.created_at?.slice(0, 10) || '-'}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {/* 待审核：通过/拒绝 */}
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50 h-7 px-2"
                            onClick={() => handleApprove(user.id, isTransfer)}
                          >
                            <CheckCircle2 className="h-3 w-3" /> 通过
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50 h-7 px-2"
                            onClick={() => handleRejectClick(user.id, user.name || '', isTransfer)}
                          >
                            <XCircle className="h-3 w-3" /> 拒绝
                          </Button>
                        </>
                      )}
                      {/* 非pending且审核通过的：禁用/启用 */}
                      {!isPending && user.review_status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7 px-2"
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? (
                            <>
                              <ToggleLeft className="h-3 w-3" /> 禁用
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-3 w-3 text-green-500" /> 启用
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 拒绝原因弹窗 */}
      {rejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {rejectDialog.isTransfer ? '拒绝转岗申请' : '拒绝注册申请'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {rejectDialog.isTransfer ? '拒绝' : '拒绝'}
              用户「<span className="font-medium text-slate-700">{rejectDialog.userName}</span>」的
              {rejectDialog.isTransfer ? '转岗' : '注册'}申请，请填写拒绝原因：
            </p>
            <textarea
              className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              rows={3}
              placeholder="请填写拒绝原因（必填）..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectDialog(null)}
              >
                取消
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRejectConfirm}
              >
                确认拒绝
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

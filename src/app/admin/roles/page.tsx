'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserCircle, Phone, Calendar, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Shield, Users, Briefcase, GraduationCap, Megaphone, Eye, UserCheck } from 'lucide-react';

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
}

type RoleTab = 'all' | 'admin' | 'agent' | 'customer' | 'worker' | 'instructor' | 'recruiter' | 'training_supervisor';

const ROLE_TABS: { key: RoleTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'all', label: '全部用户', icon: <Users className="h-4 w-4" />, color: 'bg-slate-600' },
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

const REVIEW_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
  resigned: { label: '已离职', color: 'bg-slate-100 text-slate-600' },
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
  if (user.review_status === 'pending') return { label: '待审核', color: 'bg-yellow-100 text-yellow-800' };
  return { label: '正常', color: 'bg-green-100 text-green-800' };
}

export default function RolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleTab, setRoleTab] = useState<RoleTab>('all');

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

  // 审核：PATCH /api/users/[id]
  const handleReview = async (userId: string, reviewStatus: 'approved' | 'rejected') => {
    const label = reviewStatus === 'approved' ? '通过' : '拒绝';
    if (!confirm(`确认${label}该用户的申请？`)) return;

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ review_status: reviewStatus }),
      });
      const result = await res.json();
      if (result.user || result.message) {
        loadData();
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('审核失败:', e);
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
    const matchRole = roleTab === 'all' || u.role === roleTab;
    const matchSearch = !searchTerm ||
      (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchRole && matchSearch;
  });

  const getRoleCount = (role: RoleTab) => {
    if (role === 'all') return users.length;
    return users.filter(u => u.role === role).length;
  };

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
            const reviewInfo = REVIEW_STATUS_MAP[user.review_status];
            const isPending = user.review_status === 'pending';

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

                  {/* 详情 */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      <span>{user.phone || '-'}</span>
                    </div>
                    {reviewInfo && user.review_status !== 'approved' && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <span>审核状态：{reviewInfo.label}</span>
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
                            onClick={() => handleReview(user.id, 'approved')}
                          >
                            <CheckCircle2 className="h-3 w-3" /> 通过
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50 h-7 px-2"
                            onClick={() => handleReview(user.id, 'rejected')}
                          >
                            <XCircle className="h-3 w-3" /> 拒绝
                          </Button>
                        </>
                      )}
                      {/* 非pending且有is_active的：禁用/启用 */}
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
    </div>
  );
}

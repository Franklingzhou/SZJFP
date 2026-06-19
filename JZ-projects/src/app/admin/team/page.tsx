'use client';

import React, { useState, useEffect } from 'react';
import { Search, Users, UserPlus, Shield, ShieldCheck, ShieldX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  admin: { label: '管理员', color: 'bg-purple-100 text-purple-800', icon: Shield },
  agent: { label: '经纪人', color: 'bg-blue-100 text-blue-800', icon: Users },
  recruiter: { label: '招生', color: 'bg-amber-100 text-amber-800', icon: UserPlus },
  instructor: { label: '讲师', color: 'bg-green-100 text-green-800', icon: ShieldCheck },
  training_supervisor: { label: '培训主管', color: 'bg-indigo-100 text-indigo-800', icon: Shield },
  worker_operator: { label: '阿姨运营', color: 'bg-pink-100 text-pink-800', icon: Users },
  worker: { label: '阿姨', color: 'bg-teal-100 text-teal-800', icon: Users },
  customer: { label: '客户', color: 'bg-slate-100 text-slate-800', icon: Users },
};

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.data) setUsers(data.data);
    } catch (e) {
      console.error('团队数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 筛选（排除admin和customer角色——这是内部团队管理）
  const teamRoles = ['agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator'];
  const teamUsers = users.filter((u: any) => teamRoles.includes(u.role));

  const filtered = teamUsers.filter((u: any) => {
    const matchSearch = !search || (u.name || '').includes(search) || (u.phone || '').includes(search);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts: Record<string, number> = { all: teamUsers.length };
  teamUsers.forEach((u: any) => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

  // 统计卡片
  const stats = teamRoles.map(role => ({
    role,
    ...ROLE_CONFIG[role],
    count: teamUsers.filter((u: any) => u.role === role).length,
    activeCount: teamUsers.filter((u: any) => u.role === role && u.is_active).length,
  }));

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">团队管理</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.role} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setRoleFilter(s.role)}>
              <CardContent className="p-4 text-center">
                <Icon className={cn('h-6 w-6 mx-auto mb-2', s.color.includes('blue') ? 'text-blue-600' : s.color.includes('amber') ? 'text-amber-600' : s.color.includes('green') ? 'text-green-600' : s.color.includes('indigo') ? 'text-indigo-600' : s.color.includes('pink') ? 'text-pink-600' : 'text-slate-600')} />
                <div className="text-2xl font-bold text-slate-800">{s.count}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
                <div className="text-xs text-green-600">{s.activeCount} 在职</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="搜索姓名/电话..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* 角色Tab */}
      <div className="flex flex-wrap gap-2">
        <Button variant={roleFilter === 'all' ? 'default' : 'outline'} size="sm"
          onClick={() => setRoleFilter('all')}
          className={roleFilter === 'all' ? 'bg-slate-800' : ''}>
          全部 ({roleCounts['all'] || 0})
        </Button>
        {teamRoles.map(role => (
          <Button key={role} variant={roleFilter === role ? 'default' : 'outline'} size="sm"
            onClick={() => setRoleFilter(role)}
            className={roleFilter === role ? 'bg-slate-800' : ''}>
            {ROLE_CONFIG[role]?.label || role} ({roleCounts[role] || 0})
          </Button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无团队成员</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u: any) => {
            const rc = ROLE_CONFIG[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-500' };
            const Icon = rc.icon;
            return (
              <Card key={u.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                    <Badge className={cn('text-xs', rc.color)}>{rc.label}</Badge>
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                    {u.phone && <div>电话: {u.phone}</div>}
                    <div className="flex items-center gap-2">
                      <span>状态:</span>
                      {u.is_active ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">在职</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 text-xs">停用</Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">{u.created_at?.slice(0, 10)}</div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {u.is_active && u.role !== 'admin' && (
                      <Button size="sm" variant="outline" className="text-red-600" onClick={async () => {
                        if (!confirm(`确定停用 ${u.name}？`)) return;
                        await fetch('/api/users', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: u.id, is_active: false }) });
                        loadData();
                      }}>
                        <ShieldX className="h-3.5 w-3.5 mr-1" />停用
                      </Button>
                    )}
                    {!u.is_active && (
                      <Button size="sm" variant="outline" className="text-green-600" onClick={async () => {
                        await fetch('/api/users', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: u.id, is_active: true }) });
                        loadData();
                      }}>
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />启用
                      </Button>
                    )}
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

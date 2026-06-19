'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  ClipboardList,
  FilePenLine,
  MessageSquare,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  PhoneCall,
  UserCircle,
  Handshake,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface DashboardData {
  totalWorkers: number;
  pendingMatchOrders: number;
  todayLeads: number;
  pendingResumeReviews: number;
  pendingUserReviews: number;
  monthlySignings: number;
  totalUsers: number;
  pendingRecommendations: number;
  roleCounts: Record<string, number>;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  agent: '经纪人',
  worker: '阿姨',
  customer: '客户',
  instructor: '讲师',
  recruiter: '招生',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (e) {
      console.error('[dashboard] load error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-20 mb-3" />
                  <div className="h-8 bg-slate-200 rounded w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const d = data || {
    totalWorkers: 0, pendingMatchOrders: 0, todayLeads: 0,
    pendingResumeReviews: 0, pendingUserReviews: 0, monthlySignings: 0,
    totalUsers: 0, pendingRecommendations: 0, roleCounts: {},
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <p className="text-sm text-muted-foreground mt-1">平台核心数据概览</p>
      </div>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">今日新增线索</p>
                <p className="text-3xl font-bold mt-1">{d.todayLeads}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50">
                <PhoneCall className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">待匹配订单</p>
                <p className="text-3xl font-bold mt-1">{d.pendingMatchOrders}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <ClipboardList className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">在职阿姨</p>
                <p className="text-3xl font-bold mt-1">{d.totalWorkers}</p>
              </div>
              <div className="p-3 rounded-xl bg-green-50">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-l-4 border-l-indigo-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">本月签约</p>
                <p className="text-3xl font-bold mt-1">{d.monthlySignings}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 待审核提醒 + 快捷入口 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 待审核提醒 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              待审核提醒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.pendingResumeReviews > 0 && (
                <Link href="/admin/audits" className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <FilePenLine className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium">待审核简历</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-200 text-amber-800 hover:bg-amber-200">{d.pendingResumeReviews}</Badge>
                    <ArrowRight className="h-4 w-4 text-amber-600" />
                  </div>
                </Link>
              )}
              {d.pendingUserReviews > 0 && (
                <Link href="/admin/roles" className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">待审核用户</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-200 text-blue-800 hover:bg-blue-200">{d.pendingUserReviews}</Badge>
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </Link>
              )}
              {d.pendingRecommendations > 0 && (
                <Link href="/admin/recommendations" className="flex items-center justify-between p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <Handshake className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium">待审核推荐</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-200 text-purple-800 hover:bg-purple-200">{d.pendingRecommendations}</Badge>
                    <ArrowRight className="h-4 w-4 text-purple-600" />
                  </div>
                </Link>
              )}
              {d.pendingResumeReviews === 0 && d.pendingUserReviews === 0 && d.pendingRecommendations === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">暂无待审核项</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 快捷入口 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-500" />
              快捷操作
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/leads">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <PhoneCall className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">新建线索</p>
                    <p className="text-xs text-muted-foreground">录入客户线索</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/orders">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">新建订单</p>
                    <p className="text-xs text-muted-foreground">发布家政需求</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/clients">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-green-100">
                    <UserCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">新建客户</p>
                    <p className="text-xs text-muted-foreground">添加客户信息</p>
                  </div>
                </div>
              </Link>
              <Link href="/admin/recommendations">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Handshake className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">推荐阿姨</p>
                    <p className="text-xs text-muted-foreground">为订单推荐</p>
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 角色分布 + 平台概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 角色分布 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">角色分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(d.roleCounts).map(([role, count]) => {
                const pct = d.totalUsers > 0 ? Math.round((count / d.totalUsers) * 100) : 0;
                const colors: Record<string, string> = {
                  admin: 'bg-indigo-500', agent: 'bg-blue-500', worker: 'bg-amber-500',
                  customer: 'bg-green-500', instructor: 'bg-purple-500',
                  recruiter: 'bg-pink-500', training_supervisor: 'bg-cyan-500',
                  worker_operator: 'bg-orange-500',
                };
                return (
                  <div key={role} className="flex items-center gap-3">
                    <span className="text-sm w-20 text-muted-foreground">{ROLE_LABELS[role] || role}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div className={`${colors[role] || 'bg-slate-400'} rounded-full h-4 transition-all`} style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                    <span className="text-sm font-medium w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 平台数据概览 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">平台数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-slate-800">{d.totalUsers}</p>
                <p className="text-sm text-muted-foreground mt-1">总用户数</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-slate-800">{d.totalWorkers}</p>
                <p className="text-sm text-muted-foreground mt-1">阿姨总数</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-slate-800">{d.pendingMatchOrders}</p>
                <p className="text-sm text-muted-foreground mt-1">待匹配订单</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-3xl font-bold text-slate-800">{d.monthlySignings}</p>
                <p className="text-sm text-muted-foreground mt-1">本月签约</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

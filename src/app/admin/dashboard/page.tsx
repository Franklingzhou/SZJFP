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
  Award,
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
  leadFunnel: Record<string, number>;
  workerLifecycle: Record<string, number>;
  topAgentsRanking: { id: string; name: string; count: number }[];
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
    leadFunnel: {}, workerLifecycle: {}, topAgentsRanking: [],
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

      {/* ======== 转化漏斗 + 阿姨生命周期 ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              线索转化漏斗
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const funnel = d.leadFunnel || {};
                const maxCount = Math.max(1, ...Object.values(funnel));
                return [
                  { key: 'new', label: '新线索', color: 'bg-blue-500' },
                  { key: 'following', label: '跟进中', color: 'bg-amber-500' },
                  { key: 'signed', label: '已签约', color: 'bg-green-500' },
                  { key: 'converted', label: '已转化', color: 'bg-emerald-600' },
                  { key: 'lost', label: '已流失', color: 'bg-slate-400' },
                ].map(stage => {
                  const count = funnel[stage.key] || 0;
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={stage.key} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-14">{stage.label}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${stage.color} transition-all flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(pct, 5)}%`, minWidth: count > 0 ? '30px' : '0' }}
                        >
                          {count > 0 && <span className="text-xs text-white font-medium">{count}</span>}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              阿姨状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'available', label: '空闲可接', color: 'text-green-600', bg: 'bg-green-50' },
                { key: 'busy', label: '上户中', color: 'text-blue-600', bg: 'bg-blue-50' },
                { key: 'pending', label: '待审核', color: 'text-amber-600', bg: 'bg-amber-50' },
                { key: 'paused', label: '已暂停', color: 'text-orange-600', bg: 'bg-orange-50' },
                { key: 'inactive', label: '已停用', color: 'text-slate-500', bg: 'bg-slate-100' },
                { key: 'suspended', label: '已封存', color: 'text-red-500', bg: 'bg-red-50' },
              ].map(item => {
                const count = d.workerLifecycle?.[item.key] || 0;
                return (
                  <div key={item.key} className={`flex items-center justify-between p-3 rounded-lg ${item.bg}`}>
                    <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
                    <span className={`text-lg font-bold ${item.color}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======== 经纪人排行 + 推荐转化 ======== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-yellow-500" />
              经纪人订单排行
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!d.topAgentsRanking || d.topAgentsRanking.length === 0) ? (
              <div className="text-center py-4 text-slate-400 text-sm">暂无数据</div>
            ) : (
              <div className="space-y-2">
                {d.topAgentsRanking.map((agent, i) => (
                  <div key={agent.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300 text-slate-600'
                    }`}>{i + 1}</span>
                    <span className="flex-1 text-sm font-medium">{agent.name || agent.id?.substring(0, 8)}</span>
                    <span className="text-sm text-slate-500">{agent.count} 单</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Handshake className="h-4 w-4 text-purple-500" />
              推荐转化概览
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center py-4">
              <div>
                <p className="text-3xl font-bold text-purple-700">{d.leadFunnel?.new || 0}</p>
                <p className="text-xs text-slate-500 mt-1">新线索</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-700">{d.leadFunnel?.converted || 0}</p>
                <p className="text-xs text-slate-500 mt-1">已转化</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-700">
                  {d.leadFunnel?.new > 0 ? Math.round(((d.leadFunnel?.converted || 0) / d.leadFunnel?.new) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-500 mt-1">转化率</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 角色分布 + 平台数据 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

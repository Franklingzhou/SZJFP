'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Award, RefreshCw, Star, TrendingUp, Shield, DollarSign, ArrowUp } from 'lucide-react';

interface Tier {
  id: string;
  name: string;
  level: number;
  min_orders: number;
  min_rating: number;
  min_reorder_rate: number;
  hourly_premium: number;
  priority: boolean;
  deposit_reduction: number;
  badge_color: string;
}

interface WorkerTier {
  id: string;
  name: string;
  status: string;
  completed_orders: number;
  avg_rating: number;
  reorder_rate: number;
  current_tier: Tier | null;
  auto_tier: Tier | null;
  need_update: boolean;
}

export default function TiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [workers, setWorkers] = useState<WorkerTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function getAuthHeaders() {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    return { 'Content-Type': 'application/json', 'x-session': token || '' };
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/worker-tiers', { headers });
      const json = await res.json();
      setTiers(json.tiers || []);
      setWorkers(json.workers || []);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const headers = getAuthHeaders();
      await fetch('/api/worker-tiers', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'refresh' }),
      });
      await fetchData();
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const tierIcons = [Award, Star, Shield, TrendingUp];

  if (loading) return <div className="p-6 text-slate-400">加载中...</div>;

  const needUpdateCount = workers.filter(w => w.need_update).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">阿姨等级体系</h1>
          <p className="text-sm text-slate-500 mt-1">等级联动时薪加成、优先派单、保证金减免</p>
        </div>
        <div className="flex gap-2">
          {needUpdateCount > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1">
              待更新: {needUpdateCount} 位
            </Badge>
          )}
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            刷新等级
          </Button>
        </div>
      </div>

      {/* 等级配置卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {tiers.map((tier, i) => {
          const Icon = tierIcons[i] || Award;
          return (
            <Card key={tier.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: tier.badge_color }}
              />
              <CardContent className="p-4 pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="p-2.5 rounded-lg"
                    style={{ backgroundColor: tier.badge_color + '20', color: tier.badge_color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{tier.name}</p>
                    <p className="text-xs text-slate-400">Level {tier.level}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500">
                  <div className="flex justify-between">
                    <span>完单数</span>
                    <span className="font-medium text-slate-700">≥ {tier.min_orders} 单</span>
                  </div>
                  <div className="flex justify-between">
                    <span>评分</span>
                    <span className="font-medium text-slate-700">≥ {tier.min_rating}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>续单率</span>
                    <span className="font-medium text-slate-700">≥ {Math.round(tier.min_reorder_rate * 100)}%</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex flex-wrap gap-1.5 text-xs">
                  {tier.hourly_premium > 0 && (
                    <Badge className="bg-green-50 text-green-700">时薪+¥{tier.hourly_premium}</Badge>
                  )}
                  {tier.priority && (
                    <Badge className="bg-blue-50 text-blue-700">优先派单</Badge>
                  )}
                  {tier.deposit_reduction > 0 && (
                    <Badge className="bg-purple-50 text-purple-700">保证金-¥{tier.deposit_reduction}</Badge>
                  )}
                  {tier.level === 1 && (
                    <Badge className="bg-slate-50 text-slate-500">基础权益</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 阿姨等级列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            阿姨等级分布 ({workers.length} 位)
            {needUpdateCount > 0 && (
              <span className="text-yellow-600 text-sm ml-2">— {needUpdateCount} 位待更新</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600">阿姨</th>
                  <th className="text-center p-3 font-medium text-slate-600">完单数</th>
                  <th className="text-center p-3 font-medium text-slate-600">评分</th>
                  <th className="text-center p-3 font-medium text-slate-600">续单率</th>
                  <th className="text-center p-3 font-medium text-slate-600">当前等级</th>
                  <th className="text-center p-3 font-medium text-slate-600">应得等级</th>
                  <th className="text-center p-3 font-medium text-slate-600">状态</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">暂无阿姨数据</td></tr>
                )}
                {workers.map(w => (
                  <tr key={w.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-3 font-medium">{w.name}</td>
                    <td className="p-3 text-center">{w.completed_orders || 0}</td>
                    <td className="p-3 text-center">
                      <span className={cn(
                        'font-medium',
                        (w.avg_rating || 0) >= 4.5 ? 'text-green-600' : (w.avg_rating || 0) >= 3 ? 'text-yellow-600' : 'text-red-500'
                      )}>
                        {w.avg_rating?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="p-3 text-center">{Math.round((w.reorder_rate || 0) * 100)}%</td>
                    <td className="p-3 text-center">
                      {w.current_tier ? (
                        <Badge style={{ backgroundColor: w.current_tier.badge_color + '20', color: w.current_tier.badge_color }}>
                          {w.current_tier.name}
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500">未设置</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {w.auto_tier ? (
                        <Badge style={{ backgroundColor: w.auto_tier.badge_color + '15', color: w.auto_tier.badge_color, border: `1px solid ${w.auto_tier.badge_color}40` }}>
                          {w.auto_tier.name}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {w.need_update ? (
                        <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1 justify-center">
                          <ArrowUp className="h-3 w-3" />待更新
                        </Badge>
                      ) : (
                        <Badge className="bg-green-50 text-green-600">一致</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

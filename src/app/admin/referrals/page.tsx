'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Gift, TrendingUp, Users, DollarSign, Award, Copy, Check } from 'lucide-react';

interface ReferralRecord {
  id: string;
  name: string;
  phone: string;
  status: string;
  source_type: string;
  source_id: string;
  created_at: string;
  // from joins
  referrer_name?: string;
  referrer_id?: string;
  referrer_role?: string;
}

interface RewardRecord {
  id: string;
  referrer_id: string;
  referrer_name: string;
  referred_name: string;
  source_type: string;
  source_id: string;
  reward_type: string;
  reward_amount: number;
  reward_points: number;
  status: string;
  triggered_by: string;
  created_at: string;
  paid_at: string;
}

interface Stats {
  totalLeads: number;
  totalCustomers: number;
  convertedTotal: number;
  totalRewardPaid: number;
  totalRewardPending: number;
  topReferrers: { name: string; count: number; reward: number }[];
}

export default function ReferralsPage() {
  const [tab, setTab] = useState<'overview' | 'rewards' | 'top'>('overview');
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [rewardFilter, setRewardFilter] = useState('all');
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [issueForm, setIssueForm] = useState({
    reward_id: '', referrer_id: '', referred_name: '', source_type: 'lead',
    reward_type: 'commission', reward_amount: 0, reward_points: 0, triggered_by: '',
  });

  function getAuthHeaders() {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    return { 'Content-Type': 'application/json', 'x-session': token || '' };
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      // 获取奖励记录
      const res1 = await fetch('/api/referral-rewards', { headers });
      const rewardData = await res1.json();
      setRewards(rewardData.data || []);

      // 汇总统计
      const paid = (rewardData.data || []).filter((r: RewardRecord) => r.status === 'paid');
      const pending = (rewardData.data || []).filter((r: RewardRecord) => r.status === 'pending');

      // 排行榜
      const byReferrer: Record<string, { name: string; count: number; reward: number }> = {};
      for (const r of rewardData.data || []) {
        const key = r.referrer_id;
        if (!byReferrer[key]) byReferrer[key] = { name: r.referrer_name || key, count: 0, reward: 0 };
        byReferrer[key].count++;
        if (r.status === 'paid') byReferrer[key].reward += Number(r.reward_amount || 0);
      }
      const topReferrers = Object.values(byReferrer)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalLeads: 0,
        totalCustomers: 0,
        convertedTotal: 0,
        totalRewardPaid: paid.reduce((s: number, r: RewardRecord) => s + Number(r.reward_amount || 0), 0),
        totalRewardPending: pending.reduce((s: number, r: RewardRecord) => s + Number(r.reward_amount || 0), 0),
        topReferrers,
      });
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleIssueReward = async () => {
    const headers = getAuthHeaders();
    if (issueForm.reward_id) {
      await fetch('/api/referral-rewards', {
        method: 'POST', headers,
        body: JSON.stringify({ reward_id: issueForm.reward_id }),
      });
    } else {
      await fetch('/api/referral-rewards', {
        method: 'POST', headers,
        body: JSON.stringify(issueForm),
      });
    }
    setShowIssueDialog(false);
    fetchData();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: '待发放', color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: '已发放', color: 'bg-green-100 text-green-800' },
      cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600' },
    };
    const m = map[status] || { label: status, color: 'bg-gray-100' };
    return <Badge className={m.color}>{m.label}</Badge>;
  };

  const filteredRewards = rewardFilter === 'all'
    ? rewards
    : rewards.filter(r => r.status === rewardFilter);

  if (loading) return <div className="p-6 text-slate-400">加载中...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">推荐管理</h1>
          <p className="text-sm text-slate-500 mt-1">阿姨推荐老乡的数据总览与奖励发放</p>
        </div>
        <Button onClick={() => { setIssueForm({ reward_id: '', referrer_id: '', referred_name: '', source_type: 'lead', reward_type: 'commission', reward_amount: 0, reward_points: 0, triggered_by: '' }); setShowIssueDialog(true); }}>
          <Gift className="h-4 w-4 mr-2" />手动发奖
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-slate-500">推荐总数</p>
                <p className="text-xl font-bold text-slate-800">{rewards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-50"><DollarSign className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-slate-500">已发奖励</p>
                <p className="text-xl font-bold text-green-700">¥{stats?.totalRewardPaid.toFixed(0) || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-yellow-50"><DollarSign className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <p className="text-xs text-slate-500">待发放</p>
                <p className="text-xl font-bold text-yellow-700">¥{stats?.totalRewardPending.toFixed(0) || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50"><TrendingUp className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-slate-500">已发放笔数</p>
                <p className="text-xl font-bold text-purple-700">
                  {rewards.filter(r => r.status === 'paid').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 border-b">
        {(['overview', 'rewards', 'top'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t === 'overview' ? '奖励发放' : t === 'rewards' ? '全部记录' : '排行榜'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['all', 'pending', 'paid', 'cancelled'].map(s => (
              <Badge
                key={s}
                className={cn('cursor-pointer', rewardFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                onClick={() => setRewardFilter(s)}
              >
                {s === 'all' ? '全部' : s === 'pending' ? '待发放' : s === 'paid' ? '已发放' : '已取消'}
              </Badge>
            ))}
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-slate-600">推荐人</th>
                  <th className="text-left p-3 font-medium text-slate-600">被推荐人</th>
                  <th className="text-left p-3 font-medium text-slate-600">类型</th>
                  <th className="text-right p-3 font-medium text-slate-600">金额</th>
                  <th className="text-right p-3 font-medium text-slate-600">积分</th>
                  <th className="text-center p-3 font-medium text-slate-600">状态</th>
                  <th className="text-left p-3 font-medium text-slate-600">时间</th>
                  <th className="text-center p-3 font-medium text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRewards.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">暂无记录</td></tr>
                )}
                {filteredRewards.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-3">{r.referrer_name || '-'}</td>
                    <td className="p-3">{r.referred_name || '-'}</td>
                    <td className="p-3">
                      <Badge className="bg-blue-50 text-blue-700">
                        {r.source_type === 'lead' ? '阿姨线索' : '客户线索'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-medium">¥{Number(r.reward_amount).toFixed(0)}</td>
                    <td className="p-3 text-right">{r.reward_points}</td>
                    <td className="p-3 text-center">{statusBadge(r.status)}</td>
                    <td className="p-3 text-slate-500 text-xs">{new Date(r.created_at).toLocaleDateString('zh-CN')}</td>
                    <td className="p-3 text-center">
                      {r.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIssueForm({ ...issueForm, reward_id: r.id });
                            setShowIssueDialog(true);
                          }}
                        >
                          <Check className="h-3 w-3 mr-1" />发放
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'rewards' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-slate-600">推荐人</th>
                <th className="text-left p-3 font-medium text-slate-600">被推荐人</th>
                <th className="text-left p-3 font-medium text-slate-600">触发事件</th>
                <th className="text-right p-3 font-medium text-slate-600">金额</th>
                <th className="text-center p-3 font-medium text-slate-600">状态</th>
                <th className="text-left p-3 font-medium text-slate-600">时间</th>
              </tr>
            </thead>
            <tbody>
              {rewards.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">暂无记录</td></tr>
              )}
              {rewards.map(r => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-3 font-medium">{r.referrer_name || '-'}</td>
                  <td className="p-3">{r.referred_name || '-'}</td>
                  <td className="p-3 text-xs text-slate-500">{r.triggered_by || '手动录入'}</td>
                  <td className="p-3 text-right font-medium">¥{Number(r.reward_amount).toFixed(0)}</td>
                  <td className="p-3 text-center">{statusBadge(r.status)}</td>
                  <td className="p-3 text-slate-500 text-xs">
                    {r.status === 'paid' && r.paid_at
                      ? `发放: ${new Date(r.paid_at).toLocaleDateString('zh-CN')}`
                      : new Date(r.created_at).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'top' && (
        <div className="space-y-4">
          {stats?.topReferrers.length === 0 && (
            <div className="p-8 text-center text-slate-400">暂无排行数据</div>
          )}
          {stats?.topReferrers.map((person, i) => (
            <div key={i} className="flex items-center gap-4 bg-white rounded-lg border p-4">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white',
                i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300 text-slate-600'
              )}>
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{person.name}</p>
                <p className="text-xs text-slate-500">推荐 {person.count} 人</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-700">¥{person.reward.toFixed(0)}</p>
                <p className="text-xs text-slate-400">已获奖励</p>
              </div>
              {i === 0 && <Award className="h-6 w-6 text-yellow-500" />}
            </div>
          ))}
        </div>
      )}

      {/* 手动发奖弹窗 */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>发放推荐奖励</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            {issueForm.reward_id ? (
              <p className="text-sm text-slate-600">确认发放此笔奖励？</p>
            ) : (
              <>
                <div>
                  <Label>推荐人ID</Label>
                  <Input value={issueForm.referrer_id} onChange={e => setIssueForm({ ...issueForm, referrer_id: e.target.value })} />
                </div>
                <div>
                  <Label>被推荐人姓名</Label>
                  <Input value={issueForm.referred_name} onChange={e => setIssueForm({ ...issueForm, referred_name: e.target.value })} />
                </div>
                <div>
                  <Label>业务类型</Label>
                  <Select value={issueForm.source_type} onValueChange={v => setIssueForm({ ...issueForm, source_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">阿姨线索</SelectItem>
                      <SelectItem value="customer_lead">客户线索</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>奖励金额</Label>
                    <Input type="number" value={issueForm.reward_amount} onChange={e => setIssueForm({ ...issueForm, reward_amount: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>奖励积分</Label>
                    <Input type="number" value={issueForm.reward_points} onChange={e => setIssueForm({ ...issueForm, reward_points: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>触发事件</Label>
                  <Input value={issueForm.triggered_by} onChange={e => setIssueForm({ ...issueForm, triggered_by: e.target.value })} placeholder="如：首单完成" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>取消</Button>
            <Button onClick={handleIssueReward}>确认发放</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

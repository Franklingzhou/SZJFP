'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Shield, Plus, Trash2, Save, Play, Pause,
  TrendingUp, TrendingDown, AlertTriangle, Star,
  GripVertical, Edit3, RotateCcw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CreditRecord {
  id: string;
  user_id: string;
  event: string;
  score_change: number;
  related_order_id: string | null;
  created_at: string;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
  phone: string;
}

interface CreditRule {
  id: string;
  event: string;
  score_change: number;
  target_roles: string[];
  active: boolean;
  category: 'bonus' | 'penalty';
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

// 默认规则（种子数据）
const DEFAULT_RULES: CreditRule[] = [
  { id: 'cr1', event: '客户好评', score_change: 15, target_roles: ['worker'], active: true, category: 'bonus' },
  { id: 'cr2', event: '长期连续上户（3个月+）', score_change: 20, target_roles: ['worker'], active: true, category: 'bonus' },
  { id: 'cr3', event: '推荐转化成功', score_change: 15, target_roles: ['agent', 'recruiter'], active: true, category: 'bonus' },
  { id: 'cr4', event: '完成培训并通过考核', score_change: 10, target_roles: ['worker'], active: true, category: 'bonus' },
  { id: 'cr5', event: '爽约/放鸽子', score_change: -80, target_roles: ['worker'], active: true, category: 'penalty' },
  { id: 'cr6', event: '客户投诉核实', score_change: -50, target_roles: ['worker'], active: true, category: 'penalty' },
  { id: 'cr7', event: '提前下户', score_change: -50, target_roles: ['worker'], active: true, category: 'penalty' },
  { id: 'cr8', event: '迟到早退', score_change: -10, target_roles: ['worker'], active: true, category: 'penalty' },
  { id: 'cr9', event: '服务质量投诉', score_change: -30, target_roles: ['worker'], active: true, category: 'penalty' },
  { id: 'cr10', event: '恶意挖单/飞单', score_change: -150, target_roles: ['agent', 'recruiter'], active: true, category: 'penalty' },
  { id: 'cr11', event: '教学好评', score_change: 15, target_roles: ['instructor'], active: true, category: 'bonus' },
  { id: 'cr12', event: '学员投诉', score_change: -40, target_roles: ['instructor'], active: true, category: 'penalty' },
  { id: 'cr13', event: '审核失误', score_change: -20, target_roles: ['training_supervisor'], active: true, category: 'penalty' },
  { id: 'cr14', event: '推荐阿姨质量高', score_change: 15, target_roles: ['recruiter', 'worker_operator'], active: true, category: 'bonus' },
];

const ROLE_LABELS: Record<string, string> = {
  worker: '阿姨', agent: '经纪人', recruiter: '招生代理', instructor: '讲师',
  training_supervisor: '培训主管', worker_operator: '阿姨运营', admin: '管理员', customer: '客户',
};

const CREDIT_ROLES = ['worker', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator'];

const COLOR_RULES: Record<string, string> = {
  worker: 'bg-blue-100 text-blue-700', agent: 'bg-purple-100 text-purple-700',
  recruiter: 'bg-teal-100 text-teal-700', instructor: 'bg-indigo-100 text-indigo-700',
  training_supervisor: 'bg-rose-100 text-rose-700', worker_operator: 'bg-cyan-100 text-cyan-700',
};

export default function CreditPage() {
  // Records
  const [records, setRecords] = useState<CreditRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [message, setMessage] = useState('');

  // Adjust dialog
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ user_id: '', event: '', score_change: 0 });
  const [adjusting, setAdjusting] = useState(false);

  // Rules tab
  const [activeTab, setActiveTab] = useState<'records' | 'rules'>('records');
  const [rules, setRules] = useState<CreditRule[]>(DEFAULT_RULES);
  const [rulesDirty, setRulesDirty] = useState(false);
  const [savingRules, setSavingRules] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/credit-records?limit=500';
      if (roleFilter !== 'all') {
        // 按角色筛选：先获取该角色所有用户ID，再查记录
        // 简化处理：前端过滤
      }
      const res = await fetch(url, { headers: getAuthHeaders() });
      const result = await res.json();
      setRecords(result.ok ? result.data : []);
    } catch (err) {
      console.error('[credit] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?limit=500', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.ok) setUsers(result.data || []);
    } catch { /* ignore */ }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/credit-rules', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.ok && result.data?.length > 0) {
        setRules(result.data);
      }
    } catch { /* use defaults */ }
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadRules(); }, [loadRules]);

  // ── 记录管理 ──
  const handleAdjust = async () => {
    if (!adjustForm.user_id || !adjustForm.event) { setMessage('请填写完整信息'); return; }
    setAdjusting(true);
    try {
      const res = await fetch('/api/credit-records', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(adjustForm),
      });
      const result = await res.json();
      if (result.ok) {
        setShowAdjust(false);
        setAdjustForm({ user_id: '', event: '', score_change: 0 });
        setMessage('诚信分调整成功');
        loadRecords();
      } else {
        setMessage(result.error || '调整失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setAdjusting(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const quickAdjust = (userId: string, event: string, change: number) => {
    setAdjustForm({ user_id: userId, event, score_change: change });
    setShowAdjust(true);
  };

  // ── 规则管理 ──
  const addRule = () => {
    const newRule: CreditRule = {
      id: `rule_${Date.now()}`,
      event: '',
      score_change: 0,
      target_roles: ['worker'],
      active: true,
      category: 'bonus',
    };
    setRules(prev => [...prev, newRule]);
    setRulesDirty(true);
  };

  const updateRule = (id: string, field: keyof CreditRule, value: unknown) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setRulesDirty(true);
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setRulesDirty(true);
  };

  const toggleRuleActive = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    setRulesDirty(true);
  };

  const saveRules = async () => {
    setSavingRules(true);
    try {
      const res = await fetch('/api/credit-rules', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rules }),
      });
      const result = await res.json();
      if (result.ok) {
        setRulesDirty(false);
        setMessage('规则保存成功');
      } else {
        setMessage(result.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSavingRules(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const resetRules = () => {
    if (!confirm('恢复默认规则？当前修改将丢失。')) return;
    setRules(DEFAULT_RULES);
    setRulesDirty(true);
  };

  // ── 计算 ──
  const getUserInfo = (userId: string) => users.find(u => u.id === userId);

  // 按角色筛选记录
  const roleUserIds = roleFilter === 'all'
    ? null
    : new Set(users.filter(u => u.role === roleFilter).map(u => u.id));

  const filtered = records.filter(r => {
    const matchSearch = !searchText
      || r.user_id?.includes(searchText)
      || r.event?.includes(searchText)
      || r.id?.includes(searchText);
    const matchRole = !roleUserIds || roleUserIds.has(r.user_id);
    return matchSearch && matchRole;
  });

  // 统计
  const totalRecords = records.length;
  const bonusRecords = records.filter(r => r.score_change > 0);
  const penaltyRecords = records.filter(r => r.score_change < 0);
  const totalBonus = bonusRecords.reduce((s, r) => s + r.score_change, 0);
  const totalPenalty = penaltyRecords.reduce((s, r) => s + r.score_change, 0);

  // 用户诚信分汇总
  const userCreditMap = new Map<string, { userId: string; total: number; count: number }>();
  records.forEach(r => {
    const existing = userCreditMap.get(r.user_id) || { userId: r.user_id, total: 1000, count: 0 };
    existing.total += r.score_change;
    existing.count += 1;
    userCreditMap.set(r.user_id, existing);
  });
  const userCredits = Array.from(userCreditMap.values()).sort((a, b) => a.total - b.total);

  const lowScoreUsers = userCredits.filter(u => u.total < 700);
  const warningUsers = userCredits.filter(u => u.total < 500);
  const blacklistUsers = userCredits.filter(u => u.total < 300);

  const tabs_filter = [
    { key: 'all', label: '全部', count: totalRecords },
    { key: 'bonus', label: '加分', count: bonusRecords.length },
    { key: 'penalty', label: '扣分', count: penaltyRecords.length },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">诚信分管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理阿姨/经纪人/招生/讲师/培训主管/阿姨运营的诚信分，奖优罚劣、可视可恢复
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowAdjust(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> 手动调整
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-1">
        {([
          { key: 'records' as const, label: '诚信记录', icon: Shield },
          { key: 'rules' as const, label: '规则配置', icon: Edit3 },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 记录视图 ── */}
      {activeTab === 'records' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">总记录数</p>
                <p className="text-xl font-bold text-slate-800">{totalRecords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">累计加分</p>
                <p className="text-xl font-bold text-green-600">+{totalBonus}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">累计扣分</p>
                <p className="text-xl font-bold text-red-600">{totalPenalty}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  预警（&lt;700）
                </p>
                <p className="text-xl font-bold text-orange-600">{lowScoreUsers.length}<span className="text-sm font-normal text-orange-400"> 人</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-500">
                  <Star className="w-3 h-3 inline mr-1" />
                  限制/黑名单
                </p>
                <p className="text-xl font-bold text-red-600">{warningUsers.length + blacklistUsers.length}<span className="text-sm font-normal text-red-400"> 人</span></p>
              </CardContent>
            </Card>
          </div>

          {/* 低分用户预警 */}
          {lowScoreUsers.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-orange-700">低分预警</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {lowScoreUsers.slice(0, 8).map(u => {
                    const user = getUserInfo(u.userId);
                    const level = u.total < 300 ? '黑名单' : u.total < 500 ? '限制' : '预警';
                    const levelColor = u.total < 300 ? 'text-red-600 bg-red-100' : u.total < 500 ? 'text-orange-600 bg-orange-100' : 'text-yellow-600 bg-yellow-100';
                    return (
                      <div key={u.userId} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-orange-100">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{user?.name || u.userId}</div>
                          <div className="text-xs text-slate-400">{ROLE_LABELS[user?.role || ''] || user?.role}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-700">{u.total}</div>
                          <Badge className={cn('text-[10px] px-1.5', levelColor)}>{level}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message */}
          {message && (
            <div className={cn('p-3 rounded-lg text-sm', message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
              {message}
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: '全部角色' },
                ...CREDIT_ROLES.map(r => ({ key: r, label: ROLE_LABELS[r] || r })),
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setRoleFilter(t.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    roleFilter === t.key
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索事件/用户ID..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Records List */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">加载中...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">暂无诚信记录</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(record => {
                const user = getUserInfo(record.user_id);
                const isBonus = record.score_change > 0;
                return (
                  <Card key={record.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                            isBonus ? 'bg-green-100' : 'bg-red-100'
                          )}>
                            {isBonus
                              ? <TrendingUp className="w-5 h-5 text-green-600" />
                              : <TrendingDown className="w-5 h-5 text-red-600" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-800">
                                {user?.name || record.user_id}
                              </span>
                              {user && (
                                <Badge className={cn('text-xs', COLOR_RULES[user.role] || 'bg-slate-100')}>
                                  {ROLE_LABELS[user.role] || user.role}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mt-0.5">{record.event}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                              <span>ID: {record.id}</span>
                              <span>{new Date(record.created_at).toLocaleString('zh-CN')}</span>
                              {record.related_order_id && <span>关联订单: {record.related_order_id}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className={cn(
                            'text-lg font-bold',
                            isBonus ? 'text-green-600' : 'text-red-600'
                          )}>
                            {isBonus ? '+' : ''}{record.score_change}
                          </div>
                          <div className="text-xs text-slate-400">诚信分</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Manual Adjust Dialog */}
          <Dialog open={showAdjust} onOpenChange={setShowAdjust}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-500" />
                  手动调整诚信分
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>用户 *</Label>
                  <Select
                    value={adjustForm.user_id}
                    onValueChange={v => setAdjustForm(prev => ({ ...prev, user_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择用户" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => CREDIT_ROLES.includes(u.role)).map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name} ({ROLE_LABELS[u.role] || u.role}) - {u.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="event">事件描述 *</Label>
                  <Input
                    id="event"
                    placeholder="如：客户投诉核实、好评加分..."
                    value={adjustForm.event}
                    onChange={e => setAdjustForm(prev => ({ ...prev, event: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="score_change">分值变化 *</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="score_change"
                      type="number"
                      placeholder="正数加分，负数扣分"
                      value={adjustForm.score_change || ''}
                      onChange={e => setAdjustForm(prev => ({ ...prev, score_change: Number(e.target.value) || 0 }))}
                      className={cn(adjustForm.score_change > 0 ? 'border-green-300' : adjustForm.score_change < 0 ? 'border-red-300' : '')}
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {adjustForm.score_change > 0 ? '✅ 加分' : adjustForm.score_change < 0 ? '❌ 扣分' : '请填写'}
                    </span>
                  </div>
                </div>

                {/* 快捷事件 */}
                {rules.filter(r => r.active).length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-400 mb-2">快捷规则（点击填入）</Label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {rules.filter(r => r.active).map(rule => (
                        <button
                          key={rule.id}
                          onClick={() => setAdjustForm(prev => ({
                            ...prev,
                            event: rule.event,
                            score_change: rule.score_change,
                          }))}
                          className={cn(
                            'px-2 py-1 rounded text-xs transition-colors',
                            rule.score_change > 0
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-red-50 text-red-700 hover:bg-red-100'
                          )}
                        >
                          {rule.event} ({rule.score_change > 0 ? '+' : ''}{rule.score_change})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAdjust(false)}>取消</Button>
                <Button className="bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleAdjust} disabled={adjusting || !adjustForm.user_id || !adjustForm.event || adjustForm.score_change === 0}>
                  {adjusting ? '提交中...' : '确认调整'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── 规则配置视图 ── */}
      {activeTab === 'rules' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">诚信分规则配置</h2>
              <p className="text-sm text-slate-500 mt-1">
                配置加分/扣分规则，添加后可在手动调整中快捷选择。禁用规则不会删除，仅隐藏。
              </p>
            </div>
            <div className="flex items-center gap-2">
              {rulesDirty && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 有未保存的修改
                </span>
              )}
              <Button variant="outline" size="sm" onClick={resetRules}
                className="text-slate-600">
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> 恢复默认
              </Button>
              <Button size="sm" onClick={saveRules} disabled={!rulesDirty || savingRules}
                className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="w-3.5 h-3.5 mr-1" />
                {savingRules ? '保存中...' : '保存规则'}
              </Button>
              <Button size="sm" onClick={addRule}
                className="bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> 新增规则
              </Button>
            </div>
          </div>

          {/* Rule categories summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-700">加分规则</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {rules.filter(r => r.category === 'bonus').length}
                  <span className="text-sm font-normal text-green-500"> 条（{rules.filter(r => r.category === 'bonus' && r.active).length} 启用）</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-red-700">扣分规则</span>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {rules.filter(r => r.category === 'penalty').length}
                  <span className="text-sm font-normal text-red-500"> 条（{rules.filter(r => r.category === 'penalty' && r.active).length} 启用）</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Rules list */}
          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <Card key={rule.id} className={cn(
                'transition-all',
                !rule.active && 'opacity-50'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {/* 拖拽区 */}
                    <div className="text-slate-300 cursor-grab">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* 序号 */}
                    <span className="text-xs text-slate-400 w-6 text-center">{idx + 1}</span>

                    {/* 类型标签 */}
                    <Badge className={cn(
                      'text-xs flex-shrink-0',
                      rule.category === 'bonus'
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-red-100 text-red-700 border-red-200'
                    )}>
                      {rule.category === 'bonus' ? '加分' : '扣分'}
                    </Badge>

                    {/* 事件描述 */}
                    <div className="flex-1 min-w-0">
                      <Input
                        value={rule.event}
                        onChange={e => updateRule(rule.id, 'event', e.target.value)}
                        placeholder="事件描述，如：客户好评..."
                        className="border-0 border-b border-slate-200 rounded-none px-0 h-8 text-sm focus-visible:ring-0 focus-visible:border-amber-400"
                      />
                    </div>

                    {/* 分值 */}
                    <div className="w-20">
                      <Input
                        type="number"
                        value={rule.score_change}
                        onChange={e => updateRule(rule.id, 'score_change', Number(e.target.value) || 0)}
                        className={cn(
                          'h-8 text-sm text-center font-medium',
                          rule.score_change > 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'
                        )}
                      />
                    </div>

                    {/* 适用角色 */}
                    <div className="w-40">
                      <Select
                        value={rule.target_roles[0] || 'worker'}
                        onValueChange={v => updateRule(rule.id, 'target_roles', [v])}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CREDIT_ROLES.map(r => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                          <SelectItem value="all_credit">所有信用角色</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 开关 */}
                    <button
                      onClick={() => toggleRuleActive(rule.id)}
                      className={cn(
                        'p-1.5 rounded transition-colors',
                        rule.active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-slate-300 hover:bg-slate-100'
                      )}
                      title={rule.active ? '已启用，点击禁用' : '已禁用，点击启用'}
                    >
                      {rule.active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>

                    {/* 删除 */}
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="删除规则"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {rules.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                暂无规则，点击「新增规则」添加
              </div>
            )}
          </div>

          {/* 规则说明 */}
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4 text-sm text-slate-500 space-y-1">
              <p><strong className="text-slate-700">使用说明：</strong></p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>点击「新增规则」添加自定义规则，填写事件描述、分值（正数加分，负数扣分）</li>
                <li>选择规则适用的角色，或「所有信用角色」</li>
                <li>点击 <Play className="w-3 h-3 inline text-green-600" /> / <Pause className="w-3 h-3 inline" /> 可启用/禁用规则</li>
                <li>点击 <Trash2 className="w-3 h-3 inline text-red-400" /> 可删除规则</li>
                <li>配置的规则会自动出现在「手动调整」弹窗的快捷选项中</li>
                <li><strong>阈值警告：</strong>&lt;700 预警 | &lt;500 限制接单 | &lt;300 黑名单（需配合业务逻辑自动触发）</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

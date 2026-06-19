'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Percent, Save, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface CommissionRule {
  id: string;
  name: string;
  type: string;
  description: string;
  role: string;
  rate: number;
  is_active: boolean;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function CommissionPage() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editRule, setEditRule] = useState<CommissionRule | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/commission', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.ok) setRules(json.data || []);
    } catch (e) {
      console.error('[commission] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!editRule) return;
    if (editRate < 0 || editRate > 100) {
      setMessage('比例需在0-100之间');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/commission', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: editRule.id, rate: editRate }),
      });
      const json = await res.json();
      if (json.ok) {
        setRules(prev => prev.map(r => r.id === editRule.id ? { ...r, rate: editRate } : r));
        setEditRule(null);
        setMessage('保存成功');
      } else {
        setMessage(json.error || '保存失败');
      }
    } catch (e) {
      setMessage('网络错误');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Group by type
  const brokerageRules = rules.filter(r => r.type === 'brokerage');
  const serviceRules = rules.filter(r => r.type === 'service');
  const referralRules = rules.filter(r => r.type === 'referral');

  const TYPE_LABELS: Record<string, string> = { brokerage: '中介费', service: '服务费', referral: '推荐费' };
  const TYPE_COLORS: Record<string, string> = { brokerage: 'bg-blue-100 text-blue-800', service: 'bg-green-100 text-green-800', referral: 'bg-purple-100 text-purple-800' };

  const renderRuleGroup = (group: CommissionRule[], title: string) => (
    <Card key={title}>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">{title}</h3>
        <div className="space-y-3">
          {group.length === 0 ? (
            <p className="text-sm text-slate-400">暂无配置</p>
          ) : (
            group.map(rule => (
              <div key={rule.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{rule.name}</span>
                    <Badge className={TYPE_COLORS[rule.type] || 'bg-slate-100'}>{TYPE_LABELS[rule.type] || rule.type}</Badge>
                    {rule.is_active ? (
                      <Badge className="bg-green-100 text-green-700">启用</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-500">停用</Badge>
                    )}
                  </div>
                  {rule.description && <p className="text-xs text-slate-400 mt-1">{rule.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-amber-600">{rule.rate}%</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-amber-600 border-amber-300 hover:bg-amber-50"
                    onClick={() => { setEditRule(rule); setEditRate(rule.rate); }}
                  >
                    <Percent className="w-3 h-3 mr-1" /> 调整
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">佣金配置</h1>
          <p className="text-sm text-slate-500 mt-1">管理中介费、服务费、推荐费比例</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 刷新
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Rule Groups */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderRuleGroup(brokerageRules, '中介费配置')}
          {renderRuleGroup(serviceRules, '服务费配置')}
          {renderRuleGroup(referralRules, '推荐费配置')}
        </div>
      )}

      {/* Summary Card */}
      {!loading && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">分账比例汇总</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-xs text-blue-600 font-medium">创建人分成</p>
                <p className="text-2xl font-bold text-blue-700">
                  {brokerageRules.find(r => r.role === 'creator')?.rate ?? 30}%
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-xs text-green-600 font-medium">维护人分成</p>
                <p className="text-2xl font-bold text-green-700">
                  {brokerageRules.find(r => r.role === 'maintainer')?.rate ?? 40}%
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-xs text-purple-600 font-medium">推荐人分成</p>
                <p className="text-2xl font-bold text-purple-700">
                  {referralRules.find(r => r.role === 'recommender')?.rate ?? 30}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editRule} onOpenChange={(open) => { if (!open) setEditRule(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调整佣金比例</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-slate-600">规则名称</Label>
              <p className="text-sm font-medium text-slate-800 mt-1">{editRule?.name}</p>
            </div>
            <div>
              <Label className="text-sm text-slate-600">当前比例</Label>
              <p className="text-2xl font-bold text-amber-600 mt-1">{editRule?.rate}%</p>
            </div>
            <div>
              <Label htmlFor="newRate" className="text-sm text-slate-600">新比例 (%)</Label>
              <Input
                id="newRate"
                type="number"
                min={0}
                max={100}
                value={editRate}
                onChange={(e) => setEditRate(Number(e.target.value))}
                className="mt-1"
              />
              {editRate < 0 || editRate > 100 ? (
                <p className="text-xs text-red-500 mt-1">比例需在0-100之间</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">输入0-100之间的数值</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRule(null)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleSave}
              disabled={saving || editRate < 0 || editRate > 100}
            >
              <Save className="w-4 h-4 mr-1" /> {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

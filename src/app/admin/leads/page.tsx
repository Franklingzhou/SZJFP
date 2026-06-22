'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Plus, UserCircle, Phone, Calendar, Edit, ArrowRight, UserCheck, Smartphone, MessageCircle } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone: string;
  status: string;
  level: string;
  source: string | null;
  recruiter_id: string | null;
  note: string | null;
  age: number | null;
  gender: string | null;
  origin: string | null;
  intention: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string | null;
}

// P0-1 线索状态枚举（2.0: 签约后自动创建worker，不再走training→qualified→converted流程）
type StatusTab = 'all' | 'new' | 'following' | 'signed' | 'lost';

const STATUS_LABELS: Record<string, string> = {
  new: '新线索',
  following: '跟进中',
  signed: '已签约',
  lost: '已流失',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  following: 'bg-yellow-100 text-yellow-800',
  signed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const LEVEL_COLORS: Record<string, string> = {
  A: 'bg-red-50 text-red-700 border-red-200',
  B: 'bg-orange-50 text-orange-700 border-orange-200',
  C: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  D: 'bg-slate-50 text-slate-600 border-slate-200',
};

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: '转介绍', label: '转介绍' },
  { value: '网络', label: '网络' },
  { value: '电话', label: '电话' },
  { value: '门店', label: '门店' },
  { value: 'manual', label: '手动录入' },
  { value: '其他', label: '其他' },
];

const STATUS_TABS: { key: StatusTab; label: string; color: string }[] = [
  { key: 'all', label: '全部', color: 'bg-slate-600' },
  { key: 'new', label: '新线索', color: 'bg-blue-500' },
  { key: 'following', label: '跟进中', color: 'bg-yellow-500' },
  { key: 'signed', label: '已签约', color: 'bg-green-500' },
  { key: 'lost', label: '已流失', color: 'bg-red-500' },
];

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [levelFilter, setLevelFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // 新建/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    level: 'C',
    source: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);

  // 手机号预注册弹窗
  const [showPhonePreReg, setShowPhonePreReg] = useState(false);
  const [preRegData, setPreRegData] = useState({ name: '', phone: '' });
  const [preRegSaving, setPreRegSaving] = useState(false);

  // 跟进记录
  const [followUpLead, setFollowUpLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ content: '', method: '电话' });
  const [followUpSaving, setFollowUpSaving] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem('auth_userid') || localStorage.getItem('miniapp_userid') || '';
    setCurrentUserId(uid);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsRes, usersRes] = await Promise.all([
        fetch('/api/leads', { headers: getAuthHeaders(false) }),
        fetch('/api/users', { headers: getAuthHeaders(false) }),
      ]);
      const leadsResult = await leadsRes.json();
      const usersResult = await usersRes.json();

      if (leadsResult.data) setLeads(leadsResult.data);

      if (usersResult.data) {
        const map: Record<string, string> = {};
        for (const u of usersResult.data) {
          map[u.id] = u.name || u.phone || u.id;
        }
        setUsers(map);
      }
    } catch (e) {
      console.error('线索数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingLead(null);
    setFormData({ name: '', phone: '', level: 'C', source: '', note: '' });
    setShowForm(true);
  };

  const openEditForm = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name || '',
      phone: lead.phone || '',
      level: lead.level || 'C',
      source: lead.source || '',
      note: lead.note || '',
    });
    setShowForm(true);
  };

  // 手机号预注册：姓名+手机号即可创建线索
  const openPhonePreReg = () => {
    setPreRegData({ name: '', phone: '' });
    setShowPhonePreReg(true);
  };

  const handlePreReg = async () => {
    if (!preRegData.name.trim()) {
      alert('姓名为必填项');
      return;
    }
    if (!preRegData.phone.trim()) {
      alert('手机号为必填项');
      return;
    }
    setPreRegSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: preRegData.name,
          phone: preRegData.phone,
          source: 'manual',
          recruiter_id: currentUserId || null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setShowPhonePreReg(false);
        loadData();
      } else {
        alert('创建失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('预注册失败:', e);
      alert('操作失败，请重试');
    } finally {
      setPreRegSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('姓名为必填项');
      return;
    }
    setSaving(true);
    try {
      if (editingLead) {
        const res = await fetch('/api/leads', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id: editingLead.id,
            name: formData.name,
            phone: formData.phone || null,
            level: formData.level,
            source: formData.source || null,
            note: formData.note || null,
            recruiter_id: currentUserId || null,
          }),
        });
        const result = await res.json();
        if (result.success) {
          setShowForm(false);
          loadData();
        } else {
          alert('更新失败：' + (result.error || '请重试'));
        }
      } else {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone || null,
            level: formData.level,
            source: formData.source || null,
            note: formData.note || null,
            recruiter_id: currentUserId || null,
          }),
        });
        const result = await res.json();
        if (result.success) {
          setShowForm(false);
          loadData();
        } else {
          alert('创建失败：' + (result.error || '请重试'));
        }
      }
    } catch (e) {
      console.error('保存失败:', e);
      alert('操作失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusFlow = async (lead: Lead, newStatus: string) => {
    const label = STATUS_LABELS[newStatus] || newStatus;
    if (!confirm(`确认将线索状态改为"${label}"？`)) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: lead.id, status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        loadData();
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('状态流转失败:', e);
      alert('操作失败，请重试');
    }
  };

  // 打开跟进记录弹窗
  const openFollowUpDialog = async (lead: Lead) => {
    setFollowUpLead(lead);
    setNewFollowUp({ content: '', method: '电话' });
    setFollowUpLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/followups`, { headers: getAuthHeaders(false) });
      const result = await res.json();
      if (result.data) setFollowUps(result.data);
    } catch (e) {
      console.error('加载跟进记录失败:', e);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const addFollowUp = async () => {
    if (!newFollowUp.content.trim() || !followUpLead) return;
    setFollowUpSaving(true);
    try {
      const res = await fetch(`/api/leads/${followUpLead.id}/followups`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: `[${newFollowUp.method}] ${newFollowUp.content}`,
        }),
      });
      const result = await res.json();
      if (result.ok) {
        setFollowUps([result.data, ...followUps]);
        setNewFollowUp({ content: '', method: '电话' });
        // 如果线索还是 new 状态，自动变为 following
        if (followUpLead.status === 'new') {
          await fetch('/api/leads', {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ id: followUpLead.id, status: 'following' }),
          });
          loadData();
        }
      } else {
        alert('添加失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('添加跟进失败:', e);
    } finally {
      setFollowUpSaving(false);
    }
  };

  // 筛选
  const filtered = leads.filter(l => {
    const matchStatus = statusTab === 'all' || l.status === statusTab;
    const matchLevel = !levelFilter || l.level === levelFilter;
    const matchSource = !sourceFilter || l.source === sourceFilter;
    const matchSearch = !searchTerm ||
      (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchLevel && matchSource && matchSearch;
  });

  const tabCounts: Record<StatusTab, number> = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    following: leads.filter(l => l.status === 'following').length,
    signed: leads.filter(l => l.status === 'signed').length,
    lost: leads.filter(l => l.status === 'lost').length,
  };

  // 签约确认弹窗
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [converting, setConverting] = useState(false);

  // 调用 convert API（签约→自动创建worker+审核记录）
  const handleConvert = async (lead: Lead, directMode: boolean) => {
    setConvertLead(lead);
    if (directMode) {
      // 直接转简历：不创建招募合同，但仍需简历审核
      if (!confirm(`确认将线索"${lead.name}"直接转为待审简历？\n将创建 worker 并提交审核（跳过招募合同），审核通过后方可上户。`)) return;
      await doConvert(lead, true);
    } else {
      // 普通签约：弹窗填写信息
      setShowConvertDialog(true);
    }
  };

  const doConvert = async (lead: Lead, directMode: boolean) => {
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ direct: directMode }),
      });
      const result = await res.json();
      if (result.success) {
        alert(directMode ? '已提交简历审核，等待管理员审核通过' : '签约成功，已创建待审核简历');
        setShowConvertDialog(false);
        setConvertLead(null);
        loadData();
      } else {
        alert('操作失败：' + (result.error || '请重试'));
      }
    } catch (e) {
      console.error('签约失败:', e);
      alert('操作失败，请重试');
    } finally {
      setConverting(false);
    }
  };

  // 根据当前状态返回可用的流转按钮（2.0: 签约后自动创建worker）
  const getFlowButtons = (lead: Lead) => {
    switch (lead.status) {
      case 'new':
        return (
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleStatusFlow(lead, 'following')}>
            <ArrowRight className="h-3 w-3" /> 开始跟进
          </Button>
        );
      case 'following':
        return (
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => handleConvert(lead, false)}>
              已签约
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
              onClick={() => handleConvert(lead, true)}>
              <UserCheck className="h-3 w-3" /> 直接转简历
            </Button>
            <Button size="sm" variant="outline" className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50" onClick={() => handleStatusFlow(lead, 'lost')}>
              已流失
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">线索管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理招生线索、跟进状态与转化，支持手机号预注册</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={openPhonePreReg}>
            <Smartphone className="h-4 w-4" /> 手机号预注册
          </Button>
          <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600" onClick={openCreateForm}>
            <Plus className="h-4 w-4" /> 新建线索
          </Button>
        </div>
      </div>

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、电话..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">全部级别</option>
              <option value="A">A级</option>
              <option value="B">B级</option>
              <option value="C">C级</option>
              <option value="D">D级</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              {SOURCE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 状态Tab */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusTab === tab.key
                ? `${tab.color} text-white shadow-sm`
                : 'bg-white text-slate-600 border hover:bg-slate-50'
            }`}
          >
            {tab.label} ({tabCounts[tab.key]})
          </button>
        ))}
      </div>

      {/* 线索列表 */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">暂无线索记录</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(lead => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {/* 头部：姓名+状态+级别 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <UserCircle className="h-5 w-5 text-slate-400" />
                    <span className="font-semibold text-slate-800">{lead.name}</span>
                    <Badge className={`text-xs ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-800'}`}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${LEVEL_COLORS[lead.level] || 'bg-slate-50 text-slate-600'}`}>
                      {lead.level}级
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-md hover:bg-amber-50 text-amber-500 hover:text-amber-700"
                      onClick={() => openFollowUpDialog(lead)}
                      title="跟进记录"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                      onClick={() => openEditForm(lead)}
                      title="编辑"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* 详情 */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{lead.phone || '-'}</span>
                  </div>
                  {lead.source && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="text-xs text-slate-400 w-3.5">来</span>
                      <span>{lead.source}</span>
                    </div>
                  )}
                  {lead.recruiter_id && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                      <span>{users[lead.recruiter_id] || lead.recruiter_id}</span>
                    </div>
                  )}
                  {lead.note && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                      {lead.note}
                    </div>
                  )}
                </div>

                {/* 底部：时间+流转按钮 */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="h-3 w-3" />
                    <span>{lead.created_at?.slice(0, 10) || '-'}</span>
                  </div>
                  {getFlowButtons(lead)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 手机号预注册弹窗 */}
      <Dialog open={showPhonePreReg} onOpenChange={setShowPhonePreReg}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>手机号预注册</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              只需姓名和手机号即可创建线索。后续用户使用该手机号注册时，将自动关联到此线索。
            </p>
            <div>
              <Label>姓名 *</Label>
              <Input
                className="mt-1"
                value={preRegData.name}
                onChange={(e) => setPreRegData({ ...preRegData, name: e.target.value })}
                placeholder="输入姓名"
              />
            </div>
            <div>
              <Label>手机号 *</Label>
              <Input
                className="mt-1"
                value={preRegData.phone}
                onChange={(e) => setPreRegData({ ...preRegData, phone: e.target.value })}
                placeholder="输入手机号码"
                type="tel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhonePreReg(false)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600"
              onClick={handlePreReg}
              disabled={preRegSaving || !preRegData.name.trim() || !preRegData.phone.trim()}
            >
              {preRegSaving ? '创建中...' : '创建线索'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建/编辑弹窗 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLead ? '编辑线索' : '新建线索'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>姓名 *</Label>
              <Input
                className="mt-1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="线索姓名"
              />
            </div>
            <div>
              <Label>电话</Label>
              <Input
                className="mt-1"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="手机号码"
              />
            </div>
            <div>
              <Label>级别</Label>
              <select
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              >
                <option value="A">A级（高意向）</option>
                <option value="B">B级（中意向）</option>
                <option value="C">C级（低意向）</option>
                <option value="D">D级（待评估）</option>
              </select>
            </div>
            <div>
              <Label>来源</Label>
              <select
                className="mt-1 w-full rounded-md border p-2 text-sm"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              >
                <option value="">请选择</option>
                <option value="转介绍">转介绍</option>
                <option value="网络">网络</option>
                <option value="电话">电话</option>
                <option value="门店">门店</option>
                <option value="retraining_request">再培训</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div>
              <Label>备注</Label>
              <textarea
                className="mt-1 w-full rounded-md border p-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="线索备注..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleSave} disabled={saving || !formData.name.trim()}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 跟进记录弹窗 */}
      <Dialog open={!!followUpLead} onOpenChange={(open) => { if (!open) setFollowUpLead(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>跟进记录 — {followUpLead?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 添加跟进 */}
            <div className="border rounded-lg p-3 bg-slate-50">
              <Label className="text-sm font-medium mb-2 block">新增跟进</Label>
              <div className="flex gap-2 mb-2">
                <select
                  className="border rounded-md px-2 py-1.5 text-sm"
                  value={newFollowUp.method}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, method: e.target.value })}
                >
                  <option value="电话">电话</option>
                  <option value="微信">微信</option>
                  <option value="面访">面访</option>
                </select>
                <Input
                  className="flex-1"
                  value={newFollowUp.content}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, content: e.target.value })}
                  placeholder="输入跟进内容..."
                  onKeyDown={(e) => { if (e.key === 'Enter') addFollowUp(); }}
                />
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={addFollowUp} disabled={followUpSaving || !newFollowUp.content.trim()}>
                  {followUpSaving ? '...' : '添加'}
                </Button>
              </div>
            </div>

            {/* 跟进列表 */}
            {followUpLoading ? (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            ) : followUps.length === 0 ? (
              <div className="text-center py-8 text-slate-400">暂无跟进记录</div>
            ) : (
              <div className="space-y-3">
                {followUps.map((fu: any, idx: number) => {
                  const methodMatch = fu.content?.match(/^\[(.+?)\]\s*/);
                  const method = methodMatch ? methodMatch[1] : '其他';
                  const text = methodMatch ? fu.content.slice(methodMatch[0].length) : fu.content;
                  return (
                    <div key={fu.id || idx} className="border-l-2 border-amber-300 pl-3 py-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                        <Badge variant="outline" className="text-xs">{method}</Badge>
                        <span>{fu.created_at?.slice(0, 16)?.replace('T', ' ') || '-'}</span>
                      </div>
                      <p className="text-sm text-slate-700">{text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

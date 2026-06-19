'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Send, CheckCircle, FileText, Link2, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type ContractType = 'platform_agent' | 'platform_recruiter' | 'platform_instructor' | 'recruiter_student';
type ContractStatus = 'draft' | 'sent' | 'signed' | 'expired' | 'active' | 'pending_review';
type ExpiryTab = 'all' | 'active' | 'expiring' | 'expired';

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  platform_agent: '平台-经纪人合同',
  platform_recruiter: '平台-招生代理合同',
  platform_instructor: '平台-讲师合同',
  recruiter_student: '招生-学员合同',
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  sent: '已发送',
  signed: '已签署',
  expired: '已过期',
  active: '生效中',
  pending_review: '待确认',
};

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-50 text-blue-700',
  signed: 'bg-green-50 text-green-700',
  expired: 'bg-red-50 text-red-600',
  active: 'bg-green-50 text-green-700',
  pending_review: 'bg-yellow-50 text-yellow-700',
};

const EXPIRY_TABS: { key: ExpiryTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '生效中' },
  { key: 'expiring', label: '即将到期' },
  { key: 'expired', label: '已到期' },
];

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

function getDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  try {
    const end = new Date(endDate);
    const now = new Date();
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function getExpiryHighlight(daysRemaining: number | null, status: string): string {
  if (status === 'expired' || status === 'pending_review') return 'border-l-4 border-l-red-400 bg-red-50/30';
  if (daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0) return 'border-l-4 border-l-amber-400 bg-amber-50/30';
  if (daysRemaining !== null && daysRemaining <= 14 && daysRemaining > 7) return 'border-l-4 border-l-yellow-300 bg-yellow-50/20';
  return '';
}

function getExpiryBadge(daysRemaining: number | null, status: string): { label: string; color: string } | null {
  if (status === 'expired' || status === 'pending_review') return { label: '已到期', color: 'bg-red-100 text-red-700' };
  if (daysRemaining !== null && daysRemaining <= 0) return { label: '今日到期', color: 'bg-red-100 text-red-700' };
  if (daysRemaining !== null && daysRemaining <= 3) return { label: `${daysRemaining}天后到期`, color: 'bg-orange-100 text-orange-700' };
  if (daysRemaining !== null && daysRemaining <= 7) return { label: `${daysRemaining}天后到期`, color: 'bg-amber-100 text-amber-700' };
  if (daysRemaining !== null && daysRemaining <= 14) return { label: `${daysRemaining}天后到期`, color: 'bg-yellow-50 text-yellow-700' };
  return null;
}

function validateAndExtractIDCard(idCard: string): { valid: boolean; name?: string; gender?: string; birthday?: string; error?: string } {
  const cleaned = idCard.replace(/\s/g, '');
  if (cleaned.length !== 18) return { valid: false, error: '身份证号必须是18位' };
  if (!/^\d{17}[\dXx]$/.test(cleaned)) return { valid: false, error: '身份证号格式不正确' };
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(cleaned[i]) * weights[i];
  const checkCode = checkCodes[sum % 11];
  if (cleaned[17].toUpperCase() !== checkCode) return { valid: false, error: '身份证号校验码不正确' };
  const gender = parseInt(cleaned[16]) % 2 === 0 ? '女' : '男';
  const birthday = `${cleaned.slice(6, 10)}-${cleaned.slice(10, 12)}-${cleaned.slice(12, 14)}`;
  return { valid: true, gender, birthday };
}

interface Contract {
  id: string;
  title: string;
  type: string;
  party_a_id: string | null;
  party_b_id: string | null;
  party_b_name: string;
  party_b_phone: string;
  party_b_id_card: string | null;
  course_id: string | null;
  price: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  signed_at: string | null;
  created_at: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ContractType | ''>('');
  const [expiryTab, setExpiryTab] = useState<ExpiryTab>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  const [newContract, setNewContract] = useState({
    type: '' as ContractType | '',
    partyB: '',
    partyBPhone: '',
    partyBIdCard: '',
  });
  const [idCardError, setIdCardError] = useState('');
  const [idCardInfo, setIdCardInfo] = useState<{ gender?: string; birthday?: string }>({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch('/api/contracts', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.data) setContracts(result.data);
      else setContracts([]);
    } catch (err) {
      console.error('加载合同失败:', err);
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredContracts = contracts.filter(c => {
    if (filterType && c.type !== filterType) return false;

    const daysRemaining = getDaysRemaining(c.end_date);
    const isExpired = c.status === 'expired' || c.status === 'pending_review' || (daysRemaining !== null && daysRemaining <= 0);
    const isExpiring = !isExpired && daysRemaining !== null && daysRemaining <= 7;
    const isActive = !isExpired && !isExpiring && (c.status === 'active' || c.status === 'signed');

    if (expiryTab === 'active' && !isActive) return false;
    if (expiryTab === 'expiring' && !isExpiring) return false;
    if (expiryTab === 'expired' && !isExpired) return false;

    if (search) {
      const s = search.toLowerCase();
      if (!c.party_b_name?.toLowerCase().includes(s) && !c.title?.toLowerCase().includes(s) && !(c.party_b_id_card || '').includes(s))
        return false;
    }
    return true;
  });

  // 统计各Tab数量
  const expiryCounts = {
    all: contracts.length,
    active: contracts.filter(c => {
      const d = getDaysRemaining(c.end_date);
      return !(c.status === 'expired' || c.status === 'pending_review' || (d !== null && d <= 0)) && !(d !== null && d <= 7 && d > 0) && (c.status === 'active' || c.status === 'signed');
    }).length,
    expiring: contracts.filter(c => {
      const d = getDaysRemaining(c.end_date);
      return !(c.status === 'expired' || c.status === 'pending_review' || (d !== null && d <= 0)) && d !== null && d <= 7;
    }).length,
    expired: contracts.filter(c => {
      const d = getDaysRemaining(c.end_date);
      return c.status === 'expired' || c.status === 'pending_review' || (d !== null && d <= 0);
    }).length,
  };

  const handleIdCardChange = (idCard: string) => {
    setNewContract({ ...newContract, partyBIdCard: idCard });
    setIdCardError('');
    setIdCardInfo({});
    if (idCard.length === 18) {
      const result = validateAndExtractIDCard(idCard);
      if (result.valid) { setIdCardInfo({ gender: result.gender, birthday: result.birthday }); setIdCardError(''); }
      else setIdCardError(result.error || '身份证号不正确');
    }
  };

  async function handleCreate() {
    if (!newContract.type || !newContract.partyB || !newContract.partyBPhone) return;
    if (newContract.partyBIdCard) {
      const result = validateAndExtractIDCard(newContract.partyBIdCard);
      if (!result.valid) { setIdCardError(result.error || '身份证号不正确'); return; }
    }
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: CONTRACT_TYPE_LABELS[newContract.type as ContractType] || newContract.type,
          type: newContract.type,
          party_b_name: newContract.partyB,
          party_b_phone: newContract.partyBPhone,
          party_b_id_card: newContract.partyBIdCard || undefined,
        }),
      });
      const result = await res.json();
      if (!result.success) { alert('创建失败：' + (result.error || '请重试')); return; }
      setShowCreate(false);
      setNewContract({ type: '', partyB: '', partyBPhone: '', partyBIdCard: '' });
      setIdCardError('');
      setIdCardInfo({});
      loadData();
    } catch (err) { console.error('创建合同失败:', err); alert('创建失败，请重试'); }
  }

  async function handleSend(id: string) {
    try {
      const res = await fetch('/api/contracts', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id, status: 'sent' }) });
      const result = await res.json();
      if (!result.success) { alert('操作失败：' + (result.error || '请重试')); return; }
      loadData();
    } catch (err) { console.error('发送合同失败:', err); alert('操作失败，请重试'); }
  }

  async function handleSimulateSign(id: string) {
    try {
      const res = await fetch('/api/contracts', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: 'signed', signed_at: new Date().toISOString().slice(0, 10) }),
      });
      const result = await res.json();
      if (!result.success) { alert('操作失败：' + (result.error || '请重试')); return; }
      setShowDetail(null);
      loadData();
    } catch (err) { console.error('模拟签署失败:', err); alert('操作失败，请重试'); }
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">加载中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">合同管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理平台与合作方的合同，支持微信小程序分享签署</p>
        </div>
        <Link href="/admin/contract-templates">
          <Button variant="outline" className="gap-1"><Link2 className="h-4 w-4" /> 合同模板管理</Button>
        </Link>
      </div>

      {/* 到期Tab切换 */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {EXPIRY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setExpiryTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              expiryTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs ${expiryTab === tab.key ? 'text-amber-600' : 'text-slate-400'}`}>({expiryCounts[tab.key]})</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索签约方、合同标题、身份证号" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value as ContractType | '')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-white">
          <option value="">全部类型</option>
          {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button onClick={() => setShowCreate(true)} className="gap-1 bg-amber-500 hover:bg-amber-600"><Plus className="h-4 w-4" /> 新建合同</Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-slate-600 font-medium">合同类型</th>
              <th className="text-left p-3 text-slate-600 font-medium">标题</th>
              <th className="text-left p-3 text-slate-600 font-medium">乙方</th>
              <th className="text-left p-3 text-slate-600 font-medium">到期日期</th>
              <th className="text-left p-3 text-slate-600 font-medium">剩余天数</th>
              <th className="text-left p-3 text-slate-600 font-medium">状态</th>
              <th className="text-left p-3 text-slate-600 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredContracts.map(c => {
              const daysRemaining = getDaysRemaining(c.end_date);
              const expiryBadge = getExpiryBadge(daysRemaining, c.status);
              const highlight = getExpiryHighlight(daysRemaining, c.status);
              return (
                <tr key={c.id} className={`border-t border-slate-50 hover:bg-slate-50 ${highlight}`}>
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{CONTRACT_TYPE_LABELS[c.type as ContractType] || c.type}</span></td>
                  <td className="p-3 text-slate-700">{c.title || '-'}</td>
                  <td className="p-3 font-medium text-slate-800">{c.party_b_name || '-'}</td>
                  <td className="p-3 text-slate-600">{c.end_date ? new Date(c.end_date).toLocaleDateString() : '-'}</td>
                  <td className="p-3">
                    {expiryBadge ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${expiryBadge.color}`}>{expiryBadge.label}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                      {CONTRACT_STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowDetail(c.id)} className="text-xs text-blue-600 flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> 查看</button>
                      {c.status === 'draft' && (
                        <button onClick={() => handleSend(c.id)} className="text-xs text-amber-600 flex items-center gap-1"><Send className="h-3.5 w-3.5" /> 发送</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredContracts.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">暂无合同</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 新建合同弹窗 */}
      <Dialog open={showCreate} onOpenChange={() => { setShowCreate(false); setIdCardError(''); setIdCardInfo({}); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建合同</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>合同类型</Label>
              <select value={newContract.type} onChange={e => setNewContract({ ...newContract, type: e.target.value as ContractType })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1">
                <option value="">请选择</option>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label>乙方身份证号码</Label>
              <Input value={newContract.partyBIdCard} onChange={e => handleIdCardChange(e.target.value)} placeholder="输入18位身份证号码" maxLength={18} className={idCardError ? 'border-red-400' : idCardInfo.gender ? 'border-green-400' : ''} />
              {idCardError && <p className="text-xs text-red-500 mt-1">{idCardError}</p>}
              {idCardInfo.gender && (
                <div className="mt-1 flex gap-3 text-xs text-green-600"><span>性别：{idCardInfo.gender}</span><span>出生日期：{idCardInfo.birthday}</span></div>
              )}
            </div>
            <div><Label>乙方（签约方）姓名</Label><Input value={newContract.partyB} onChange={e => setNewContract({ ...newContract, partyB: e.target.value })} placeholder="输入签约方姓名（需与身份证一致）" /></div>
            <div><Label>乙方手机号（用于短信验证签署）</Label><Input value={newContract.partyBPhone} onChange={e => setNewContract({ ...newContract, partyBPhone: e.target.value })} placeholder="输入手机号" /></div>
            <p className="text-xs text-muted-foreground">创建后可发送给乙方，乙方通过微信小程序打开并短信验证码确认签署</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setIdCardError(''); setIdCardInfo({}); }}>取消</Button>
              <Button onClick={handleCreate} disabled={!newContract.type || !newContract.partyB || !newContract.partyBPhone} className="bg-amber-500 hover:bg-amber-600">创建</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 合同详情弹窗 */}
      <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>合同详情</DialogTitle></DialogHeader>
          {showDetail && (() => {
            const c = contracts.find(ct => ct.id === showDetail);
            if (!c) return null;
            const daysRemaining = getDaysRemaining(c.end_date);
            const expiryBadge = getExpiryBadge(daysRemaining, c.status);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-400">合同类型：</span><span className="font-medium">{CONTRACT_TYPE_LABELS[c.type as ContractType] || c.type}</span></div>
                  <div><span className="text-slate-400">状态：</span><Badge className={CONTRACT_STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}>{CONTRACT_STATUS_LABELS[c.status] || c.status}</Badge></div>
                  <div><span className="text-slate-400">标题：</span><span className="font-medium">{c.title || '-'}</span></div>
                  <div><span className="text-slate-400">乙方：</span><span className="font-medium">{c.party_b_name || '-'}</span></div>
                  <div><span className="text-slate-400">身份证号：</span><span className="font-medium font-mono">{c.party_b_id_card || '-'}</span></div>
                  <div><span className="text-slate-400">乙方电话：</span><span className="font-medium">{c.party_b_phone || '-'}</span></div>
                  {c.price !== null && <div><span className="text-slate-400">金额：</span><span className="font-medium">¥{c.price}</span></div>}
                  <div><span className="text-slate-400">创建日期：</span><span>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</span></div>
                  {c.signed_at && <div><span className="text-slate-400">签署日期：</span><span className="text-green-600">{new Date(c.signed_at).toLocaleDateString()}</span></div>}
                  {c.start_date && <div><span className="text-slate-400">开始日期：</span><span>{new Date(c.start_date).toLocaleDateString()}</span></div>}
                  {c.end_date && <div><span className="text-slate-400">结束日期：</span><span>{new Date(c.end_date).toLocaleDateString()}</span></div>}
                  {daysRemaining !== null && (
                    <div>
                      <span className="text-slate-400">剩余天数：</span>
                      {expiryBadge ? <span className={`text-xs px-2 py-0.5 rounded-full ${expiryBadge.color}`}>{expiryBadge.label}</span> : <span className="text-green-600">{daysRemaining}天</span>}
                    </div>
                  )}
                </div>

                {/* 到期提醒 */}
                {(daysRemaining !== null && daysRemaining <= 7) && (
                  <div className={`border rounded-lg p-3 ${daysRemaining <= 0 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                    <p className="text-xs font-semibold flex items-center gap-1">
                      {daysRemaining <= 0 ? <><AlertTriangle className="h-3.5 w-3.5 text-red-600" /><span className="text-red-700">合同已到期</span></> : <><Clock className="h-3.5 w-3.5 text-amber-600" /><span className="text-amber-700">合同即将到期</span></>}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{daysRemaining <= 0 ? '请及时处理合同续签或关闭' : `距离合同到期还有 ${daysRemaining} 天，请提前安排续签`}</p>
                  </div>
                )}

                {/* 签署流程说明 */}
                <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-700 mb-2">签署流程</p>
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <span className={`flex items-center gap-1 ${c.status === 'draft' ? 'font-bold' : ''}`}><span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs">1</span> 创建合同</span>
                    <span className="text-amber-300">→</span>
                    <span className={`flex items-center gap-1 ${c.status === 'sent' ? 'font-bold' : ''}`}><span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs">2</span> 微信分享给乙方</span>
                    <span className="text-amber-300">→</span>
                    <span className={`flex items-center gap-1 ${c.status === 'signed' ? 'font-bold' : ''}`}><span className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xs">3</span> 短信验证签署</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDetail(null)}>关闭</Button>
                  {c.status === 'draft' && <Button onClick={() => { handleSend(c.id); setShowDetail(null); }} className="gap-1 bg-amber-500 hover:bg-amber-600"><Send className="h-4 w-4" /> 发送给乙方</Button>}
                  {c.status === 'sent' && <Button onClick={() => handleSimulateSign(c.id)} className="gap-1 bg-green-600 hover:bg-green-700"><CheckCircle className="h-4 w-4" /> 模拟签署完成</Button>}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

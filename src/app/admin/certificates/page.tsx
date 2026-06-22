'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Award, CheckCircle, Clock, Plus, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  certificate_url: string | null;
  issued_by: string | null;
  status: string;
  issue_date: string | null;
  created_at: string;
  // joined
  worker_name?: string;
  course_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  issued: { label: '已颁发', color: 'bg-green-100 text-green-800 border-green-200' },
  revoked: { label: '已吊销', color: 'bg-red-100 text-red-800 border-red-200' },
  expired: { label: '已过期', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');

  // Issue dialog
  const [showIssue, setShowIssue] = useState(false);
  const [issueForm, setIssueForm] = useState({ user_id: '', course_id: '', title: '' });
  const [issuing, setIssuing] = useState(false);

  // workers and courses for select
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/certificates', { headers: getAuthHeaders() });
      const result = await res.json();
      const certs: Certificate[] = result.ok ? (result.data || []) : [];

      // 批量查询 worker 和 course 名称
      if (certs.length > 0) {
        const workerIds = [...new Set(certs.map(c => c.user_id).filter(Boolean))];
        const courseIds = [...new Set(certs.map(c => c.course_id).filter(Boolean))];

        const [workersRes, coursesRes] = await Promise.all([
          fetch('/api/workers', { headers: getAuthHeaders() }),
          fetch('/api/courses', { headers: getAuthHeaders() }),
        ]);

        const wData = (await workersRes.json()).ok ? ((await workersRes.json()).data || []) : [];
        const cData = (await coursesRes.json()).ok ? ((await coursesRes.json()).data || []) : [];

        const wMap: Record<string, string> = {};
        (Array.isArray(wData) ? wData : []).forEach((w: Record<string, unknown>) => { wMap[w.id as string] = (w.name as string) || ''; });
        const cMap: Record<string, string> = {};
        (Array.isArray(cData) ? cData : []).forEach((c: Record<string, unknown>) => { cMap[c.id as string] = (c.name as string) || ''; });

        certs.forEach(c => {
          c.worker_name = wMap[c.user_id] || c.user_id;
          c.course_name = cMap[c.course_id] || c.course_id;
        });
      }

      setCertificates(certs);
    } catch (err) {
      console.error('[certificates] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load workers/courses for issue form
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [wRes, cRes] = await Promise.all([
          fetch('/api/workers', { headers: getAuthHeaders() }),
          fetch('/api/courses', { headers: getAuthHeaders() }),
        ]);
        const wResult = await wRes.json();
        const cResult = await cRes.json();
        setWorkers((wResult.ok ? (wResult.data || []) : []).map((w: Record<string, unknown>) => ({ id: w.id as string, name: (w.name as string) || (w.id as string) })));
        setCourses((cResult.ok ? (cResult.data || []) : []).map((c: Record<string, unknown>) => ({ id: c.id as string, name: (c.name as string) || (c.id as string) })));
      } catch { /* ignore */ }
    };
    loadRefs();
  }, []);

  useEffect(() => { loadCertificates(); }, [loadCertificates]);

  const handleIssue = async () => {
    if (!issueForm.user_id || !issueForm.course_id) { setMessage('请选择阿姨和课程'); return; }
    setIssuing(true);
    try {
      const worker = workers.find(w => w.id === issueForm.user_id);
      const course = courses.find(c => c.id === issueForm.course_id);
      const title = issueForm.title || `${course?.name || '课程'} - 结业证书`;

      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: issueForm.user_id, course_id: issueForm.course_id, title }),
      });
      const result = await res.json();
      if (result.ok) {
        setShowIssue(false);
        setIssueForm({ user_id: '', course_id: '', title: '' });
        setMessage('证书颁发成功');
        loadCertificates();
      } else {
        setMessage(result.error || '颁发失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setIssuing(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('确认吊销该证书？此操作不可逆。')) return;
    try {
      const res = await fetch('/api/certificates', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id, status: 'revoked' }),
      });
      const result = await res.json();
      if (result.ok) { setMessage('证书已吊销'); loadCertificates(); }
      else setMessage(result.error || '操作失败');
    } catch { setMessage('网络错误'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const filtered = certificates.filter(c => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchSearch = !searchQuery ||
      c.worker_name?.includes(searchQuery) ||
      c.course_name?.includes(searchQuery) ||
      c.title?.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const tabs = [
    { key: 'all', label: '全部', count: certificates.length },
    { key: 'issued', label: '已颁发', count: certificates.filter(r => r.status === 'issued').length },
    { key: 'revoked', label: '已吊销', count: certificates.filter(r => r.status === 'revoked').length },
    { key: 'expired', label: '已过期', count: certificates.filter(r => r.status === 'expired').length },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">证书管理</h1>
          <p className="text-sm text-slate-500 mt-1">
            管理培训结业证书的颁发与吊销 · 颁发模式可在「系统设置→证书设置」中切换自动/手动
          </p>
        </div>
        <Button onClick={() => setShowIssue(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> 手动颁发证书
        </Button>
      </div>

      {message && (
        <div className={cn('p-3 rounded-lg text-sm', message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              statusFilter === tab.key
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="搜索阿姨名/课程名/证书名称..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无证书记录</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(cert => (
            <Card key={cert.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Award className="w-5 h-5 text-amber-500" />
                      <h3 className="font-semibold text-slate-800">{cert.title}</h3>
                      <Badge className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_CONFIG[cert.status]?.color || 'bg-slate-100')}>
                        {STATUS_CONFIG[cert.status]?.label || cert.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">持证人</div>
                        <div className="text-sm text-slate-600">{cert.worker_name || cert.user_id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">课程</div>
                        <div className="text-sm text-slate-600">{cert.course_name || cert.course_id}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">颁发日期</div>
                        <div className="text-sm text-slate-600">
                          {cert.issue_date || new Date(cert.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">证书ID</div>
                        <div className="text-sm font-mono text-slate-400 text-xs">{cert.id.slice(0, 16)}...</div>
                      </div>
                    </div>
                  </div>
                  {cert.status === 'issued' && (
                    <Button size="sm" variant="outline" className="text-red-500 border-red-200 ml-4"
                      onClick={() => handleRevoke(cert.id)}>
                      吊销
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Issue Dialog */}
      <Dialog open={showIssue} onOpenChange={setShowIssue}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              手动颁发证书
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>持证阿姨 *</Label>
              <Select value={issueForm.user_id} onValueChange={v => setIssueForm(prev => ({ ...prev, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="选择阿姨" /></SelectTrigger>
                <SelectContent>
                  {workers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>课程 *</Label>
              <Select value={issueForm.course_id} onValueChange={v => setIssueForm(prev => ({ ...prev, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="选择课程" /></SelectTrigger>
                <SelectContent>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">证书名称</Label>
              <Input id="title" placeholder="如：高级母婴护理 - 结业证书" value={issueForm.title}
                onChange={e => setIssueForm(prev => ({ ...prev, title: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssue(false)}>取消</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleIssue} disabled={issuing || !issueForm.user_id || !issueForm.course_id}>
              {issuing ? '颁发中...' : '确认颁发'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

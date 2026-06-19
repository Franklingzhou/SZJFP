'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Eye, Edit, Share2, Phone, X, GraduationCap, BookOpen, Pause, Play, Ban, PauseCircle, PlayCircle, ShieldBan, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { REVIEW_SOURCE_LABELS, RESUME_REVIEW_STATUS_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { cn, formatCurrency, getCreditScoreColor, getCreditScoreBg, getStatusColor } from '@/lib/utils';
import { WORKER_STATUS_LABELS, JOB_TYPES } from '@/lib/types';
import type { WorkerProfile } from '@/lib/types';

export default function WorkersPage() {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [editingWorker, setEditingWorker] = useState<WorkerProfile | null>(null);
  const [shareWorker, setShareWorker] = useState<WorkerProfile | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [pauseWorker, setPauseWorker] = useState<WorkerProfile | null>(null);
  const [pauseAction, setPauseAction] = useState<'pause' | 'resume' | 'blacklist'>('pause');
  const [pauseReason, setPauseReason] = useState('');
  // Edit form state
  const [editForm, setEditForm] = useState<Partial<WorkerProfile>>({});
  // Create form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', phone: '', age: '', origin: '', gender: '女',
    jobTypes: [] as string[], experienceYears: '', expectedSalaryMin: '', expectedSalaryMax: '',
    specialties: [] as string[], certifications: [] as string[], availableDate: '',
  });
  const [creating, setCreating] = useState(false);

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    if (token) headers['x-session'] = token;
    return headers;
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workers', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.data) {
        // API返回蛇形字段，前端用驼峰；数组字段做null兜底
        const safeWorkers = (json.data as any[]).map((w: any) => ({
          ...w,
          jobTypes: (w.jobTypes || w.job_types || '').split(',').filter(Boolean),
          experienceYears: w.experienceYears ?? w.experience_years ?? 0,
          expectedSalaryMin: w.expectedSalaryMin ?? w.expected_salary_min ?? 0,
          expectedSalaryMax: w.expectedSalaryMax ?? w.expected_salary_max ?? 0,
          availableDate: w.availableDate ?? w.available_date ?? '',
          creatorId: w.creatorId ?? w.creator_id ?? '',
          creatorRole: w.creatorRole ?? w.creator_role ?? '',
          creatorName: w.creatorName ?? '',
          maintainerName: w.maintainerName ?? '',
          referrerName: w.referrerName ?? '',
          creditScore: w.creditScore ?? w.credit_score ?? 1000,
          resumeReviewStatus: w.resumeReviewStatus ?? w.resume_review_status ?? 'none',
          specialties: Array.isArray(w.specialties) ? w.specialties : (typeof w.specialties === 'string' && w.specialties ? w.specialties.split(',').filter(Boolean) : []),
          certifications: Array.isArray(w.certifications) ? w.certifications : (typeof w.certifications === 'string' && w.certifications ? w.certifications.split(',').filter(Boolean) : []),
          creditRecords: w.creditRecords || [],
          reviews: w.reviews || [],
          idCard: w.idCard ?? w.id_card ?? '',
          deposit: w.deposit ?? 0,
          points: w.points ?? 0,
        }));
        setWorkers(safeWorkers);
      }
    } catch (e) {
      console.error('[workers] load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = workers.filter((w) => {
    const matchSearch =
      !search || w.name.includes(search) || (w.origin || '').includes(search) || (w.phone || '').includes(search);
    const matchJob = jobFilter === 'all' || (w.jobTypes || []).includes(jobFilter as never);
    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchSearch && matchJob && matchStatus;
  });

  const handleEdit = (worker: WorkerProfile) => {
    setEditingWorker(worker);
    setEditForm({
      name: worker.name,
      phone: worker.phone,
      age: worker.age,
      origin: worker.origin,
      experienceYears: worker.experienceYears,
      expectedSalaryMin: worker.expectedSalaryMin,
      expectedSalaryMax: worker.expectedSalaryMax,
      specialties: worker.specialties,
      certifications: worker.certifications,
      availableDate: worker.availableDate,
    });
  };

  const handleSaveEdit = async () => {
    if (editingWorker) {
      try {
        const res = await fetch('/api/workers', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            id: editingWorker.id,
            name: editForm.name,
            phone: editForm.phone,
            age: editForm.age,
            origin: editForm.origin,
            experience_years: editForm.experienceYears,
            expected_salary_min: editForm.expectedSalaryMin,
            expected_salary_max: editForm.expectedSalaryMax,
            specialties: editForm.specialties,
            certifications: editForm.certifications,
            available_date: editForm.availableDate,
          }),
        });
        const json = await res.json();
        if (json.success || json.ok) {
          setEditingWorker(null);
          setEditForm({});
          loadData();
        } else {
          alert('保存失败: ' + (json.error || '未知错误'));
        }
      } catch (e) {
        alert('保存失败: 网络错误');
      }
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.phone) {
      alert('请填写姓名和手机号');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: createForm.name,
          phone: createForm.phone,
          age: createForm.age ? Number(createForm.age) : undefined,
          origin: createForm.origin || undefined,
          gender: createForm.gender,
          job_types: createForm.jobTypes,
          experience_years: createForm.experienceYears ? Number(createForm.experienceYears) : undefined,
          specialties: createForm.specialties,
          certifications: createForm.certifications,
          expected_salary_min: createForm.expectedSalaryMin ? Number(createForm.expectedSalaryMin) : undefined,
          expected_salary_max: createForm.expectedSalaryMax ? Number(createForm.expectedSalaryMax) : undefined,
        }),
      });
      const json = await res.json();
      if (json.ok || json.success) {
        setShowCreateDialog(false);
        setCreateForm({
          name: '', phone: '', age: '', origin: '', gender: '女',
          jobTypes: [], experienceYears: '', expectedSalaryMin: '', expectedSalaryMax: '',
          specialties: [], certifications: [], availableDate: '',
        });
        loadData();
      } else {
        alert('创建失败: ' + (json.error || '未知错误'));
      }
    } catch {
      alert('创建失败: 网络错误');
    } finally {
      setCreating(false);
    }
  };

  const handleShare = (worker: WorkerProfile) => {
    setShareWorker(worker);
    setShareCopied(false);
  };

  const copyShareLink = () => {
    const domain = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${domain}/resume/${shareWorker?.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  // 暂停/恢复/拉黑阿姨
  const handleStatusAction = async () => {
    if (!pauseWorker) return;
    const headers = getAuthHeaders();
    try {
      if (pauseAction === 'pause') {
        const res = await fetch(`/api/workers/${pauseWorker.id}/pause`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ pause_reason: pauseReason || undefined }),
        });
        const data = await res.json();
        if (!data.ok) { alert(data.error || '操作失败'); return; }
      } else if (pauseAction === 'resume') {
        const res = await fetch(`/api/workers/${pauseWorker.id}/resume`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!data.ok) { alert(data.error || '操作失败'); return; }
      } else if (pauseAction === 'blacklist') {
        const res = await fetch(`/api/workers/${pauseWorker.id}/blacklist`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ blacklist_reason: pauseReason || undefined }),
        });
        const data = await res.json();
        if (!data.ok) { alert(data.error || '操作失败'); return; }
      }
      setShowPauseDialog(false);
      setPauseWorker(null);
      setPauseReason('');
      // 刷新页面数据
      window.location.reload();
    } catch { alert('网络错误'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">阿姨库管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理所有阿姨简历、状态与评价信息</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 gap-1">
          <Plus className="h-4 w-4" />
          新建阿姨
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名、籍贯、手机号..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={jobFilter} onValueChange={setJobFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="工种筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部工种</SelectItem>
                {JOB_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="idle">空闲</SelectItem>
                <SelectItem value="working">在户</SelectItem>
                <SelectItem value="pending">待定</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Worker List */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map((worker) => (
          <Card key={worker.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center text-lg font-bold text-amber-700 shrink-0">
                  {worker.name[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">{worker.name}</span>
                    <span className="text-sm text-muted-foreground">{worker.age}岁 · {worker.origin}</span>
                    <Badge className={cn('text-xs', getStatusColor(worker.status))}>
                      {WORKER_STATUS_LABELS[worker.status]}
                    </Badge>
                    {/* 暂停/恢复/拉黑按钮 */}
                    {(worker.status === 'idle') ? (
                      <Button size="sm" variant="outline" className="h-6 text-xs border-amber-300 text-amber-600 hover:bg-amber-50"
                        onClick={() => { setPauseWorker(worker); setPauseAction('pause'); setShowPauseDialog(true); }}>
                        <PauseCircle className="w-3 h-3 mr-1" />暂停
                      </Button>
                    ) : worker.status === 'paused' ? (
                      <Button size="sm" variant="outline" className="h-6 text-xs border-green-300 text-green-600 hover:bg-green-50"
                        onClick={() => { setPauseWorker(worker); setPauseAction('resume'); setShowPauseDialog(true); }}>
                        <PlayCircle className="w-3 h-3 mr-1" />恢复
                      </Button>
                    ) : null}
                    {worker.status !== 'blacklisted' && (
                      <Button size="sm" variant="outline" className="h-6 text-xs border-red-300 text-red-500 hover:bg-red-50"
                        onClick={() => { setPauseWorker(worker); setPauseAction('blacklist'); setShowPauseDialog(true); }}>
                        <ShieldBan className="w-3 h-3 mr-1" />拉黑
                      </Button>
                    )}
                    <Badge
                      className={cn('text-xs border', getCreditScoreBg(worker.creditScore))}
                    >
                      诚信 {worker.creditScore}
                    </Badge>
                    <Badge
                      className={cn('text-xs border', worker.resumeReviewStatus === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : worker.resumeReviewStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : worker.resumeReviewStatus === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-600 border-slate-200')}
                    >
                      {RESUME_REVIEW_STATUS_LABELS[worker.resumeReviewStatus]}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {worker.jobTypes.map((jt) => (
                      <Badge key={jt} variant="outline" className="text-xs">
                        {jt}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">经验：</span>
                      <span className="font-medium">{worker.experienceYears}年</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">期望薪资：</span>
                      <span className="font-medium">
                        {formatCurrency(worker.expectedSalaryMin)}-{formatCurrency(worker.expectedSalaryMax)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{worker.phone}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">可到岗：</span>
                      <span className="font-medium">{worker.availableDate}</span>
                    </div>
                  </div>

                  <div className="mt-1.5 grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">录入人：</span>
                      <span className="font-medium">{worker.creatorName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">维护人：</span>
                      <span className="font-medium">{worker.maintainerName || worker.creatorName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">推荐人：</span>
                      <span className="font-medium">{worker.referrerName || '-'}</span>
                    </div>
                  </div>

                  {worker.specialties.length > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">擅长：</span>
                      {worker.specialties.join('、')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setSelectedWorker(worker)}>
                        <Eye className="h-4 w-4" />
                        详情
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <WorkerDetailDialog worker={selectedWorker} onEdit={handleEdit} onShare={handleShare} />
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleEdit(worker)}>
                    <Edit className="h-4 w-4" />
                    编辑
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => handleShare(worker)}>
                    <Share2 className="h-4 w-4" />
                    分享
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            未找到匹配的阿姨
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingWorker} onOpenChange={(open) => { if (!open) { setEditingWorker(null); setEditForm({}); } }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑阿姨简历 - {editingWorker?.name}</DialogTitle>
          </DialogHeader>
          {editingWorker && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>姓名</Label>
                  <Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div>
                  <Label>手机号</Label>
                  <Input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </div>
                <div>
                  <Label>年龄</Label>
                  <Input type="number" value={editForm.age || ''} onChange={(e) => setEditForm({ ...editForm, age: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>籍贯</Label>
                  <Input value={editForm.origin || ''} onChange={(e) => setEditForm({ ...editForm, origin: e.target.value })} />
                </div>
                <div>
                  <Label>经验(年)</Label>
                  <Input type="number" value={editForm.experienceYears || ''} onChange={(e) => setEditForm({ ...editForm, experienceYears: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>可到岗日期</Label>
                  <Input value={editForm.availableDate || ''} onChange={(e) => setEditForm({ ...editForm, availableDate: e.target.value })} />
                </div>
                <div>
                  <Label>期望薪资最低</Label>
                  <Input type="number" value={editForm.expectedSalaryMin || ''} onChange={(e) => setEditForm({ ...editForm, expectedSalaryMin: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>期望薪资最高</Label>
                  <Input type="number" value={editForm.expectedSalaryMax || ''} onChange={(e) => setEditForm({ ...editForm, expectedSalaryMax: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>特长(逗号分隔)</Label>
                <Input value={(editForm.specialties || []).join('、')} onChange={(e) => setEditForm({ ...editForm, specialties: e.target.value.split(/[、,，]/).filter(Boolean) })} />
              </div>
              <div>
                <Label>证书(逗号分隔)</Label>
                <Input value={(editForm.certifications || []).join('、')} onChange={(e) => setEditForm({ ...editForm, certifications: e.target.value.split(/[、,，]/).filter(Boolean) })} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setEditingWorker(null); setEditForm({}); }}>取消</Button>
                <Button onClick={handleSaveEdit} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">保存</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) setShowCreateDialog(false); }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建阿姨简历</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>姓名 *</Label>
                <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="请输入姓名" />
              </div>
              <div>
                <Label>手机号 *</Label>
                <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="请输入手机号" />
              </div>
              <div>
                <Label>年龄</Label>
                <Input value={createForm.age} onChange={(e) => setCreateForm({ ...createForm, age: e.target.value })} placeholder="请输入年龄" />
              </div>
              <div>
                <Label>籍贯</Label>
                <Input value={createForm.origin} onChange={(e) => setCreateForm({ ...createForm, origin: e.target.value })} placeholder="请输入籍贯" />
              </div>
              <div>
                <Label>性别</Label>
                <Select value={createForm.gender} onValueChange={(v) => setCreateForm({ ...createForm, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="女">女</SelectItem>
                    <SelectItem value="男">男</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>经验(年)</Label>
                <Input value={createForm.experienceYears} onChange={(e) => setCreateForm({ ...createForm, experienceYears: e.target.value })} placeholder="请输入经验年限" />
              </div>
              <div>
                <Label>期望薪资最低</Label>
                <Input value={createForm.expectedSalaryMin} onChange={(e) => setCreateForm({ ...createForm, expectedSalaryMin: e.target.value })} placeholder="月薪最低" />
              </div>
              <div>
                <Label>期望薪资最高</Label>
                <Input value={createForm.expectedSalaryMax} onChange={(e) => setCreateForm({ ...createForm, expectedSalaryMax: e.target.value })} placeholder="月薪最高" />
              </div>
            </div>
            <div>
              <Label>工种(多选)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {JOB_TYPES.map((jt) => (
                  <Badge
                    key={jt}
                    variant={createForm.jobTypes.includes(jt) ? 'default' : 'outline'}
                    className={cn('cursor-pointer', createForm.jobTypes.includes(jt) ? 'bg-[#1e3a5f]' : 'hover:bg-slate-100')}
                    onClick={() => {
                      setCreateForm({
                        ...createForm,
                        jobTypes: createForm.jobTypes.includes(jt)
                          ? createForm.jobTypes.filter((t) => t !== jt)
                          : [...createForm.jobTypes, jt],
                      });
                    }}
                  >
                    {jt}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>特长(逗号分隔)</Label>
              <Input value={createForm.specialties.join('、')} onChange={(e) => setCreateForm({ ...createForm, specialties: e.target.value.split(/[、,，]/).filter(Boolean) })} placeholder="如：做饭、带小孩、照顾老人" />
            </div>
            <div>
              <Label>证书(逗号分隔)</Label>
              <Input value={createForm.certifications.join('、')} onChange={(e) => setCreateForm({ ...createForm, certifications: e.target.value.split(/[、,，]/).filter(Boolean) })} placeholder="如：月嫂证、育婴师证" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
              <Button onClick={handleCreate} disabled={creating} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
                {creating ? '创建中...' : '创建'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={!!shareWorker} onOpenChange={(open) => { if (!open) setShareWorker(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>分享阿姨简历</DialogTitle>
          </DialogHeader>
          {shareWorker && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-lg font-bold text-amber-700">
                    {shareWorker.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold">{shareWorker.name}</div>
                    <div className="text-sm text-muted-foreground">{shareWorker.age}岁 · {shareWorker.origin} · {shareWorker.jobTypes.join('、')}</div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <div className="font-medium text-blue-800 mb-1">简历链接</div>
                <div className="text-blue-600 break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/resume/{shareWorker.id}</div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={copyShareLink}>
                  {shareCopied ? '已复制链接' : '复制链接'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => {
                  const domain = typeof window !== 'undefined' ? window.location.origin : '';
                  const text = `【阿姨推荐】${shareWorker.name}，${shareWorker.age}岁，${shareWorker.origin}人，${shareWorker.experienceYears}年经验，擅长${shareWorker.specialties.join('、')}，期望薪资${shareWorker.expectedSalaryMin}-${shareWorker.expectedSalaryMax}元。查看完整简历：${domain}/resume/${shareWorker.id}`;
                  navigator.clipboard.writeText(text);
                }}>
                  复制推荐语
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">复制链接后可发送到微信群、朋友圈，对方打开即可查看完整简历</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 暂停/恢复/拉黑确认弹窗 */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pauseAction === 'pause' ? '暂停接单' : pauseAction === 'resume' ? '恢复接单' : '加入黑名单'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-600">
              {pauseAction === 'pause' && `确认暂停 ${pauseWorker?.name} 的接单资格？暂停后该阿姨将不再出现在大厅列表中。`}
              {pauseAction === 'resume' && `确认恢复 ${pauseWorker?.name} 的接单资格？恢复后该阿姨将重新出现在大厅列表中。`}
              {pauseAction === 'blacklist' && `确认将 ${pauseWorker?.name} 加入黑名单？加入黑名单后该阿姨将无法接单。`}
            </p>
            {(pauseAction === 'pause' || pauseAction === 'blacklist') && (
              <div>
                <Label className="text-sm font-medium">
                  {pauseAction === 'pause' ? '暂停原因' : '拉黑原因'}
                </Label>
                <Input
                  value={pauseReason}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPauseReason(e.target.value)}
                  placeholder="请输入原因..."
                  className="mt-1"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseDialog(false)}>取消</Button>
            <Button
              className={pauseAction === 'blacklist' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600 text-white'}
              onClick={() => handleStatusAction()}
            >
              确认{pauseAction === 'pause' ? '暂停' : pauseAction === 'resume' ? '恢复' : '拉黑'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkerDetailDialog({ worker, onEdit, onShare }: { worker: WorkerProfile | null; onEdit: (w: WorkerProfile) => void; onShare: (w: WorkerProfile) => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'courses'>('info');
  const [courseEnrollments, setCourseEnrollments] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'courses' && worker?.user_id) {
      setCoursesLoading(true);
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      if (token) headers['x-session'] = token;
      fetch(`/api/enrollments?student_id=${worker.user_id}`, { headers })
        .then(r => r.json())
        .then(data => setCourseEnrollments(data.data || []))
        .catch(() => setCourseEnrollments([]))
        .finally(() => setCoursesLoading(false));
    }
  }, [activeTab, worker?.user_id]);

  if (!worker) return null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{worker.name} - 阿姨详情</DialogTitle>
      </DialogHeader>
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === 'info' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-slate-500 hover:text-slate-700')}
          onClick={() => setActiveTab('info')}
        >基本信息</button>
        <button
          className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors', activeTab === 'courses' ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-slate-500 hover:text-slate-700')}
          onClick={() => setActiveTab('courses')}
        >
          <GraduationCap className="h-4 w-4 inline mr-1" />课程记录
        </button>
      </div>
      <div className="space-y-6 mt-4">
        {activeTab === 'info' && (<>
        {/* Basic Info */}
        <div>
          <h3 className="font-semibold mb-3 text-slate-700">基本信息</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">姓名：</span>{worker.name}</div>
            <div><span className="text-muted-foreground">年龄：</span>{worker.age}岁</div>
            <div><span className="text-muted-foreground">籍贯：</span>{worker.origin}</div>
            <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">手机：</span><span className="font-medium text-[#1e3a5f]">{worker.phone}</span></div>
            <div><span className="text-muted-foreground">身份证：</span>{worker.idCard}</div>
            <div><span className="text-muted-foreground">状态：</span>{WORKER_STATUS_LABELS[worker.status]}</div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <h3 className="font-semibold mb-3 text-slate-700">技能信息</h3>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">工种：</span>{worker.jobTypes.join('、')}</div>
            <div><span className="text-muted-foreground">经验：</span>{worker.experienceYears}年</div>
            <div><span className="text-muted-foreground">擅长：</span>{worker.specialties.join('、')}</div>
            <div><span className="text-muted-foreground">证书：</span>{worker.certifications.join('、') || '无'}</div>
          </div>
        </div>

        {/* Salary & Availability */}
        <div>
          <h3 className="font-semibold mb-3 text-slate-700">薪资与状态</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">期望薪资：</span>{formatCurrency(worker.expectedSalaryMin)}-{formatCurrency(worker.expectedSalaryMax)}</div>
            <div><span className="text-muted-foreground">可到岗：</span>{worker.availableDate}</div>
          </div>
        </div>

        {/* Ownership */}
        <div>
          <h3 className="font-semibold mb-3 text-slate-700">归属信息</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><span className="text-muted-foreground">录入人：</span>{worker.creatorName}</div>
            <div><span className="text-muted-foreground">维护人：</span>{worker.maintainerName || worker.creatorName}</div>
            <div><span className="text-muted-foreground">推荐人：</span>{worker.referrerName || '-'}</div>
          </div>
        </div>

        {/* Credit */}
        <div>
          <h3 className="font-semibold mb-3 text-slate-700">诚信档案</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className={cn('text-3xl font-bold', getCreditScoreColor(worker.creditScore))}>
              {worker.creditScore}
            </div>
            <div className="text-sm text-muted-foreground">诚信分</div>
          </div>
          {worker.creditRecords.length > 0 && (
            <div className="space-y-2">
              {worker.creditRecords.map((cr) => (
                <div key={cr.id} className="flex items-center justify-between text-sm">
                  <span>{cr.event}</span>
                  <span className={cr.scoreChange > 0 ? 'text-green-600' : 'text-red-600'}>
                    {cr.scoreChange > 0 ? '+' : ''}{cr.scoreChange}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div>
          <h3 className="font-semibold mb-3 text-slate-700">评价记录</h3>
          {worker.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无评价</p>
          ) : (
            <div className="space-y-3">
              {worker.reviews.map((r) => (
                <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {REVIEW_SOURCE_LABELS[r.type] || r.type}
                      </Badge>
                      <span className="text-sm font-medium">{r.reviewerName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial */}
        <div>
          <h3 className="font-semibold mb-3 text-slate-700">保证金 & 积分</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">保证金：</span>
              <span className="font-medium">{formatCurrency(worker.deposit)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">积分：</span>
              <span className="font-medium">{worker.points}</span>
            </div>
          </div>
        </div>

        {/* Actions in Dialog */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" className="gap-1" onClick={() => onEdit(worker)}>
            <Edit className="h-4 w-4" /> 编辑简历
          </Button>
          <Button className="gap-1 bg-[#1e3a5f] hover:bg-[#1e3a5f]/90" onClick={() => onShare(worker)}>
            <Share2 className="h-4 w-4" /> 分享简历
          </Button>
        </div>
        </>)}

        {activeTab === 'courses' && (
          <div>
            <h3 className="font-semibold mb-3 text-slate-700 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />课程记录
            </h3>
            {coursesLoading ? (
              <div className="text-center py-8 text-slate-400">加载中...</div>
            ) : courseEnrollments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">暂无课程记录</div>
            ) : (
              <div className="space-y-2">
                {courseEnrollments.map((enr: any) => {
                  const statusMap: Record<string, { label: string; color: string }> = {
                    enrolled: { label: '已报名', color: 'bg-blue-100 text-blue-800' },
                    passed: { label: '已通过', color: 'bg-green-100 text-green-800' },
                    failed: { label: '未通过', color: 'bg-red-100 text-red-800' },
                  };
                  const st = statusMap[enr.status] || { label: enr.status, color: 'bg-slate-100 text-slate-500' };
                  return (
                    <div key={enr.id} className="flex items-center justify-between bg-slate-50 rounded px-4 py-3">
                      <div>
                        <div className="font-medium text-sm text-slate-800">课程ID: {enr.course_id?.slice(0, 8)}...</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          报名时间: {enr.enrolled_at?.slice(0, 10) || '--'}
                          {enr.graded_at && ` | 考核时间: ${enr.graded_at?.slice(0, 10)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {enr.score != null && (
                          <span className={cn('text-sm font-bold', enr.score >= 60 ? 'text-green-600' : 'text-red-600')}>
                            {enr.score}分
                          </span>
                        )}
                        <Badge className={cn('text-xs', st.color)}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </>
  );
}

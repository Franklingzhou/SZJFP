'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Plus, CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const SCHEDULE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-slate-100 text-slate-500' },
  pending: { label: '待审核', color: 'bg-amber-100 text-amber-800' },
  approved: { label: '已通过', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
};

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

function getCurrentRole(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('miniapp_role') || localStorage.getItem('auth_role') || '';
}

export default function CourseSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  // 新建排课弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    course_id: '', teacher_id: '', schedule_month: '', class_time: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // 审核弹窗
  const [showApprove, setShowApprove] = useState(false);
  const [approveItem, setApproveItem] = useState<any>(null);
  const [approveAction, setApproveAction] = useState<'approved' | 'rejected'>('approved');
  const [approveNote, setApproveNote] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schedRes, courseRes] = await Promise.all([
        fetch('/api/course-schedules', { headers: getAuthHeaders(false) }),
        fetch('/api/courses', { headers: getAuthHeaders(false) }),
      ]);
      const schedData = await schedRes.json();
      const courseData = await courseRes.json();
      if (schedData.ok || schedData.data) setSchedules(schedData.data || []);
      if (courseData.data) setCourses(courseData.data);
    } catch (e) {
      console.error('排课数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.course_id || !createForm.schedule_month || !createForm.class_time) {
      alert('请填写完整排课信息');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/course-schedules', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.ok) {
        setShowCreate(false);
        setCreateForm({ course_id: '', teacher_id: '', schedule_month: '', class_time: '' });
        loadData();
      } else {
        alert('创建失败: ' + (data.error || ''));
      }
    } catch (e) {
      alert('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openApproveDialog = (item: any, action: 'approved' | 'rejected') => {
    setApproveItem(item);
    setApproveAction(action);
    setApproveNote('');
    setShowApprove(true);
  };

  const handleApprove = async () => {
    if (!approveItem) return;
    setApproveSubmitting(true);
    try {
      const res = await fetch(`/api/course-schedules/${approveItem.id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: approveAction, review_note: approveNote }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowApprove(false);
        setApproveItem(null);
        loadData();
      } else {
        alert('审核失败: ' + (data.error || ''));
      }
    } catch (e) {
      alert('审核操作失败');
    } finally {
      setApproveSubmitting(false);
    }
  };

  // 生成近12个月选项
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = -1; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  // 筛选
  const filtered = schedules.filter((s: any) => {
    const matchMonth = !monthFilter || s.schedule_month === monthFilter;
    const matchCourse = courseFilter === 'all' || s.course_id === courseFilter;
    return matchMonth && matchCourse;
  });

  // 按月份分组
  const groupedByMonth: Record<string, any[]> = {};
  filtered.forEach((s: any) => {
    const month = s.schedule_month || '未指定';
    if (!groupedByMonth[month]) groupedByMonth[month] = [];
    groupedByMonth[month].push(s);
  });

  const isAdmin = getCurrentRole() === 'admin' || getCurrentRole() === 'training_supervisor';

  // 统计
  const statusCounts: Record<string, number> = {};
  schedules.forEach((s: any) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">课表管理</h1>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4 mr-2" />新建排课
        </Button>
      </div>

      {/* 统计栏 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部', count: schedules.length, color: 'bg-slate-50 border-slate-200' },
          { label: '草稿', count: statusCounts['draft'] || 0, color: 'bg-slate-50 border-slate-200' },
          { label: '待审核', count: statusCounts['pending'] || 0, color: 'bg-amber-50 border-amber-200' },
          { label: '已通过', count: statusCounts['approved'] || 0, color: 'bg-green-50 border-green-200' },
        ].map(item => (
          <Card key={item.label} className={cn('border', item.color)}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{item.count}</div>
              <div className="text-sm text-slate-500">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="选择月份" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部月份</SelectItem>
            {monthOptions.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="选择课程" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部课程</SelectItem>
            {courses.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 按月分组显示 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : Object.keys(groupedByMonth).length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无排课数据</div>
      ) : (
        Object.entries(groupedByMonth)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, items]) => (
            <div key={month} className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold text-slate-800">{month}</h2>
                <Badge variant="outline" className="text-xs">{items.length} 条排课</Badge>
              </div>
              <div className="space-y-2">
                {items.map((s: any) => {
                  const st = SCHEDULE_STATUS[s.status] || { label: s.status, color: 'bg-slate-100 text-slate-500' };
                  return (
                    <Card key={s.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-slate-800">{s.course_name || s.course_id}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{s.class_time}</span>
                            </div>
                            {s.teacher_name && (
                              <span className="text-sm text-slate-500">讲师：{s.teacher_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn('text-xs', st.color)}>{st.label}</Badge>
                            {s.status === 'draft' && isAdmin && (
                              <>
                                <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 h-7"
                                  onClick={() => openApproveDialog(s, 'approved')}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />通过
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 h-7"
                                  onClick={() => openApproveDialog(s, 'rejected')}>
                                  <XCircle className="h-3.5 w-3.5 mr-1" />拒绝
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
      )}

      {/* 新建排课弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建排课</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>选择课程 *</Label>
              <Select value={createForm.course_id} onValueChange={v => setCreateForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="选择课程..." /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>排课月份 *</Label>
                <Select value={createForm.schedule_month} onValueChange={v => setCreateForm(f => ({ ...f, schedule_month: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="选择月份..." /></SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>上课时间 *</Label>
                <Input value={createForm.class_time} onChange={e => setCreateForm(f => ({ ...f, class_time: e.target.value }))}
                  placeholder="如：每周一 9:00-12:00" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>讲师ID</Label>
              <Input value={createForm.teacher_id} onChange={e => setCreateForm(f => ({ ...f, teacher_id: e.target.value }))}
                placeholder="可选，讲师用户ID" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-amber-500 hover:bg-amber-600">
              {submitting ? '创建中...' : '创建排课'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 审核弹窗 */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{approveAction === 'approved' ? '审核通过' : '审核拒绝'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-slate-600">
              课程：<span className="font-medium">{approveItem?.course_name}</span>
              <span className="mx-2">|</span>
              时间：<span className="font-medium">{approveItem?.class_time}</span>
            </div>
            <div>
              <Label>审核备注</Label>
              <Textarea value={approveNote} onChange={e => setApproveNote(e.target.value)}
                placeholder={approveAction === 'approved' ? '通过备注（可选）' : '拒绝原因（建议填写）'}
                className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprove(false)}>取消</Button>
            <Button
              onClick={handleApprove}
              disabled={approveSubmitting}
              className={approveAction === 'approved'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'}
            >
              {approveSubmitting ? '处理中...' : approveAction === 'approved' ? '确认通过' : '确认拒绝'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

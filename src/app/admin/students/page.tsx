'use client';

import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, UserPlus, Edit, Award, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  enrolled: { label: '已报名', color: 'bg-blue-100 text-blue-800' },
  attending: { label: '学习中', color: 'bg-amber-100 text-amber-800' },
  qualified: { label: '已通过', color: 'bg-green-100 text-green-800' },
  failed: { label: '未通过', color: 'bg-red-100 text-red-800' },
  dropped: { label: '已退学', color: 'bg-slate-100 text-slate-500' },
};

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function StudentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  // 新建报名弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ course_id: '', worker_id: '' });
  const [submitting, setSubmitting] = useState(false);

  // 打分弹窗
  const [showGrade, setShowGrade] = useState(false);
  const [gradeTarget, setGradeTarget] = useState<any>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', passed: 'true', grade: '' });

  // 课程进度
  const [progressWorkerId, setProgressWorkerId] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [enrollRes, courseRes, workerRes] = await Promise.all([
        fetch('/api/enrollments', { headers: getAuthHeaders(false) }),
        fetch('/api/courses', { headers: getAuthHeaders(false) }),
        fetch('/api/workers', { headers: getAuthHeaders(false) }),
      ]);
      const enrollData = await enrollRes.json();
      const courseData = await courseRes.json();
      const workerData = await workerRes.json();
      if (enrollData.data) setEnrollments(enrollData.data);
      if (courseData.data) setCourses(courseData.data);
      if (workerData.data) setWorkers(workerData.data);
    } catch (e) {
      console.error('学员数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  // 新建报名
  const handleCreate = async () => {
    if (!createForm.course_id || !createForm.worker_id) {
      alert('请选择课程和学员');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          course_id: createForm.course_id,
          worker_id: createForm.worker_id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setCreateForm({ course_id: '', worker_id: '' });
        loadData();
      } else {
        alert('报名失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('报名失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 打分/结课
  const handleGrade = async () => {
    if (!gradeTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${gradeTarget.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: gradeForm.passed === 'true' ? 'qualified' : 'failed',
          score: gradeForm.score ? parseInt(gradeForm.score) : undefined,
          passed: gradeForm.passed === 'true',
          grade: gradeForm.grade || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowGrade(false);
        setGradeTarget(null);
        setGradeForm({ score: '', passed: 'true', grade: '' });
        loadData();
      } else {
        alert('打分失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('打分失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 课程进度 — 2.0: 通过worker_id查询
  const loadProgress = async (workerId: string) => {
    if (progressWorkerId === workerId) {
      setProgressWorkerId(null);
      setProgressData([]);
      return;
    }
    setProgressWorkerId(workerId);
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/enrollments?worker_id=${workerId}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      setProgressData(data.data || []);
    } catch (e) {
      console.error('课程进度加载失败:', e);
      setProgressData([]);
    } finally {
      setProgressLoading(false);
    }
  };

  // 筛选
  const filtered = enrollments.filter((e: any) => {
    const matchSearch = !search || 
      (e.student_name || '').includes(search) || 
      (e.worker_id || '').includes(search);
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchCourse = courseFilter === 'all' || e.course_id === courseFilter;
    return matchSearch && matchStatus && matchCourse;
  });

  const getCourseName = (id: string) => courses.find((c: any) => c.id === id)?.name || '未知课程';

  // 统计
  const statusCounts: Record<string, number> = { all: enrollments.length };
  enrollments.forEach((e: any) => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">学员管理</h1>
        <Button onClick={() => setShowCreate(true)} className="bg-amber-500 hover:bg-amber-600">
          <UserPlus className="h-4 w-4 mr-2" />新建报名
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="搜索学员姓名..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="课程筛选" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部课程</SelectItem>
            {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* 状态Tab */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'enrolled', label: '已报名' },
          { key: 'attending', label: '学习中' },
          { key: 'qualified', label: '已通过' },
          { key: 'failed', label: '未通过' },
        ].map(tab => (
          <Button key={tab.key} variant={statusFilter === tab.key ? 'default' : 'outline'} size="sm"
            onClick={() => setStatusFilter(tab.key)}
            className={statusFilter === tab.key ? 'bg-slate-800' : ''}>
            {tab.label} ({statusCounts[tab.key] || 0})
          </Button>
        ))}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无学员数据</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e: any) => {
            const st = ENROLLMENT_STATUS[e.status] || { label: e.status, color: 'bg-slate-100 text-slate-500' };
            return (
              <Card key={e.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{e.student_name || e.worker_id?.slice(0, 8)}</span>
                    <Badge className={cn('text-xs', st.color)}>{st.label}</Badge>
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>{getCourseName(e.course_id)}</span>
                    </div>
                    {e.score != null && <div>成绩: {e.score}分 {e.passed ? '✓' : '✗'}</div>}
                    {e.grade && <div>等级: {e.grade}</div>}
                    <div className="text-xs text-slate-400">{e.created_at?.slice(0, 10)}</div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    {(e.status === 'enrolled') && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await fetch(`/api/enrollments/${e.id}`, { method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ status: 'attending' }) });
                        loadData();
                      }}>开始上课</Button>
                    )}
                    {(e.status === 'attending') && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setGradeTarget(e);
                        setGradeForm({ score: '', passed: 'true', grade: '' });
                        setShowGrade(true);
                      }}>
                        <Award className="h-3.5 w-3.5 mr-1" />结课打分
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={() => loadProgress(e.worker_id)}>
                      <GraduationCap className="h-3.5 w-3.5 mr-1" />
                      {progressWorkerId === e.worker_id ? '收起' : '课程进度'}
                    </Button>
                  </div>
                  {/* 课程进度展开区 */}
                  {progressWorkerId === e.worker_id && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      {progressLoading ? (
                        <div className="text-sm text-slate-400 text-center py-2">加载中...</div>
                      ) : progressData.length === 0 ? (
                        <div className="text-sm text-slate-400 text-center py-2">暂无课程记录</div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-slate-600 mb-2">课程进度（共 {progressData.length} 门）</div>
                          {progressData.map((pe: any) => {
                            const pst = ENROLLMENT_STATUS[pe.status] || { label: pe.status, color: 'bg-slate-100 text-slate-500' };
                            return (
                              <div key={pe.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-3 py-2">
                                <span className="text-slate-700">{getCourseName(pe.course_id)}</span>
                                <div className="flex items-center gap-2">
                                  {pe.score != null && <span className={pe.score >= 60 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{pe.score}分</span>}
                                  <Badge className={cn('text-xs', pst.color)}>{pst.label}</Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新建报名弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建报名</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>选择课程 *</Label>
              <Select value={createForm.course_id} onValueChange={v => setCreateForm(f => ({ ...f, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="请选择课程" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>选择学员 *</Label>
              <Select value={createForm.worker_id} onValueChange={v => setCreateForm(f => ({ ...f, worker_id: v }))}>
                <SelectTrigger><SelectValue placeholder="请选择阿姨" /></SelectTrigger>
                <SelectContent>
                  {workers.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.name || w.id?.slice(0, 8)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={submitting || !createForm.course_id || !createForm.worker_id} className="bg-amber-500 hover:bg-amber-600">
              {submitting ? '提交中...' : '确认报名'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 打分弹窗 */}
      <Dialog open={showGrade} onOpenChange={setShowGrade}>
        <DialogContent>
          <DialogHeader><DialogTitle>结课打分 — {gradeTarget?.student_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>成绩（0-100）</Label>
              <Input type="number" min="0" max="100" value={gradeForm.score} onChange={e => setGradeForm(f => ({ ...f, score: e.target.value }))} placeholder="输入分数" />
            </div>
            <div>
              <Label>是否通过</Label>
              <Select value={gradeForm.passed} onValueChange={v => setGradeForm(f => ({ ...f, passed: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">通过</SelectItem>
                  <SelectItem value="false">未通过</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>等级（优秀/良好/合格）</Label>
              <Input value={gradeForm.grade} onChange={e => setGradeForm(f => ({ ...f, grade: e.target.value }))} placeholder="可选" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrade(false)}>取消</Button>
            <Button onClick={handleGrade} disabled={submitting} className="bg-amber-500 hover:bg-amber-600">
              {submitting ? '提交中...' : '确认打分'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

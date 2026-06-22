'use client';

import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Plus, Edit, Trash2, Settings, X, CheckCircle, XCircle, Send, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const COURSE_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-slate-100 text-slate-500' },
  pending_approval: { label: '待审核', color: 'bg-amber-100 text-amber-800' },
  published: { label: '已发布', color: 'bg-green-100 text-green-800' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800' },
  archived: { label: '已归档', color: 'bg-gray-100 text-gray-500' },
};

const COURSE_TYPE: Record<string, string> = {
  single: '单科课程',
  package: '套餐课程',
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

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // 编辑弹窗
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', duration: '', status: 'draft',
    course_type: 'single', instructor_id: '', location: '', max_students: '',
    package_info: '', package_items: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);

  // 审核弹窗
  const [showApprove, setShowApprove] = useState(false);
  const [approveCourse, setApproveCourse] = useState<any>(null);
  const [approveAction, setApproveAction] = useState<'approved' | 'rejected'>('approved');
  const [approveNote, setApproveNote] = useState('');
  const [approveSubmitting, setApproveSubmitting] = useState(false);

  // 课程设置Tab
  const [topTab, setTopTab] = useState<'teaching' | 'settings'>('teaching');
  const [packageItems, setPackageItems] = useState<any[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState('');
  const [addItemCourseId, setAddItemCourseId] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);

  // 报名弹窗
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [workers, setWorkers] = useState<any[]>([]);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  // 加载套餐子项
  useEffect(() => {
    if (selectedPkgId && topTab === 'settings') {
      loadPackageItems(selectedPkgId);
    } else {
      setPackageItems([]);
    }
  }, [selectedPkgId, topTab]);

  const loadPackageItems = async (packageId: string) => {
    try {
      const res = await fetch(`/api/course-package-items?package_id=${packageId}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      setPackageItems(data.data || []);
    } catch (e) {
      console.error('套餐子项加载失败:', e);
    }
  };

  const handleAddPackageItem = async () => {
    if (!selectedPkgId || !addItemCourseId) return;
    try {
      const res = await fetch('/api/course-package-items', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ package_id: selectedPkgId, item_id: addItemCourseId }),
      });
      if (res.ok) {
        setShowAddItem(false);
        setAddItemCourseId('');
        loadPackageItems(selectedPkgId);
      }
    } catch (e) {
      console.error('添加子课程失败:', e);
    }
  };

  const handleDeletePackageItem = async (itemId: string) => {
    if (!selectedPkgId) return;
    try {
      const res = await fetch(`/api/course-package-items?package_id=${selectedPkgId}&item_id=${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        loadPackageItems(selectedPkgId);
      }
    } catch (e) {
      console.error('删除子课程失败:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [courseRes, workerRes] = await Promise.all([
        fetch('/api/courses', { headers: getAuthHeaders(false) }),
        fetch('/api/workers', { headers: getAuthHeaders(false) }),
      ]);
      const courseData = await courseRes.json();
      const workerData = await workerRes.json();
      if (courseData.data) setCourses(courseData.data);
      if (workerData.data) setWorkers(workerData.data);
    } catch (e) {
      console.error('课程数据加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name) { alert('课程名称必填'); return; }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        price: form.price ? parseFloat(form.price) : null,
        duration: form.duration || null,
        status: form.status,
        course_type: form.course_type,
        instructor_id: form.instructor_id || null,
        location: form.location || null,
        max_students: form.max_students ? parseInt(form.max_students) : null,
        package_items: form.package_items.length > 0 ? form.package_items : undefined,
      };
      if (editing) {
        body.id = editing.id;
      }
      const res = await fetch('/api/courses', {
        method: editing ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success || data.ok) {
        setShowEdit(false);
        setEditing(null);
        loadData();
      } else {
        alert('保存失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 提交审核
  const handleSubmitForApproval = async (courseId: string) => {
    if (!confirm('确认提交审核？')) return;
    try {
      const res = await fetch('/api/courses', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: courseId, status: 'pending_approval' }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert('提交审核失败: ' + (data.error || ''));
      }
    } catch (e) {
      alert('提交审核失败');
    }
  };

  // 审核操作
  const openApproveDialog = (course: any, action: 'approved' | 'rejected') => {
    setApproveCourse(course);
    setApproveAction(action);
    setApproveNote('');
    setShowApprove(true);
  };

  // 报名
  const handleEnroll = async () => {
    if (!enrollCourseId || !enrollStudentId) {
      alert('请选择课程和学员');
      return;
    }
    setEnrollSubmitting(true);
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ course_id: enrollCourseId, worker_id: enrollStudentId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEnroll(false);
        setEnrollCourseId('');
        setEnrollStudentId('');
        loadData();
      } else {
        alert('报名失败: ' + (data.error || ''));
      }
    } catch (e) {
      alert('报名失败');
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!approveCourse) return;
    setApproveSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${approveCourse.id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: approveAction, review_note: approveNote }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowApprove(false);
        setApproveCourse(null);
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

  const openEdit = (course?: any) => {
    if (course) {
      setEditing(course);
      let pkgItems: string[] = [];
      if (course.package_items) {
        try { pkgItems = typeof course.package_items === 'string' ? JSON.parse(course.package_items) : course.package_items; } catch { pkgItems = []; }
      }
      setForm({
        name: course.name || '',
        description: course.description || '',
        price: course.price?.toString() || '',
        duration: course.duration || '',
        status: course.status || 'draft',
        course_type: course.course_type || 'single',
        instructor_id: course.instructor_id || '',
        location: course.location || '',
        max_students: course.max_students?.toString() || '',
        package_info: course.package_info || '',
        package_items: pkgItems,
      });
    } else {
      setEditing(null);
      setForm({
        name: '', description: '', price: '', duration: '', status: 'draft',
        course_type: 'single', instructor_id: '', location: '', max_students: '',
        package_info: '', package_items: [],
      });
    }
    setShowEdit(true);
  };

  // 筛选
  const filtered = courses.filter((c: any) => {
    const matchSearch = !search || (c.name || '').includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchType = typeFilter === 'all' || c.course_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const statusCounts: Record<string, number> = { all: courses.length };
  courses.forEach((c: any) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  const isAdmin = getCurrentRole() === 'admin' || getCurrentRole() === 'training_supervisor';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">课程管理</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowEnroll(true)} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50">
            <UserPlus className="h-4 w-4 mr-2" />报名
          </Button>
          <Button onClick={() => openEdit()} className="bg-amber-500 hover:bg-amber-600">
            <Plus className="h-4 w-4 mr-2" />新建课程
          </Button>
        </div>
      </div>

      {/* 顶层Tab */}
      <div className="flex gap-2 border-b pb-2">
        <Button variant={topTab === 'teaching' ? 'default' : 'ghost'} size="sm"
          onClick={() => setTopTab('teaching')}
          className={topTab === 'teaching' ? 'bg-slate-800' : ''}>
          <BookOpen className="h-4 w-4 mr-1" />课程教学
        </Button>
        <Button variant={topTab === 'settings' ? 'default' : 'ghost'} size="sm"
          onClick={() => setTopTab('settings')}
          className={topTab === 'settings' ? 'bg-slate-800' : ''}>
          <Settings className="h-4 w-4 mr-1" />课程设置
        </Button>
      </div>

      {topTab === 'teaching' && (<>
      {/* 筛选 */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="搜索课程名称..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="课程类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="single">单科课程</SelectItem>
            <SelectItem value="package">套餐课程</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 状态Tab */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'draft', label: '草稿' },
          { key: 'pending_approval', label: '待审核' },
          { key: 'published', label: '已发布' },
          { key: 'rejected', label: '已拒绝' },
          { key: 'archived', label: '已归档' },
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
        <div className="text-center py-12 text-slate-400">暂无课程数据</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c: any) => {
            const st = COURSE_STATUS[c.status] || { label: c.status, color: 'bg-slate-100 text-slate-500' };
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 line-clamp-1">{c.name}</span>
                    <Badge className={cn('text-xs', st.color)}>{st.label}</Badge>
                  </div>
                  <div className="text-sm text-slate-500 space-y-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{COURSE_TYPE[c.course_type] || c.course_type || '单科'}</span>
                    </div>
                    {c.price != null && <div>价格: ¥{c.price}</div>}
                    {c.duration && <div>时长: {c.duration}</div>}
                    {c.location && <div>地点: {c.location}</div>}
                    {c.max_students && <div>名额: {c.max_students}人</div>}
                    {c.description && <div className="text-xs line-clamp-2">{c.description}</div>}
                    {/* 套餐子课程 */}
                    {c.course_type === 'package' && c.package_items && (() => {
                      let items: string[] = [];
                      try { items = typeof c.package_items === 'string' ? JSON.parse(c.package_items) : c.package_items; } catch { items = []; }
                      if (items.length === 0) return null;
                      return (
                        <div className="text-xs text-amber-600">
                          <span className="font-medium">包含 {items.length} 门课：</span>
                          {items.map((id: string) => {
                            const sub = courses.find((x: any) => x.id === id);
                            return sub ? <Badge key={id} variant="outline" className="text-xs ml-1 border-amber-200">{sub.name}</Badge> : null;
                          })}
                        </div>
                      );
                    })()}
                    <div className="text-xs text-slate-400">{c.created_at?.slice(0, 10)}</div>
                  </div>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {/* 编辑 - 草稿/拒绝状态可编辑 */}
                    {(c.status === 'draft' || c.status === 'rejected') && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Edit className="h-3.5 w-3.5 mr-1" />编辑
                      </Button>
                    )}
                    {/* 提交审核 - 草稿/拒绝状态可提交 */}
                    {(c.status === 'draft' || c.status === 'rejected') && (
                      <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50"
                        onClick={() => handleSubmitForApproval(c.id)}>
                        <Send className="h-3.5 w-3.5 mr-1" />提交审核
                      </Button>
                    )}
                    {/* 管理员审核按钮 - 待审核状态 */}
                    {c.status === 'pending_approval' && isAdmin && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => openApproveDialog(c, 'approved')}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />通过
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => openApproveDialog(c, 'rejected')}>
                          <XCircle className="h-3.5 w-3.5 mr-1" />拒绝
                        </Button>
                      </>
                    )}
                    {/* 已发布 → 归档 */}
                    {c.status === 'published' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await fetch('/api/courses', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: c.id, status: 'archived' }) });
                        loadData();
                      }}>归档</Button>
                    )}
                    {/* 已归档 → 重新发布 */}
                    {c.status === 'archived' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        await fetch('/api/courses', { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ id: c.id, status: 'published' }) });
                        loadData();
                      }}>重新发布</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      </>)}

      {topTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">套餐课程子项管理</h2>
            <p className="text-sm text-slate-500 mb-4">选择一个套餐课程，管理其包含的子课程</p>

            <div className="space-y-4">
              <Select value={selectedPkgId} onValueChange={setSelectedPkgId}>
                <SelectTrigger className="w-full max-w-md"><SelectValue placeholder="选择套餐课程..." /></SelectTrigger>
                <SelectContent>
                  {courses.filter(c => c.course_type === 'package').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedPkgId && (
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
                    <span className="font-medium text-sm">子课程列表</span>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600" onClick={() => setShowAddItem(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />添加子课程
                    </Button>
                  </div>
                  {packageItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">暂无子课程</div>
                  ) : (
                    <div className="divide-y">
                      {packageItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3">
                          <div>
                            <span className="font-medium text-sm">{item.item_name || item.item_id}</span>
                            {item.item_type && <Badge variant="outline" className="ml-2 text-xs">{item.item_type}</Badge>}
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeletePackageItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 添加子课程弹窗 */}
          {showAddItem && selectedPkgId && (
            <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
              <DialogContent>
                <DialogHeader><DialogTitle>添加子课程</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium">选择课程</label>
                    <Select value={addItemCourseId} onValueChange={setAddItemCourseId}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="选择要添加的课程..." /></SelectTrigger>
                      <SelectContent>
                        {courses.filter(c => c.id !== selectedPkgId && c.course_type === 'single').map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddItem(false)}>取消</Button>
                  <Button className="bg-amber-500 hover:bg-amber-600" onClick={handleAddPackageItem} disabled={!addItemCourseId}>添加</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? '编辑课程' : '新建课程'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>课程名称 *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="输入课程名称" />
            </div>
            <div>
              <Label>课程类型</Label>
              <Select value={form.course_type} onValueChange={v => setForm(f => ({ ...f, course_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">单科课程</SelectItem>
                  <SelectItem value="package">套餐课程</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>价格 (元)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label>时长</Label>
                <Input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="如：3天" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>上课地点</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="如：总部培训室" />
              </div>
              <div>
                <Label>最大人数</Label>
                <Input type="number" value={form.max_students} onChange={e => setForm(f => ({ ...f, max_students: e.target.value }))} placeholder="如：20" />
              </div>
            </div>
            {form.course_type === 'package' && (
              <>
                <div>
                  <Label>套餐说明</Label>
                  <Textarea value={form.package_info} onChange={e => setForm(f => ({ ...f, package_info: e.target.value }))} placeholder="套餐包含的课程内容及优惠信息" />
                </div>
                <div>
                  <Label>选择子课程（勾选已发布的单课）</Label>
                  <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1 mt-1">
                    {courses.filter(c => c.course_type === 'single' && c.status === 'published').length === 0 ? (
                      <p className="text-xs text-slate-400">暂无已发布的单课可选</p>
                    ) : (
                      courses.filter(c => c.course_type === 'single' && c.status === 'published').map(c => (
                        <label key={c.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-slate-50 px-1 rounded">
                          <input
                            type="checkbox"
                            checked={form.package_items.includes(c.id)}
                            onChange={(e) => {
                              const items = e.target.checked
                                ? [...form.package_items, c.id]
                                : form.package_items.filter(id => id !== c.id);
                              setForm(f => ({ ...f, package_items: items }));
                            }}
                            className="rounded"
                          />
                          <span>{c.name}</span>
                          {c.price != null && <span className="text-xs text-slate-400 ml-auto">¥{c.price}</span>}
                        </label>
                      ))
                    )}
                  </div>
                  {form.package_items.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">已选 {form.package_items.length} 门子课程</p>
                  )}
                </div>
              </>
            )}
            <div>
              <Label>课程描述</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="课程简介" className="min-h-[80px]" />
            </div>
            {editing && (
              <div>
                <Label>状态</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>取消</Button>
            <Button onClick={handleSave} disabled={submitting} className="bg-amber-500 hover:bg-amber-600">
              {submitting ? '保存中...' : '保存'}
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
              课程：<span className="font-medium">{approveCourse?.name}</span>
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

      {/* 报名弹窗 */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent>
          <DialogHeader><DialogTitle>学员报名</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>选择课程 *</Label>
              <Select value={enrollCourseId} onValueChange={setEnrollCourseId}>
                <SelectTrigger><SelectValue placeholder="请选择课程" /></SelectTrigger>
                <SelectContent>
                  {courses.filter((c: any) => c.status === 'published').map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>选择学员 *</Label>
              <Select value={enrollStudentId} onValueChange={setEnrollStudentId}>
                <SelectTrigger><SelectValue placeholder="请选择阿姨/学员" /></SelectTrigger>
                <SelectContent>
                  {workers.map((w: any) => (
                    <SelectItem key={w.id} value={w.user_id || w.id}>{w.name || w.id?.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnroll(false)}>取消</Button>
            <Button onClick={handleEnroll} disabled={enrollSubmitting || !enrollCourseId || !enrollStudentId} className="bg-amber-500 hover:bg-amber-600">
              {enrollSubmitting ? '提交中...' : '确认报名'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

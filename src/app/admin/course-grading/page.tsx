'use client';

import React, { useState, useEffect } from 'react';
import { GraduationCap, CheckCircle, XCircle, Award, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  enrolled: { label: '已报名', color: 'bg-blue-100 text-blue-800' },
  passed: { label: '已通过', color: 'bg-green-100 text-green-800' },
  failed: { label: '未通过', color: 'bg-red-100 text-red-800' },
  dropped: { label: '已退课', color: 'bg-slate-100 text-slate-500' },
};

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function CourseGradingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeComment, setGradeComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/courses', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.data) setCourses(data.data.filter((c: any) => c.status === 'published'));
    } catch (e) {
      console.error('课程加载失败:', e);
    }
  };

  const loadEnrollments = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    setEnrollments([]);
    try {
      const res = await fetch(`/api/enrollments?course_id=${courseId}`, { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.data) setEnrollments(data.data);
    } catch (e) {
      console.error('学员加载失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setGradingId(null);
    if (courseId) {
      loadEnrollments(courseId);
    } else {
      setEnrollments([]);
    }
  };

  const handleGrade = async (enrollmentId: string) => {
    const score = parseInt(gradeScore);
    if (isNaN(score) || score < 0 || score > 100) {
      alert('分数必须为0-100的整数');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/grade`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          score,
          comments: gradeComment || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setGradingId(null);
        setGradeScore('');
        setGradeComment('');
        loadEnrollments(selectedCourseId);
      } else {
        alert('录入失败: ' + (data.error || ''));
      }
    } catch (e) {
      alert('录入失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 统计
  const stats = {
    total: enrollments.length,
    passed: enrollments.filter((e: any) => e.status === 'qualified').length,
    failed: enrollments.filter((e: any) => e.status === 'failed').length,
    pending: enrollments.filter((e: any) => e.status === 'enrolled').length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">课程考核</h1>
      </div>

      {/* 课程选择 */}
      <div className="flex gap-3 items-center">
        <Label className="shrink-0">选择课程：</Label>
        <Select value={selectedCourseId} onValueChange={handleSelectCourse}>
          <SelectTrigger className="w-[300px]"><SelectValue placeholder="请选择课程..." /></SelectTrigger>
          <SelectContent>
            {courses.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 统计栏 */}
      {selectedCourseId && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '总学员', count: stats.total, icon: BookOpen, color: 'bg-slate-50 border-slate-200' },
            { label: '待考核', count: stats.pending, icon: GraduationCap, color: 'bg-amber-50 border-amber-200' },
            { label: '已通过', count: stats.passed, icon: CheckCircle, color: 'bg-green-50 border-green-200' },
            { label: '未通过', count: stats.failed, icon: XCircle, color: 'bg-red-50 border-red-200' },
          ].map(item => (
            <Card key={item.label} className={cn('border', item.color)}>
              <CardContent className="p-4 flex items-center gap-3">
                <item.icon className="h-8 w-8 text-slate-400" />
                <div>
                  <div className="text-2xl font-bold text-slate-800">{item.count}</div>
                  <div className="text-sm text-slate-500">{item.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 学员列表 */}
      {!selectedCourseId ? (
        <div className="text-center py-12 text-slate-400">请先选择课程</div>
      ) : loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">该课程暂无报名学员</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">学员ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">分数</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">评语</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">考核时间</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {enrollments.map((enr: any) => {
                const st = ENROLLMENT_STATUS[enr.status] || { label: enr.status, color: 'bg-slate-100 text-slate-500' };
                const isGrading = gradingId === enr.id;
                return (
                  <tr key={enr.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-slate-800">{enr.worker_id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', st.color)}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {enr.score != null ? (
                        <span className={cn('font-bold', enr.score >= 60 ? 'text-green-600' : 'text-red-600')}>
                          {enr.score}
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {enr.grade_comment || '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {enr.graded_at ? new Date(enr.graded_at).toLocaleDateString() : '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {enr.status === 'enrolled' ? (
                        isGrading ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={gradeScore}
                              onChange={e => setGradeScore(e.target.value)}
                              placeholder="分数"
                              className="w-20 h-8 text-sm"
                            />
                            <Input
                              value={gradeComment}
                              onChange={e => setGradeComment(e.target.value)}
                              placeholder="评语(可选)"
                              className="w-32 h-8 text-sm"
                            />
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-8"
                              disabled={submitting}
                              onClick={() => handleGrade(enr.id)}
                            >
                              提交
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8"
                              onClick={() => { setGradingId(null); setGradeScore(''); setGradeComment(''); }}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline"
                            onClick={() => { setGradingId(enr.id); setGradeScore(''); setGradeComment(''); }}>
                            录入成绩
                          </Button>
                        )
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {enr.status === 'qualified' ? (
                            <><Award className="h-3 w-3 mr-1" />已考核</>
                          ) : (
                            '已考核'
                          )}
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

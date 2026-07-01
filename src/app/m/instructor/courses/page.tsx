'use client';

import React, { useState, useEffect } from 'react';
import { mockCourses, initDataFromApi, fetchData } from '@/lib/data-service';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Star } from 'lucide-react';

export default function InstructorCoursesPage() {
  const [courses, setCourses] = useState(mockCourses.filter((c) => c.instructorId === 'i001'));
  const [attendingDialog, setAttendingDialog] = useState<string | null>(null);
  const [gradeDialog, setGradeDialog] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  // 考核表单
  const [gradeScore, setGradeScore] = useState('80');
  const [gradeComment, setGradeComment] = useState('');
  const [gradingId, setGradingId] = useState<string | null>(null);
  // 点评表单
  const [reviewTargetId, setReviewTargetId] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initDataFromApi().then(() => {
      setCourses([...mockCourses.filter((c: any) => c.instructorId === 'i001')]);
    });
  }, []);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
    if (token) headers['x-session'] = token;
    return headers;
  };

  // 加载课程的学员列表
  const loadEnrollments = async (courseId: string) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/enrollments?course_id=${courseId}`, { headers });
      const data = await res.json();
      setEnrollments(data.data || []);
    } catch (e) { console.error('加载学员失败:', e); }
  };

  // 签到
  const handleAttendance = async (courseId: string) => {
    setAttendingDialog(courseId);
    await loadEnrollments(courseId);
  };

  const submitAttendance = async (enrollmentId: string) => {
    setSubmitting(true);
    try {
      await fetch(`/api/enrollments/${enrollmentId}/attendance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'present' }),
      });
      alert('签到成功！');
    } catch { alert('签到失败'); }
    finally { setSubmitting(false); }
  };

  // 考核
  const handleGrade = async (courseId: string) => {
    setGradeDialog(courseId);
    await loadEnrollments(courseId);
  };

  const submitGrade = async () => {
    if (!gradingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${gradingId}/grade`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ score: parseInt(gradeScore), comment: gradeComment }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`考核完成！${parseInt(gradeScore) >= 80 ? '优秀' : parseInt(gradeScore) >= 60 ? '合格' : '未通过'}`);
        setGradeDialog(null);
        setGradingId(null);
        setGradeScore('80');
        setGradeComment('');
      } else {
        alert('考核失败：' + (data.error || '请重试'));
      }
    } catch { alert('考核失败'); }
    finally { setSubmitting(false); }
  };

  // 点评
  const handleReview = async (courseId: string) => {
    setReviewDialog(courseId);
    await loadEnrollments(courseId);
    setReviewTargetId('');
    setReviewContent('');
    setReviewRating(5);
  };

  const submitReview = async () => {
    if (!reviewTargetId || !reviewContent.trim()) { alert('请选择学员并填写评价'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          target_user_id: reviewTargetId,
          rating: reviewRating,
          content: reviewContent,
          reviewer_role: 'instructor',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('点评提交成功！');
        setReviewDialog(null);
      } else {
        alert('点评失败：' + (data.error || '请重试'));
      }
    } catch { alert('点评失败'); }
    finally { setSubmitting(false); }
  };

  const myCourses = courses;

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">课程管理</h2>
      <div className="space-y-3">
        {myCourses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{c.name}</span>
              <Badge className={cn('text-xs', getStatusColor(c.status))}>
                {c.status === 'upcoming' ? '即将开课' : c.status === 'ongoing' ? '进行中' : '已结束'}
              </Badge>
              <Badge variant="outline" className="text-xs">{c.type}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">学费：</span>{formatCurrency(c.price)}</div>
              <div><span className="text-muted-foreground">学员：</span>{c.currentStudents}/{c.maxStudents}</div>
              <div><span className="text-muted-foreground">时间：</span>{c.startDate}</div>
              <div><span className="text-muted-foreground">地点：</span>{c.location}</div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
              <div className="bg-purple-500 rounded-full h-2" style={{ width: `${(c.currentStudents / c.maxStudents) * 100}%` }} />
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" onClick={() => handleAttendance(c.id)}>签到</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleGrade(c.id)}>考核</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleReview(c.id)}>点评</Button>
            </div>
          </div>
        ))}
      </div>

      {/* 签到弹窗 */}
      {attendingDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setAttendingDialog(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-semibold">学员签到</h3><X className="h-5 w-5 text-slate-400 cursor-pointer" onClick={() => setAttendingDialog(null)} /></div>
            {enrollments.filter((e: any) => e.status === 'enrolled' || e.status === 'attending').length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">暂无进行中的学员</p>
            ) : (
              <div className="space-y-2">
                {enrollments.filter((e: any) => e.status === 'enrolled' || e.status === 'attending').map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm">{e.workers?.name || e.worker_name || e.worker_id}</span>
                    <Button size="sm" className="h-7 text-xs bg-green-600" onClick={() => submitAttendance(e.id)} disabled={submitting}>签到</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 考核弹窗 */}
      {gradeDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setGradeDialog(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-semibold">学员考核</h3><X className="h-5 w-5 text-slate-400 cursor-pointer" onClick={() => setGradeDialog(null)} /></div>
            {enrollments.filter((e: any) => e.status === 'enrolled' || e.status === 'attending').length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">暂无待考核学员</p>
            ) : gradingId ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">打分</p>
                <input type="number" min="0" max="100" value={gradeScore} onChange={e => setGradeScore(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0-100分" />
                <textarea value={gradeComment} onChange={e => setGradeComment(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-20" placeholder="考核评语..." />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-purple-600" onClick={submitGrade} disabled={submitting}>{submitting ? '提交中...' : '提交考核'}</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setGradingId(null)}>取消</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {enrollments.filter((e: any) => e.status === 'enrolled' || e.status === 'attending').map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100" onClick={() => setGradingId(e.id)}>
                    <span className="text-sm">{e.workers?.name || e.worker_name || e.worker_id}</span>
                    <span className="text-xs text-purple-600">打分 →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 点评弹窗 */}
      {reviewDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setReviewDialog(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 max-h-[75vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3"><h3 className="text-lg font-semibold">学员点评</h3><X className="h-5 w-5 text-slate-400 cursor-pointer" onClick={() => setReviewDialog(null)} /></div>
            {enrollments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">暂无学员</p>
            ) : !reviewTargetId ? (
              <div className="space-y-2">
                {enrollments.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100" onClick={() => setReviewTargetId(e.worker_id || e.workerId)}>
                    <span className="text-sm">{e.workers?.name || e.worker_name || e.worker_id}</span>
                    <span className="text-xs text-amber-600">评价 →</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`h-8 w-8 cursor-pointer ${n <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} onClick={() => setReviewRating(n)} />
                  ))}
                </div>
                <textarea value={reviewContent} onChange={e => setReviewContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-20" placeholder="评价内容..." />
                <div className="flex gap-2">
                  <Button className="flex-1 bg-amber-500" onClick={submitReview} disabled={submitting}>{submitting ? '提交中...' : '提交点评'}</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setReviewTargetId('')}>返回选择</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

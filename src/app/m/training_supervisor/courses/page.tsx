'use client';

import React, { useState } from 'react';
import { mockCourses, mockRecruiterLeads } from '@/lib/data-service';
import { Search, BookOpen, Users, ChevronRight, Star, Clock, Phone } from 'lucide-react';

export default function TrainingSupervisorCoursesPage() {
  const [activeTab, setActiveTab] = useState<'courses' | 'students'>('courses');
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // 使用共享数据：课程（排除待审批的）
  const courses = mockCourses.filter(c => c.status !== 'pending_approval');

  // 使用共享数据：学员 = 线索中正在培训/已合格/已转化的
  const students = mockRecruiterLeads.filter(l =>
    ['training', 'qualified', 'converted'].includes(l.status)
  );

  const filteredStudents = search
    ? students.filter(s => s.name.includes(search) || (s.intention || '').includes(search))
    : students;

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-3">教学管理</h1>

      {/* Tab */}
      <div className="flex gap-4 mb-4 border-b border-slate-100">
        <button
          onClick={() => { setActiveTab('courses'); setSelectedCourse(null); }}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'courses' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400'
          }`}
        >课程管理</button>
        <button
          onClick={() => { setActiveTab('students'); setSelectedStudent(null); }}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'students' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-400'
          }`}
        >学员管理</button>
      </div>

      {/* 课程管理 */}
      {activeTab === 'courses' && !selectedCourse && (
        <div className="space-y-3">
          {courses.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-xl p-4 shadow-sm cursor-pointer active:bg-slate-50"
              onClick={() => setSelectedCourse(c.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.status === 'ongoing' ? 'bg-blue-50 text-blue-700' :
                      c.status === 'upcoming' ? 'bg-amber-50 text-amber-700' :
                      'bg-green-50 text-green-700'
                    }`}>{c.status === 'ongoing' ? '进行中' : c.status === 'upcoming' ? '待开课' : '已结束'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 inline-flex"><Users className="h-3 w-3" />{c.currentStudents}/{c.maxStudents}</span>
                    <span className="mx-1">·</span>
                    <span className="flex items-center gap-1 inline-flex"><Clock className="h-3 w-3" />{c.hours}课时</span>
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 课程详情 */}
      {activeTab === 'courses' && selectedCourse && (
        <div>
          <button onClick={() => setSelectedCourse(null)} className="text-sm text-indigo-600 mb-3 flex items-center gap-1">
            &larr; 返回课程列表
          </button>
          {(() => {
            const course = courses.find(c => c.id === selectedCourse);
            if (!course) return null;
            // 从共享线索数据中查找该课程的学员
            const courseStudents = students.filter(s =>
              s.intention && (course.name.includes(s.intention) || s.intention.includes(course.type === '技能提升' ? '提升' : '入行'))
            );
            const displayStudents = courseStudents.length > 0 ? courseStudents : students.slice(0, 3);
            return (
              <div>
                <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
                  <h3 className="text-base font-semibold text-slate-800">{course.name}</h3>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                    <div><span className="text-slate-400">类型：</span><span className="text-slate-700">{course.type}</span></div>
                    <div><span className="text-slate-400">课时：</span><span className="text-slate-700">{course.hours}课时</span></div>
                    <div><span className="text-slate-400">状态：</span><span className="text-slate-700">{course.status === 'ongoing' ? '进行中' : course.status === 'upcoming' ? '待开课' : '已结束'}</span></div>
                    <div><span className="text-slate-400">学员：</span><span className="text-slate-700">{course.currentStudents}/{course.maxStudents}</span></div>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">学员列表</h4>
                {displayStudents.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">暂无学员</p>
                ) : (
                  <div className="space-y-2">
                    {displayStudents.map(s => (
                      <div key={s.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                          {s.name[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.intention || '未选择'} · {s.status === 'training' ? '学习中' : s.status === 'qualified' ? '已合格' : '已转化'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          s.status === 'training' ? 'bg-blue-50 text-blue-700' :
                          s.status === 'qualified' ? 'bg-green-50 text-green-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>{s.status === 'training' ? '学习中' : s.status === 'qualified' ? '已合格' : '已转化'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* 学员管理 */}
      {activeTab === 'students' && !selectedStudent && (
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索学员姓名或意向工种"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div className="space-y-2">
            {filteredStudents.map(s => (
              <div
                key={s.id}
                className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer active:bg-slate-50"
                onClick={() => setSelectedStudent(s.id)}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                  {s.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.intention || '未选择'} · 来源：{s.recruiterName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    s.status === 'training' ? 'bg-blue-50 text-blue-700' :
                    s.status === 'qualified' ? 'bg-green-50 text-green-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>{s.status === 'training' ? '学习中' : s.status === 'qualified' ? '已合格' : '已转化'}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 学员详情 */}
      {activeTab === 'students' && selectedStudent && (
        <div>
          <button onClick={() => setSelectedStudent(null)} className="text-sm text-indigo-600 mb-3 flex items-center gap-1">
            &larr; 返回学员列表
          </button>
          {(() => {
            const student = students.find(s => s.id === selectedStudent);
            if (!student) return null;
            return (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {student.name[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">{student.name}</h3>
                    <p className="text-xs text-slate-400">{student.phone}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">意向工种</span>
                    <span className="text-slate-700">{student.intention || '未选择'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">培训状态</span>
                    <span className={student.status === 'converted' ? 'text-emerald-600' : student.status === 'qualified' ? 'text-green-600' : 'text-blue-600'}>
                      {student.status === 'training' ? '学习中' : student.status === 'qualified' ? '已合格' : '已转化'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">来源招生</span>
                    <span className="text-slate-700">{student.recruiterName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">来源渠道</span>
                    <span className="text-slate-700">{student.source}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">年龄</span>
                    <span className="text-slate-700">{student.age || '未填写'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-slate-400">籍贯</span>
                    <span className="text-slate-700">{student.origin || '未填写'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">备注</span>
                    <span className="text-slate-700">{student.remark}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3">
                  <a
                    href={`tel:${student.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium"
                  >
                    <Phone className="h-4 w-4" /> 拨打电话
                  </a>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

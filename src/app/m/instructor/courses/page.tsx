'use client';

import React from 'react';
import { mockCourses } from '@/lib/data-service';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function InstructorCoursesPage() {
  const myCourses = mockCourses.filter((c) => c.instructorId === 'i001');

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
              <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700">签到</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs">考核</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs">点评</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

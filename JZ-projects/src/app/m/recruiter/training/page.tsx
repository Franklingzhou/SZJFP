'use client';

import React from 'react';
import { mockCourses } from '@/lib/data-service';
import { cn, formatCurrency, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function RecruiterTrainingPage() {
  const availableCourses = mockCourses.filter((c) => c.status === 'upcoming' || c.status === 'ongoing');

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">培训推荐</h2>
      <p className="text-sm text-muted-foreground">推荐阿姨参加培训，获取推荐提成15%</p>

      <div className="space-y-3">
        {availableCourses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{c.name}</span>
              <Badge className={cn('text-xs', getStatusColor(c.status))}>
                {c.status === 'upcoming' ? '即将开课' : '进行中'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">讲师：</span>{c.instructorName}</div>
              <div><span className="text-muted-foreground">学费：</span>{formatCurrency(c.price)}</div>
              <div><span className="text-muted-foreground">名额：</span>{c.currentStudents}/{c.maxStudents}</div>
              <div><span className="text-muted-foreground">时间：</span>{c.startDate}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700">推荐阿姨</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs">详情</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

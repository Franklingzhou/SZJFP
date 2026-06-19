'use client';

import React from 'react';
import { mockWorkers, mockCourses } from '@/lib/data-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function InstructorStudentsPage() {
  // 模拟学员 = 正在培训的阿姨
  const students = mockWorkers.slice(0, 3);

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="text-lg font-bold">学员管理</h2>
      <div className="space-y-3">
        {students.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-50 flex items-center justify-center text-lg font-bold text-purple-700 shrink-0">
                {s.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  <Badge variant="outline" className="text-xs">新手月嫂入门班</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.age}岁 · {s.origin}</div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs">培训点评</Button>
                  <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1">
                    <CheckCircle className="h-3 w-3" /> 合格转简历
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

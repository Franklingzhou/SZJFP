'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardCheck, Construction } from 'lucide-react';

export default function AssessmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">考核管理</h1>
        <p className="text-muted-foreground mt-1">管理学员培训考核与评分</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <ClipboardCheck className="h-16 w-16 text-green-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">考核管理</h2>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            此功能将在后续版本中上线，用于配置考核标准、录入考核成绩及查看考核记录。
            当前可通过「学员管理」中的考核打分功能进行评分。
          </p>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
            <Construction className="h-4 w-4" />
            <span className="text-sm font-medium">功能开发中，敬请期待</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Construction } from 'lucide-react';

export default function LevelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">等级体系</h1>
        <p className="text-muted-foreground mt-1">管理阿姨等级评定与升降级规则</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Layers className="h-16 w-16 text-blue-300 mb-4" />
          <h2 className="text-xl font-semibold mb-2">等级体系</h2>
          <p className="text-muted-foreground text-center max-w-md mb-4">
            此功能将在后续版本中上线，用于配置阿姨等级评定标准、升降级规则及权益体系。
          </p>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
            <Construction className="h-4 w-4" />
            <span className="text-sm font-medium">功能开发中，敬请期待</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

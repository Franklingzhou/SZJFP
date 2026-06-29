'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 培训管理入口页 — 重定向到课程管理
 * 培训模块的课程/排课/报名/场地等功能通过侧边栏菜单直接进入
 */
export default function TrainingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/courses');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <p className="text-slate-400">正在跳转到培训管理...</p>
    </div>
  );
}

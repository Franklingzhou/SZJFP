'use client';

import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const newToast: Toast = { id, title, description, variant };
    setToasts(prev => [...prev, newToast]);
    // 简单提示：实际生产环境应使用 UI toast 组件
    const msg = `${title}${description ? ': ' + description : ''}`;
    if (variant === 'destructive') {
      console.error(msg);
    } else {
      console.log(msg);
    }
    // 3秒后自动移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return { toast, toasts };
}

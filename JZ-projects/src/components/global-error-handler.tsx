'use client';

import { useEffect } from 'react';

/**
 * 全局错误捕获组件
 * 捕获未处理的Promise rejection和window错误，显示在页面上方便调试
 */
export default function GlobalErrorHandler() {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      console.error('[GlobalError]', event.error || event.message);
    };
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      console.error('[UnhandledRejection]', event.reason);
    };
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', rejectionHandler);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  return null;
}

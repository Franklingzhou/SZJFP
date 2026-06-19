'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-red-500 text-lg font-semibold">页面加载出错</div>
      <div className="text-slate-600 text-sm text-center max-w-md break-all">
        {error.message || '未知错误'}
      </div>
      {error.digest && (
        <div className="text-slate-400 text-xs">Digest: {error.digest}</div>
      )}
      <button
        onClick={reset}
        className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
      >
        重试
      </button>
    </div>
  );
}

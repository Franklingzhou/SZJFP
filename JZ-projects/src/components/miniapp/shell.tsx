'use client';

import { useMiniApp } from '@/components/miniapp/context';
import MiniAppTabBar from '@/components/miniapp/tab-bar';
import { ROLE_LABELS } from '@/lib/types';

export default function MiniAppShell({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, currentRole } = useMiniApp();

  return (
    <div className="min-h-screen bg-slate-50 max-w-lg mx-auto relative">
      {/* Mini app header */}
      {isLoggedIn && currentRole && (
        <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-center">
          <h1 className="text-base font-semibold text-slate-800">
            {ROLE_LABELS[currentRole]}端
          </h1>
        </div>
      )}

      {/* Content */}
      <div className={isLoggedIn ? 'pb-16' : ''}>
        {children}
      </div>

      {/* Tab Bar */}
      {isLoggedIn && <MiniAppTabBar />}
    </div>
  );
}

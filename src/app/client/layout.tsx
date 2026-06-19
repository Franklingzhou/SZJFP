'use client';

import React from 'react';
import ClientSidebar from '@/components/client/sidebar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <ClientSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

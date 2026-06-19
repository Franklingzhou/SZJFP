'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminSidebar from '@/components/admin/sidebar';
import AdminHeader from '@/components/admin/header';
import { initDataFromApi, isDataLoaded } from '@/lib/data-service';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dataReady, setDataReady] = useState(isDataLoaded());
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 登录页不需要检查登录态
    if (pathname === '/admin/login') {
      setAuthChecked(true);
      return;
    }

    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    const role = localStorage.getItem('auth_role') || localStorage.getItem('miniapp_role');

    if (!token || !role) {
      router.replace('/admin/login');
      return;
    }

    setAuthChecked(true);

    if (!isDataLoaded()) {
      initDataFromApi().then(() => setDataReady(true));
    }
  }, [pathname, router]);

  // 登录页用独立布局
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6">{dataReady ? children : <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>}</main>
      </div>
    </div>
  );
}

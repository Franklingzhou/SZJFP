'use client';

import { useMiniApp } from '@/components/miniapp/context';
import { redirect } from 'next/navigation';

export default function MiniAppHomePage() {
  const { isLoggedIn, currentRole } = useMiniApp();
  
  if (isLoggedIn && currentRole) {
    redirect(`/m/${currentRole}`);
  }
  
  redirect('/m/login');
}

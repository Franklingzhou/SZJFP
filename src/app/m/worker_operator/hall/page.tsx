'use client';

import React from 'react';
import HallPage from '@/components/miniapp/hall';
import { useMiniApp } from '@/components/miniapp/context';

export default function WorkerOpsHallPage() {
  const { user } = useMiniApp();

  return <HallPage currentRole="worker_operator" currentUserId={user?.id || 'wo001'} />;
}

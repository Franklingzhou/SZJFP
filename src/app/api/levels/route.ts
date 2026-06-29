import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';

// GET /api/levels — 等级体系（功能开发中，返回空列表）
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'workers:read');

  if (session instanceof NextResponse) return session;
  return NextResponse.json({ data: [], total: 0 });
}

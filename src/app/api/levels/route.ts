import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/levels — 等级体系（功能开发中，返回空列表）
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'workers:read');
  if (!session) return unauthorizedResponse();
  return NextResponse.json({ data: [], total: 0 });
}

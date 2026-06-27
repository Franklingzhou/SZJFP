import { NextRequest, NextResponse } from 'next/server';

// 别名路由: POST /api/leads/[id]/follow-ups → 委托给 followups 端点
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { GET: handler } = await import('../followups/route');
  return handler(request, { params });
};

export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { POST: handler } = await import('../followups/route');
  return handler(request, { params });
};

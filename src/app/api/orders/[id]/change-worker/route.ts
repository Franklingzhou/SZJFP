import { NextRequest, NextResponse } from 'next/server';

// POST /api/orders/[id]/change-worker — 更换阿姨（委托给 replace 端点）
// 这是 change-worker 和 replace 的别名兼容路由
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { POST: replaceHandler } = await import('../replace/route');
  return replaceHandler(request, { params });
};

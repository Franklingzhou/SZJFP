/**
 * /api/applications — 别名路由，转发到 /api/worker-applications
 * 前端可能使用 /api/applications 而非 /api/worker-applications
 */
import { NextRequest, NextResponse } from 'next/server';

// 简单转发：直接用 worker-applications 的 handler
export async function GET(request: NextRequest) {
  const { GET: handler } = await import('../worker-applications/route');
  return handler(request);
}

export async function POST(request: NextRequest) {
  const { POST: handler } = await import('../worker-applications/route');
  return handler(request);
}

export async function DELETE(request: NextRequest) {
  const { DELETE: handler } = await import('../worker-applications/route');
  return handler(request);
}

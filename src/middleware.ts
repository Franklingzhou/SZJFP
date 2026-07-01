/**
 * Next.js 全局中间件 — 安全头 + CSRF Origin 校验
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin } from '@/lib/csrf';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 安全头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // CSRF: API 的非 GET/HEAD 请求必须携带合法 Origin
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (!isValidOrigin(request)) {
        return NextResponse.json({ error: '请求来源不合法' }, { status: 403 });
      }
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};

/**
 * CSRF 防护工具
 * 基于 Origin/Referer 校验（适用于 Bearer Token 认证体系）
 */
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL || '',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com',
].filter(Boolean);

/** 校验请求来源是否合法 */
export function isValidOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  // 无 Origin 头 → 非浏览器请求（脚本/服务端/curl）→ 放行
  if (!origin) return true;

  return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || allowed.startsWith(origin));
}

/** CSRF 校验：对非 GET/HEAD 请求检查 Origin */
export function csrfCheck(request: NextRequest): NextResponse | null {
  if (request.method === 'GET' || request.method === 'HEAD') return null;

  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'CSRF 校验失败' }, { status: 403 });
  }
  return null; // 通过
}

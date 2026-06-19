import { NextRequest, NextResponse } from 'next/server';

// 重定向到 /api/commission
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.pathname = '/api/commission';
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  url.pathname = '/api/commission';
  
  const body = await request.text();
  return fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

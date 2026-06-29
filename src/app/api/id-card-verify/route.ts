import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/id-card-verify — 身份证验证（占位实现）
export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'workers:write');

  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { id_card, name } = body as { id_card: string; name: string };

    if (!id_card || !name) {
      return NextResponse.json({ ok: false, error: '身份证号和姓名为必填项' }, { status: 400 });
    }

    // 占位实现：简单校验身份证号格式
    const isValidFormat = /^\d{17}[\dXx]$/.test(id_card);
    if (!isValidFormat) {
      return NextResponse.json({ ok: false, error: '身份证号格式不正确' }, { status: 400 });
    }

    // 模拟验证通过
    return NextResponse.json({
      ok: true,
      data: {
        verified: true,
        id_card,
        name,
        verified_at: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '验证失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

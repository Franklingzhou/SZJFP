import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface CreditRuleItem {
  id: string;
  event: string;        // 事件描述，如 "好评加15分"
  score_change: number; // 正数加分，负数扣分
  target_roles: string[]; // 适用角色，如 ["worker", "agent"]
  active: boolean;
  category?: string;    // 分类：bonus/penalty
}

// GET /api/credit-rules — 获取诚信分规则列表
export async function GET(_request: NextRequest) {
  const result = await checkPermissionDetailed(_request, 'credit:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .eq('key', 'credit_rules')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: true, data: [] });
    }

    const rules: CreditRuleItem[] = data?.value || [];
    return NextResponse.json({ ok: true, data: rules });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// PUT /api/credit-rules — 保存诚信分规则（admin only）
export async function PUT(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'credit:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { rules } = body as { rules: CreditRuleItem[] };

    if (!Array.isArray(rules)) {
      return NextResponse.json({ ok: false, error: 'rules 必须是数组' }, { status: 400 });
    }

    // Upsert to system_settings
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'credit_rules',
        value: rules,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: rules });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '保存失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

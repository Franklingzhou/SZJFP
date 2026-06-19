import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/cron/expiry-check — 通用到期检查定时任务
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const results: Record<string, number> = {};

    // 检查合同到期
    const { data: expiredContracts } = await supabase
      .from('contracts')
      .select('id')
      .eq('status', 'active')
      .lt('end_date', now);

    if (expiredContracts && expiredContracts.length > 0) {
      for (const c of expiredContracts) {
        await supabase
          .from('contracts')
          .update({ status: 'expired', updated_at: now })
          .eq('id', c.id);
      }
    }
    results.contracts_expired = expiredContracts?.length || 0;

    // 检查平台费用逾期
    const { data: overdueFees } = await supabase
      .from('platform_fees')
      .select('id')
      .eq('status', 'pending')
      .lt('due_date', now);

    if (overdueFees && overdueFees.length > 0) {
      for (const f of overdueFees) {
        await supabase
          .from('platform_fees')
          .update({ status: 'overdue', updated_at: now })
          .eq('id', f.id);
      }
    }
    results.fees_overdue = overdueFees?.length || 0;

    return NextResponse.json({ ok: true, data: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

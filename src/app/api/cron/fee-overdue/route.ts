import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/cron/fee-overdue — 费用逾期检查定时任务
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // 查询逾期未支付的平台费用
    const { data: overdueFees, error } = await supabase
      .from('platform_fees')
      .select('*')
      .eq('status', 'pending')
      .lt('due_date', now);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 自动标记逾期费用
    if (overdueFees && overdueFees.length > 0) {
      for (const fee of overdueFees) {
        await supabase
          .from('platform_fees')
          .update({ status: 'overdue', updated_at: new Date().toISOString() })
          .eq('id', fee.id);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        overdue: overdueFees || [],
        overdueCount: overdueFees?.length || 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

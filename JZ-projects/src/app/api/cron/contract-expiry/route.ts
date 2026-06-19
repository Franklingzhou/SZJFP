import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/cron/contract-expiry — 合同到期检查定时任务
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString().split('T')[0];

    // 查询即将到期（30天内）的合同
    const { data: expiringContracts, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('status', 'active')
      .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .gte('end_date', now);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 查询已过期的合同
    const { data: expiredContracts, error: expiredError } = await supabase
      .from('contracts')
      .select('*')
      .eq('status', 'active')
      .lt('end_date', now);

    if (expiredError) {
      return NextResponse.json({ ok: false, error: expiredError.message }, { status: 500 });
    }

    // 自动标记已过期合同
    if (expiredContracts && expiredContracts.length > 0) {
      for (const contract of expiredContracts) {
        await supabase
          .from('contracts')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', contract.id);
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        expiring: expiringContracts || [],
        expired: expiredContracts || [],
        expiredCount: expiredContracts?.length || 0,
        expiringCount: expiringContracts?.length || 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

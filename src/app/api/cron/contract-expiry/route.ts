import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/cron/contract-expiry — 合同到期检查定时任务
// Vercel cron: 每天凌晨3点执行
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    const nowISO = now.toISOString();
    const nowDate = nowISO.split('T')[0];
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 查询7天内即将到期的合同（紧急提醒）
    const { data: urgentContracts, error: urgentErr } = await supabase
      .from('contracts')
      .select('id, title, type, party_a_id, party_b_id, party_b_name, end_date')
      .eq('status', 'active')
      .lte('end_date', in7Days)
      .gte('end_date', nowDate);

    if (urgentErr) console.error('[contract-expiry] urgent query error:', urgentErr.message);

    // 查询30天内即将到期的合同（常规提醒）
    const { data: expiringContracts, error } = await supabase
      .from('contracts')
      .select('id, title, type, party_a_id, party_b_id, party_b_name, end_date')
      .eq('status', 'active')
      .lte('end_date', in30Days)
      .gt('end_date', in7Days);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 查询已过期的合同
    const { data: expiredContracts, error: expiredError } = await supabase
      .from('contracts')
      .select('id, title, type, party_a_id, party_b_id, party_b_name, end_date')
      .eq('status', 'active')
      .lt('end_date', nowDate);

    if (expiredError) {
      return NextResponse.json({ ok: false, error: expiredError.message }, { status: 500 });
    }

    let notifiedCount = 0;

    // 自动标记已过期合同 + 发送通知
    if (expiredContracts && expiredContracts.length > 0) {
      for (const contract of expiredContracts) {
        await supabase
          .from('contracts')
          .update({ status: 'expired', updated_at: nowISO })
          .eq('id', contract.id);

        // 通知合同双方
        const notifyUsers = [contract.party_a_id, contract.party_b_id].filter(Boolean) as string[];
        for (const uid of notifyUsers) {
          await supabase.from('notifications').insert({
            user_id: uid,
            type: 'contract_expiry',
            title: '合同已到期',
            content: `合同"${contract.title || '未命名'}"已于${contract.end_date || '今天'}到期，系统已自动标记为已过期。`,
            related_id: contract.id,
            related_type: 'contract',
            is_read: false,
            created_at: nowISO,
          });
          notifiedCount++;
        }
      }
    }

    // 7天内到期合同发送紧急提醒
    if (urgentContracts && urgentContracts.length > 0) {
      for (const contract of urgentContracts) {
        const notifyUsers = [contract.party_a_id, contract.party_b_id].filter(Boolean) as string[];
        for (const uid of notifyUsers) {
          await supabase.from('notifications').insert({
            user_id: uid,
            type: 'contract_expiry_warning',
            title: '合同即将到期（紧急）',
            content: `合同"${contract.title || '未命名'}"将于${contract.end_date}到期，仅剩不到7天，请尽快处理续约或结单。`,
            related_id: contract.id,
            related_type: 'contract',
            is_read: false,
            created_at: nowISO,
          });
          notifiedCount++;
        }
      }
    }

    // 30天内到期合同发送常规提醒
    if (expiringContracts && expiringContracts.length > 0) {
      for (const contract of expiringContracts) {
        const notifyUsers = [contract.party_a_id, contract.party_b_id].filter(Boolean) as string[];
        for (const uid of notifyUsers) {
          await supabase.from('notifications').insert({
            user_id: uid,
            type: 'contract_expiry_reminder',
            title: '合同即将到期',
            content: `合同"${contract.title || '未命名'}"将于${contract.end_date}到期，请在30天内完成续约或结单处理。`,
            related_id: contract.id,
            related_type: 'contract',
            is_read: false,
            created_at: nowISO,
          });
          notifiedCount++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        expiring: expiringContracts || [],
        expired: expiredContracts || [],
        urgent: urgentContracts || [],
        expiredCount: expiredContracts?.length || 0,
        expiringCount: (expiringContracts?.length || 0) + (urgentContracts?.length || 0),
        notifiedCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

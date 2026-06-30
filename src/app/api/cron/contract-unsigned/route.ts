import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/cron/contract-unsigned — 合同超时未确认提醒
 *
 * 逻辑：合同创建超过 X 小时仍为 'draft'/'pending_confirm' 状态，提醒对应负责人确认
 *   - 培训合同 → 提醒培训主管（training_supervisor）
 *   - 中介合同 → 提醒经纪人（agent）
 * 阈值：从 system_settings.key='reminder_settings' 读取 contract_unsigned_hours，默认 72
 *
 * Vercel cron: 建议每天上午 10 点执行一次
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    let notifiedCount = 0;

    let thresholdHours = 72;
    try {
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'reminder_settings')
        .maybeSingle();
      if (settingsData?.value) {
        const val = settingsData.value as Record<string, unknown>;
        if (typeof val.contract_unsigned_hours === 'number') thresholdHours = val.contract_unsigned_hours;
      }
    } catch { /* 使用默认值 */ }

    const threshold = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

    // 查询未确认的合同（draft + pending_confirm），限制5条防止超时
    const { data: unsignedContracts, error } = await supabase
      .from('contracts')
      .select('id, title, type, party_a_id, party_b_id, party_b_name, status, created_at')
      .in('status', ['draft', 'pending_confirm'])
      .lt('created_at', threshold)
      .limit(5);

    if (error) {
      console.error('[contract-unsigned] query error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (unsignedContracts && unsignedContracts.length > 0) {
      for (const contract of unsignedContracts) {
        // 根据合同类型确定提醒对象
        // 培训合同 → 提醒培训主管（查找 role=training_supervisor 的用户）
        // 中介合同 → 提醒 party_a（通常为经纪人）
        let targetUsers: string[] = [];

        if (contract.type === 'training') {
          // 查找培训主管
          const { data: supervisors } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'training_supervisor')
            .limit(3);
          if (supervisors) {
            targetUsers = supervisors.map((u: Record<string, unknown>) => u.id as string);
          }
        } else {
          // 中介合同：提醒 party_a（经纪人）
          if (contract.party_a_id) targetUsers = [contract.party_a_id];
        }

        // 同时提醒 party_b
        if (contract.party_b_id) targetUsers.push(contract.party_b_id);

        for (const uid of [...new Set(targetUsers)]) {
          // 防重复
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', uid)
            .eq('type', 'contract_unsigned')
            .eq('related_id', contract.id)
            .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(1);

          if (existingNotif && existingNotif.length > 0) continue;

          const hoursAgo = Math.floor((Date.now() - new Date(contract.created_at).getTime()) / (60 * 60 * 1000));
          const contractTypeLabel = contract.type === 'training' ? '培训合同' : '中介合同';
          await supabase.from('notifications').insert({
            user_id: uid,
            type: 'contract_unsigned',
            title: '合同超时未确认',
            content: `${contractTypeLabel}"${contract.title || '未命名'}"已创建 ${hoursAgo} 小时仍未确认，请尽快完成审核确认。`,
            related_id: contract.id,
            related_type: 'contract',
            is_read: false,
            created_at: now,
          });
          notifiedCount++;
        }
      }
    }

    console.log('[contract-unsigned] Notified:', notifiedCount, 'thresholdHours:', thresholdHours);
    return NextResponse.json({ ok: true, data: { notifiedCount, config: { contract_unsigned_hours: thresholdHours } } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '检查失败';
    console.error('[contract-unsigned] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

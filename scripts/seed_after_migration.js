/**
 * P0修复 - 后迁移种子数据
 * 使用 Supabase REST API（HTTPS）插入测试数据
 * 运行方式：node scripts/seed_after_migration.js
 * 前置条件：已在 Supabase SQL Editor 中执行 migration_p0_fixes.sql
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mozamdshnaydbycpbifd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('[seed] Starting post-migration seeding...\n');

  // 1. 确保 system_settings 表有数据
  console.log('[1] Seeding system_settings...');
  const settings = [
    { key: 'platform_info', value: { name: '家政共创平台', version: '2.0.0', description: '连接阿姨、经纪人、招生、讲师、客户的完整家政服务生态' }, description: '平台基本信息' },
    { key: 'commission_defaults', value: { creator_rate: 30, maintainer_rate: 20, referrer_rate: 50 }, description: '佣金分账默认比例' },
    { key: 'credit_rules', value: { initial_score: 1000, min_score: 0, blacklist_threshold: 300 }, description: '诚信分规则' },
  ];
  for (const s of settings) {
    const { error } = await supabase.from('system_settings').upsert(s, { onConflict: 'key' });
    if (error) console.log(`  system_settings.${s.key}: SKIP (${error.message.substring(0, 60)})`);
    else console.log(`  system_settings.${s.key}: OK`);
  }

  // 2. 获取现有用户
  console.log('\n[2] Fetching existing users...');
  const { data: users } = await supabase.from('users').select('id, name, role, phone');
  if (!users) { console.log('  No users found!'); return; }
  console.log(`  Found ${users.length} users`);
  
  const admin = users.find(u => u.role === 'admin');
  const agent = users.find(u => u.role === 'agent');
  const recruiter = users.find(u => u.role === 'recruiter');
  const worker = users.find(u => u.role === 'worker');

  // 3. 种子 contracts（pending_approval 状态）
  console.log('\n[3] Seeding contracts with pending_approval...');
  if (admin && agent) {
    const c1 = {
      id: 'contract_pending_001',
      title: '经纪代理合同-审核中',
      type: 'platform-agent',
      party_a_id: admin.id,
      party_b_id: agent.id,
      party_b_name: agent.name || '张丽华',
      party_b_phone: agent.phone || '13600001234',
      party_b_id_card: null,
      price: 500.00,
      start_date: '2026-07-01',
      end_date: '2027-06-30',
      status: 'pending_approval',
      created_at: new Date().toISOString(),
    };
    const { error: e1 } = await supabase.from('contracts').upsert(c1, { onConflict: 'id' });
    if (e1) console.log(`  contract_pending_001: ERR ${e1.message.substring(0, 80)}`);
    else console.log('  contract_pending_001: OK (platform-agent)');
  }

  if (admin && recruiter) {
    const c2 = {
      id: 'contract_pending_002',
      title: '招生合作协议-待审核',
      type: 'platform-recruiter',
      party_a_id: admin.id,
      party_b_id: recruiter.id,
      party_b_name: recruiter.name || '陈招生',
      party_b_phone: recruiter.phone || '13500003456',
      party_b_id_card: null,
      price: 300.00,
      start_date: '2026-07-15',
      end_date: '2027-07-14',
      status: 'pending_approval',
      created_at: new Date().toISOString(),
    };
    const { error: e2 } = await supabase.from('contracts').upsert(c2, { onConflict: 'id' });
    if (e2) console.log(`  contract_pending_002: ERR ${e2.message.substring(0, 80)}`);
    else console.log('  contract_pending_002: OK (platform-recruiter)');
  }

  // 4. 种子一些已签/活跃合同，供测试使用
  console.log('\n[4] Seeding active contracts...');
  if (admin && agent) {
    const c3 = {
      id: 'contract_active_001',
      title: '经纪代理合同-生效中',
      type: 'platform-agent',
      party_a_id: admin.id,
      party_b_id: agent.id,
      party_b_name: agent.name || '张丽华',
      party_b_phone: agent.phone || '13600001234',
      price: 800.00,
      start_date: '2026-06-01',
      end_date: '2027-05-31',
      status: 'active',
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
      signed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const { error: e3 } = await supabase.from('contracts').upsert(c3, { onConflict: 'id' });
    if (e3) console.log(`  contract_active_001: ERR ${e3.message.substring(0, 80)}`);
    else console.log('  contract_active_001: OK');
  }

  // 5. 更新 workers 状态（idle → available）
  console.log('\n[5] Updating workers status...');
  const { error: wErr } = await supabase.from('workers').update({ status: 'available' }).eq('status', 'idle');
  if (wErr) console.log(`  workers update: ERR ${wErr.message.substring(0, 80)}`);
  else console.log('  workers update: OK');

  // 6. 确认合同数据
  console.log('\n[6] Verifying contracts...');
  const { data: contracts } = await supabase.from('contracts').select('id, title, status').order('created_at', { ascending: false }).limit(10);
  if (contracts) {
    for (const c of contracts) {
      console.log(`  ${c.id}: [${c.status}] ${c.title || '(no title)'}`);
    }
  }

  console.log('\n[seed] Done!');
}

seed().catch(err => {
  console.error('[seed] Fatal error:', err.message);
  process.exit(1);
});

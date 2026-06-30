/**
 * 测试场景数据预热 — 一键创建手工测试需要的所有前置数据状态
 *
 * 用途：解决手工测试计划中 73 项因缺少数据状态而被 blocked 的问题
 * 运行：node scripts/seed_test_scenarios.cjs
 * 安全：使用 upsert，重复运行不会污染数据
 *
 * 创建的测试场景：
 *   S1. 开放订单（status=open）      → 解锁 订单大厅/投递/推荐 测试
 *   S2. 活跃阿姨（status=available） → 解锁 投递/自荐 测试
 *   S3. 签约订单+合同（signed/active）→ 解锁 签约/换人/退款/评价 测试
 *   S4. 课程+合格学员                → 解锁 考核/转简历 测试
 *   S5. 公海线索                     → 解锁 招生领取线索 测试
 *   S6. 待审核合同/课程               → 解锁 主管审批 测试
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mozamdshnaydbycpbifd.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 固定的测试场景 ID（前缀 seed_v2_ 避免与真实数据冲突）
const SID = {
  order_open: 'seed_v2_order_open',
  order_signed: 'seed_v2_order_signed',
  worker_avail: 'seed_v2_worker_a',
  contract_active: 'seed_v2_contract_active',
  contract_pending: 'seed_v2_contract_pending',
  course_test: 'seed_v2_course_test',
  enroll_student1: 'seed_v2_enroll_s1',
  enroll_student2: 'seed_v2_enroll_s2',
  lead_public: 'seed_v2_lead_public',
  schedule_pending: 'seed_v2_schedule_pending',
};

const now = () => new Date().toISOString();
const tomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  种子脚本：测试场景数据预热 v2');
  console.log('═══════════════════════════════════════════\n');

  let created = 0, updated = 0, skipped = 0;

  // ─── 0. 获取现有用户和阿姨 ───
  console.log('[0] 获取现有数据...');
  const { data: users } = await supabase.from('users').select('id, name, role, phone');
  const { data: workers } = await supabase.from('workers').select('id, name, status, user_id, phone');

  if (!users || users.length === 0) {
    console.log('❌ 没有用户数据，请先执行 seed_after_migration.js');
    process.exit(1);
  }

  const findByRole = (role) => users.filter(u => u.role === role);
  const admin = findByRole('admin')[0];
  const agents = findByRole('agent');
  const recruiters = findByRole('recruiter');
  const instructors = findByRole('instructor');
  const supervisors = findByRole('training_supervisor');
  const workers_r = findByRole('worker');
  const customers_r = findByRole('customer');

  // 如果某些角色没有用户，尝试用 admin 代替（仅用于 party 字段）
  const agentUser = agents[0] || admin;
  const recruiterUser = recruiters[0] || admin;
  const instructorUser = instructors[0] || admin;
  const supervisorUser = supervisors[0] || admin;
  const workerUser = workers_r[0] || admin;
  const customerUser = customers_r[0] || admin;

  console.log(`  用户: ${users.length} | 阿姨: ${workers.length}`);
  console.log(`  角色: admin=${!!admin} agent=${agents.length} recruiter=${recruiters.length}`);
  console.log(`        instructor=${instructors.length} supervisor=${supervisors.length}`);
  console.log(`        worker=${workers_r.length} customer=${customers_r.length}`);

  // ─── S1: 确保有可用阿姨 ───
  console.log('\n[S1] 确保活跃阿姨 (status=available)...');
  if (workers.length > 0) {
    const { error } = await supabase
      .from('workers')
      .update({ status: 'available', updated_at: now() })
      .in('status', ['idle', 'pending']);
    if (error) console.log(`  ⚠ 批量更新失败: ${error.message}`);
    else { updated += workers.filter(w => w.status === 'idle' || w.status === 'pending').length; console.log('  ✅ 空闲/待审阿姨 → available'); }
  }

  // ─── S2: 创建开放订单 ───
  console.log('\n[S2] 创建开放订单 (status=open)...');
  const workerForOrder = workers.find(w => w.status === 'available') || workers[0];
  if (agentUser && workerForOrder) {
    const orderOpen = {
      id: SID.order_open,
      title: '测试合单-待匹配阿姨',
      service_type: '月嫂',
      location: '深圳市南山区',
      salary_min: 8000,
      salary_max: 12000,
      status: 'open',
      created_by: agentUser.id,
      customer_id: customerUser.id,
      description: '【测试场景】用于验证订单大厅、投递、推荐功能',
      created_at: now(),
      updated_at: now(),
    };
    const { error } = await supabase.from('orders').upsert(orderOpen, { onConflict: 'id' });
    if (error) console.log(`  ⚠ ${error.message.substring(0, 80)}`);
    else { created++; console.log(`  ✅ ${SID.order_open}`); }
  } else {
    console.log('  ⚠ 缺少 agent 或 worker，跳过');
  }

  // ─── S3: 创建签约订单+活跃合同 ───
  console.log('\n[S3] 创建签约订单+活跃合同...');
  const workerForSigned = workers[1] || workers[0];
  if (agentUser && workerForSigned && customerUser) {
    const orderSigned = {
      id: SID.order_signed,
      title: '测试合单-已签约进行中',
      service_type: '保姆',
      location: '深圳市福田区',
      salary_min: 5000,
      salary_max: 7000,
      status: 'signed',
      worker_id: workerForSigned.id,
      created_by: agentUser.id,
      customer_id: customerUser.id,
      description: '【测试场景】已签约订单，用于验证评价、换人、退款',
      signed_at: '2026-06-15',
      created_at: '2026-06-01',
      updated_at: now(),
    };
    const { error: e1 } = await supabase.from('orders').upsert(orderSigned, { onConflict: 'id' });
    if (e1) console.log(`  ⚠ order: ${e1.message.substring(0, 80)}`);
    else { created++; console.log(`  ✅ order: ${SID.order_signed}`); }

    // 更新对应阿姨为 working 状态
    await supabase.from('workers').update({ status: 'working', updated_at: now() }).eq('id', workerForSigned.id);

    const contractActive = {
      id: SID.contract_active,
      title: '测试中介合同-已生效',
      type: 'agency',
      party_a_id: admin.id,
      party_b_id: agentUser.id,
      party_b_name: agentUser.name || '经纪人',
      party_b_phone: agentUser.phone || '',
      order_id: SID.order_signed,
      price: 500.00,
      start_date: '2026-06-15',
      end_date: '2027-06-14',
      status: 'active',
      signed_at: '2026-06-15',
      created_at: '2026-06-01',
    };
    const { error: e2 } = await supabase.from('contracts').upsert(contractActive, { onConflict: 'id' });
    if (e2) console.log(`  ⚠ contract: ${e2.message.substring(0, 80)}`);
    else { created++; console.log(`  ✅ contract: ${SID.contract_active}`); }
  }

  // ─── S4: 创建培训课程+学员 ───
  console.log('\n[S4] 创建培训课程+合格学员...');
  if (instructorUser) {
    const course = {
      id: SID.course_test,
      name: '测试培训课程-月嫂基础',
      description: '【测试场景】月嫂基础培训，含理论+实操',
      type: '月嫂',
      duration: '7天',
      price: 2000.00,
      status: 'approved',
      instructor_id: instructorUser.id,
      max_students: 20,
      created_by: instructorUser.id,
      created_at: now(),
      updated_at: now(),
    };
    const { error: e1 } = await supabase.from('courses').upsert(course, { onConflict: 'id' });
    if (e1) console.log(`  ⚠ course: ${e1.message.substring(0, 80)}`);
    else { created++; console.log(`  ✅ course: ${SID.course_test}`); }

    // 创建排课记录（待审核状态）
    const schedule = {
      id: SID.schedule_pending,
      course_id: SID.course_test,
      name: '月嫂基础-第1期',
      start_date: tomorrow(),
      end_date: '2026-07-15',
      location: '深圳市南山区培训中心',
      instructor_id: instructorUser.id,
      status: 'pending_approval',
      max_students: 20,
      created_by: instructorUser.id,
      created_at: now(),
    };
    const { error: e2 } = await supabase.from('course_schedules').upsert(schedule, { onConflict: 'id' });
    if (e2) console.log(`  ⚠ schedule: ${e2.message.substring(0, 80)}`);
    else { created++; console.log(`  ✅ schedule: ${SID.schedule_pending}`); }

    // 创建合格学员（enrollments + students 同时）
    if (workerUser) {
      const enroll1 = {
        id: SID.enroll_student1,
        course_id: SID.course_test,
        user_id: workerUser.id,
        worker_id: workerUser.id,
        status: 'passed',
        score: 85,
        name: workerUser.name || '学员A',
        phone: workerUser.phone || '',
        enrolled_at: '2026-06-01',
        completed_at: '2026-06-10',
        created_at: now(),
      };
      const { error: e3 } = await supabase.from('enrollments').upsert(enroll1, { onConflict: 'id' });
      if (e3) console.log(`  ⚠ enrollment1: ${e3.message.substring(0, 80)}`);
      else { created++; console.log(`  ✅ enrollment: ${SID.enroll_student1} (合格)`); }
    }

    if (workers_r[1]) {
      const enroll2 = {
        id: SID.enroll_student2,
        course_id: SID.course_test,
        user_id: workers_r[1].id,
        worker_id: workers_r[1].id,
        status: 'passed',
        score: 78,
        name: workers_r[1].name || '学员B',
        phone: workers_r[1].phone || '',
        enrolled_at: '2026-06-02',
        completed_at: '2026-06-12',
        created_at: now(),
      };
      const { error: e4 } = await supabase.from('enrollments').upsert(enroll2, { onConflict: 'id' });
      if (e4) console.log(`  ⚠ enrollment2: ${e4.message.substring(0, 80)}`);
      else { created++; console.log(`  ✅ enrollment: ${SID.enroll_student2} (合格)`); }
    }
  }

  // ─── S5: 创建公海线索 ───
  console.log('\n[S5] 创建公海线索...');
  if (recruiterUser) {
    const lead = {
      id: SID.lead_public,
      name: '测试公海线索-找阿姨',
      phone: '13900009999',
      intention: '需要月嫂一名，照顾产妇和新生儿',
      service_type: '月嫂',
      location: '深圳市宝安区',
      budget: 10000.00,
      source: 'manual',
      is_public: true,
      assigned_to: null,
      status: 'new',
      created_by: recruiterUser.id,
      created_at: now(),
    };
    const { error } = await supabase.from('leads').upsert(lead, { onConflict: 'id' });
    if (error) console.log(`  ⚠ ${error.message.substring(0, 80)}`);
    else { created++; console.log(`  ✅ ${SID.lead_public}`); }
  }

  // ─── S6: 创建待审核合同 ───
  console.log('\n[S6] 创建待审核合同...');
  if (supervisorUser && instructorUser) {
    const contractPending = {
      id: SID.contract_pending,
      title: '测试培训合同-待审核',
      type: 'training',
      party_a_id: admin.id,
      party_b_id: instructorUser.id,
      party_b_name: instructorUser.name || '讲师',
      party_b_phone: instructorUser.phone || '',
      price: 1500.00,
      start_date: tomorrow(),
      end_date: '2027-06-30',
      status: 'pending_approval',
      created_at: now(),
    };
    const { error } = await supabase.from('contracts').upsert(contractPending, { onConflict: 'id' });
    if (error) console.log(`  ⚠ ${error.message.substring(0, 80)}`);
    else { created++; console.log(`  ✅ ${SID.contract_pending}`); }
  }

  // ─── 汇总 ───
  console.log('\n═══════════════════════════════════════════');
  console.log(`  完成！新增: ${created} | 更新: ${updated} | 跳过: ${skipped}`);
  console.log('═══════════════════════════════════════════\n');

  console.log('📋 场景对应关系（用于手工测试）：');
  console.log('  S1 活跃阿姨     → workers status=available');
  console.log('  S2 开放订单     → orders status=open      → 解锁 B04/K04/W04/T07/S08');
  console.log('  S3 签约+合同    → orders signed+contract active → 解锁 B08/B09/B19/C02-C06/K13-K16');
  console.log('  S4 课程+学员    → course approved+enrollments passed → 解锁 T03-T06/T14/S18');
  console.log('  S5 公海线索     → leads is_public=true    → 解锁 R03/R04');
  console.log('  S6 待审合同     → contract pending_approval → 解锁 S05');
  console.log('\n💡 提示：运行 node scripts/seed_test_scenarios.cjs 可随时重置测试数据');
}

main().catch(err => {
  console.error('\n❌ 致命错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});

import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// POST /api/leads/[id]/convert — 线索签约（自动创建worker+contract+resume_review）
// 业务规则2.0: 签约即自动创建worker(status=pending)，同一phone不重复创建
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'leads:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { job_types, experience_years, specialties, expected_salary_min, expected_salary_max, direct } = body as Record<string, unknown>;
    const isDirect = !!direct; // 直接转简历：跳过招募合同和佣金，但仍走简历审核流程

    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 1. 查线索信息
    const { data: leadInfo, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !leadInfo) {
      return NextResponse.json({ error: '线索不存在' }, { status: 404 });
    }

    if (leadInfo.status === 'signed') {
      return NextResponse.json({ error: '该线索已签约' }, { status: 409 });
    }

    // 2. phone查重：同一手机号已有worker则不重复创建
    let worker = null;
    if (leadInfo.phone) {
      const { data: existingWorker } = await supabase
        .from('workers')
        .select('*')
        .eq('phone', leadInfo.phone)
        .maybeSingle();

      if (existingWorker) {
        console.log('[convert] phone already has worker, skip creation:', leadInfo.phone);
        worker = existingWorker;
      }
    }

    // 3. 无重复则创建 worker（2.0: 所有简历均需审核，统一status=pending）
    if (!worker) {
      const workerId = `wk_${Date.now()}`;
      const workerData: Record<string, unknown> = {
        id: workerId,
        user_id: null,  // 预注册：签约时不创建users，用户首次登录后自动认领绑定
        name: leadInfo.name || '',
        phone: leadInfo.phone || '',
        age: leadInfo.age || null,
        gender: leadInfo.gender || null,
        origin: leadInfo.origin || null,
        job_types: job_types || leadInfo.job_types || null,
        experience_years: experience_years || leadInfo.experience_years || null,
        specialties: specialties || leadInfo.specialties || null,
        expected_salary_min: expected_salary_min || null,
        expected_salary_max: expected_salary_max || null,
        status: 'pending',                      // 2.0: 统一pending，审核通过后变idle
        resume_review_status: 'pending',        // 2.0: 统一pending，所有简历均需审核
        creator_id: session.userId,
        creator_role: session.role,
        lead_id: leadId,
      };

      const { data: newWorker, error: workerErr } = await supabase
        .from('workers')
        .insert(workerData)
        .select()
        .single();

      if (workerErr) {
        console.error('[convert] create worker error:', workerErr);
        return NextResponse.json({ error: '创建阿姨记录失败', detail: String(workerErr) }, { status: 500 });
      }

      worker = newWorker;
    }

    // 4. 创建 contract（招募签约合同），direct模式跳过
    // 2.0: 状态为 pending_student，等待学员自助确认（或主管代确认）
    let contract = null;
    if (!isDirect) {
      const contractNo = `RC${Date.now()}`;
      const contractData: Record<string, unknown> = {
        contract_no: contractNo,
        type: 'recruitment',
        party_a_name: '平台（系统）',
        party_b_name: leadInfo.name || '',
        party_b_phone: leadInfo.phone || '',
        status: 'pending_student',
        lead_id: leadId,
        created_by: session.userId,
      };

      const { data: newContract, error: contractErr } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (contractErr) {
        console.error('[convert] create contract error:', contractErr);
      }
      contract = newContract || null;
    }

    // 5. 创建 resume_review（审核记录）— 2.0: 所有简历均需审核
    {
      const reviewData: Record<string, unknown> = {
        worker_id: (worker as Record<string, unknown>).id as string,
        status: 'pending',
        notes: isDirect ? '直接转简历待审核' : '线索签约待审核',
      };

      const { error: reviewErr } = await supabase
        .from('resume_reviews')
        .insert(reviewData)
        .select()
        .single();

      if (reviewErr) {
        console.error('[convert] create resume_review error:', reviewErr);
      }
    }

    const workerObj = worker as Record<string, unknown>;

    // 6. 更新线索状态为 signed + 签约字段
    const updatePayload: Record<string, unknown> = {
      status: 'signed',
      updated_at: new Date().toISOString(),
      signed_at: new Date().toISOString(),
      signed_by: session.userId,
      sign_worker_id: workerObj.id,
    };
    const { error: updateErr } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', leadId);

    if (updateErr) {
      console.error('[convert] update lead status error:', updateErr);
    }

    // E10t2: 线索签约自动生成佣金记录（预占位，上户后核算），direct模式跳过
    if (!isDirect) {
      const { createCommissionForLeadConvert, createSettlementsFromCommission } = await import('@/lib/commission-utils');
      const commissionRecord = await createCommissionForLeadConvert(supabase, leadInfo, workerObj.id as string);

      if (commissionRecord) {
        // A27: 同步创建 settlements
        await createSettlementsFromCommission(supabase, commissionRecord, 0);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        worker,
        contract: contract || null,
        lead_status: 'signed',
        is_existing_worker: !!leadInfo.phone,
        direct: isDirect,
      },
    }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '签约失败';
    console.error('[convert] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

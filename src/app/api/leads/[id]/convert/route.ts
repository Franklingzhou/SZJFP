import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// POST /api/leads/[id]/convert — 线索签约（创建worker+contract+resume_review）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'leads:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { job_types, experience_years, specialties, expected_salary_min, expected_salary_max } = body as Record<string, unknown>;

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

    if (leadInfo.status === 'converted' || leadInfo.status === 'signed') {
      return NextResponse.json({ error: '该线索已签约' }, { status: 409 });
    }

    // 2. 创建 worker
    const workerId = `wk_${Date.now()}`;
    const workerData: Record<string, unknown> = {
      id: workerId,
      user_id: leadInfo.user_id,
      name: leadInfo.name || '',
      age: leadInfo.age || null,
      gender: leadInfo.gender || null,
      origin: leadInfo.origin || null,
      phone: leadInfo.phone || null,
      job_types: job_types || leadInfo.job_types || null,
      experience_years: experience_years || leadInfo.experience_years || null,
      specialties: specialties || leadInfo.specialties || null,
      expected_salary_min: expected_salary_min || leadInfo.expected_salary_min || null,
      expected_salary_max: expected_salary_max || leadInfo.expected_salary_max || null,
      status: 'idle',
      resume_review_status: 'pending',
      lead_id: leadId,
      creator_id: session.userId,
      creator_role: session.role,
    };

    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .insert(workerData)
      .select()
      .single();

    if (workerErr) {
      console.error('[convert] create worker error:', workerErr);
      return NextResponse.json({ error: '创建阿姨记录失败', detail: String(workerErr) }, { status: 500 });
    }

    // 3. 创建 contract（招募签约合同：甲方=平台，乙方=阿姨）
    const contractData: Record<string, unknown> = {
      type: 'recruitment',
      party_a_id: 'platform',
      party_b_id: workerId,
      status: 'draft',
      created_by: session.userId,
    };

    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .insert(contractData)
      .select()
      .single();

    if (contractErr) {
      console.error('[convert] create contract error:', contractErr);
    }

    // 4. 创建 resume_review（审核记录）
    const reviewData: Record<string, unknown> = {
      type: 'create',
      review_type: 'sign_contract',
      worker_id: workerId,
      proposed_data: workerData,
      status: 'pending',
      submitted_by: session.userId,
    };

    const { data: review, error: reviewErr } = await supabase
      .from('resume_reviews')
      .insert(reviewData)
      .select()
      .single();

    if (reviewErr) {
      console.error('[convert] create resume_review error:', reviewErr);
    }

    // 5. 更新线索状态为 converted
    const { error: updateErr } = await supabase
      .from('leads')
      .update({ status: 'converted', updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (updateErr) {
      console.error('[convert] update lead status error:', updateErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        worker,
        contract: contract || null,
        resume_review: review || null,
        lead_status: 'converted',
      },
    }, { status: 201 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '签约失败';
    console.error('[convert] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

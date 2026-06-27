import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/contracts/[id]/confirm — 主管确认签约
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'contracts:approve');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 获取合同信息
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, status, lead_id')
      .eq('id', id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ ok: false, error: '合同不存在' }, { status: 404 });
    }

    // 确认合同
    const { data, error } = await supabase
      .from('contracts')
      .update({
        status: 'confirmed',
        approved_by: session.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // A12: 线索签约后自动创建阿姨记录 + 报名记录（2.0: student_id→worker_id）
    if (contract.lead_id) {
      // 获取线索信息
      const { data: leadData } = await supabase
        .from('leads')
        .select('id, name, phone, gender, age, user_id')
        .eq('id', contract.lead_id)
        .single();

      if (leadData) {
        // 2.0: 检查手机号是否已有简历，防止重复创建
        if (leadData.phone) {
          const { data: existingWorker } = await supabase
            .from('workers')
            .select('id, name')
            .eq('phone', leadData.phone)
            .maybeSingle();
          if (existingWorker) {
            return NextResponse.json({
              ok: false,
              error: '该手机号已有简历',
              code: 'DUPLICATE_WORKER_PHONE',
              existing: existingWorker,
            }, { status: 409 });
          }
        }

        const workerId = crypto.randomUUID();

        // 创建worker记录
        await supabase
          .from('workers')
          .insert({
            id: workerId,
            user_id: leadData.user_id || leadData.id,
            name: leadData.name,
            phone: leadData.phone || '',
            gender: leadData.gender || null,
            age: leadData.age || null,
            lead_id: contract.lead_id,
            status: 'pending',
            creator_id: session.userId,
            creator_role: session.role,
            resume_review_status: 'draft',
            remark: '线索签约自动创建',
          });

        // 如果有课程，创建enrollment
        const courseId = (contract as Record<string, unknown>).course_id as string;
        if (courseId) {
          await supabase
            .from('enrollments')
            .insert({
              id: crypto.randomUUID(),
              course_id: courseId,
              worker_id: workerId,
              student_name: leadData.name,
              status: 'enrolled',
              enrolled_by: session.userId,
            });
        }

        // A14: 线索状态更新为 signed
        await supabase
          .from('leads')
          .update({ 
            status: 'signed', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', contract.lead_id);
      }
    }

    return NextResponse.json({ success: true, ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

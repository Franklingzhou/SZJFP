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
      .select('id, lead_id, status')
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
        confirmed_by: session.userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // A12: 线索签约后自动创建学员记录
    if (contract.lead_id) {
      // 获取线索信息
      const { data: leadData } = await supabase
        .from('leads')
        .select('id, name, phone, gender, age, user_id')
        .eq('id', contract.lead_id)
        .single();

      if (leadData) {
        // 创建学员记录
        const studentId = crypto.randomUUID();
        await supabase
          .from('students')
          .insert({
            id: studentId,
            user_id: leadData.user_id || null,
            student_no: `STU-${Date.now()}`,
            name: leadData.name,
            phone: leadData.phone || '',
            gender: leadData.gender || null,
            age: leadData.age || null,
            source: 'lead_conversion',
            recruiter_id: session.userId,
            status: 'signed', // A13: 学员初始状态为signed
          });

        // A14: 线索状态更新为 signed
        await supabase
          .from('leads')
          .update({ 
            status: 'signed', 
            student_id: studentId,
            updated_at: new Date().toISOString() 
          })
          .eq('id', contract.lead_id);
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

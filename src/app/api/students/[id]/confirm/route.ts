import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/students/[id]/confirm — 学员确认（主管/管理员确认学员报名）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'students:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 查询当前报名记录
    const { data: enrollment, error: findError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !enrollment) {
      return NextResponse.json({ error: '报名记录不存在' }, { status: 404 });
    }

    // 更新状态为 confirmed
    const { data, error } = await supabase
      .from('enrollments')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: '确认失败', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sendNotification } from '@/lib/notification-helper';

// POST /api/platform-fees/[id]/confirm — 确认平台费用到账
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'platform_fees:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;

    // v13: try with confirmed_at, fallback if column missing
    const updatePayload: Record<string, unknown> = {
      status: 'confirmed',
      confirmed_by: session.userId,
    };
    let { data, error } = await supabase
      .from('platform_fees')
      .update({ ...updatePayload, confirmed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error && error.message?.includes('confirmed_at')) {
      const retry = await supabase
        .from('platform_fees')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[platform-fees confirm] Error:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 通知相关人员平台费用已确认
    const feeData = data as Record<string, unknown> | null;
    if (feeData?.user_id) {
      sendNotification({
        user_id: feeData.user_id as string,
        title: '平台费用已到账',
        content: `你的平台费用 #${id} 已确认到账`,
        type: 'fee_confirmed',
      });
    }

    return NextResponse.json({ success: true, ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '确认失败';
    console.error('[platform-fees confirm] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

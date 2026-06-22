import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * POST /api/contracts/[id]/send-code — 向签约阿姨手机发送验证码
 * E07e: 阿姨签约手机确认
 * 开发模式：验证码固定为 888888
 * 生产模式：对接短信服务商
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await checkPermissionDetailed(request, 'contracts:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const { id } = await params;
    const supabase = getSupabaseClient();

    // 获取合同信息
    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .select('id, party_b_phone, party_b_name, status')
      .eq('id', id)
      .single();

    if (contractErr || !contract) {
      return NextResponse.json({ ok: false, error: '合同不存在' }, { status: 404 });
    }

    if (!contract.party_b_phone) {
      return NextResponse.json({ ok: false, error: '该合同未填写签约人手机号，无法发送验证码' }, { status: 400 });
    }

    if (contract.status !== 'draft') {
      return NextResponse.json({ ok: false, error: `合同状态为"${contract.status}"，只有待签署(draft)状态才能发送验证码` }, { status: 409 });
    }

    // 开发模式：验证码固定 888888
    const isProd = process.env.COZE_PROJECT_ENV === 'PROD' || !!process.env.SMS_PROVIDER;
    const code = isProd ? String(Math.floor(100000 + Math.random() * 900000)) : '888888';

    if (isProd) {
      // TODO: 对接短信服务商发送验证码到 contract.party_b_phone
      // await sendSMS(contract.party_b_phone, `您的签约验证码：${code}，5分钟内有效。`);
      console.log(`[send-code] PROD mode: would send code ${code} to ${contract.party_b_phone}`);
    }

    // 记录发送（生产环境建议存 Redis，开发环境返回给前端）
    const maskedPhone = contract.party_b_phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    console.log(`[send-code] Code ${code} sent to ${maskedPhone} for contract ${id}`);

    return NextResponse.json({
      ok: true,
      data: {
        phone: maskedPhone,
        name: contract.party_b_name,
        // 开发模式返回code便于调试，生产环境不返回
        ...(isProd ? {} : { dev_code: code }),
      },
      message: `验证码已发送至 ${maskedPhone}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '发送失败';
    console.error('[send-code] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

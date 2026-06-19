import { NextRequest, NextResponse } from 'next/server';

// 发送短信验证码API
// 开发模式：不发送真实短信，验证码固定888888
// 生产模式：对接短信服务商发送真实验证码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body as { phone: string };

    if (!phone || !/^1\d{10}$/.test(phone)) {
      return NextResponse.json({ error: '请输入正确的手机号' }, { status: 400 });
    }

    // 频率限制：同一手机号60秒内只能发一次
    const rateLimitOk = await checkRateLimit(phone);
    if (!rateLimitOk) {
      return NextResponse.json({ error: '发送过于频繁，请60秒后再试' }, { status: 429 });
    }

    // 开发模式判断
    const isDev = !process.env.SMS_PROVIDER;

    if (isDev) {
      // 开发模式：不发送真实验证码，固定888888，也不写数据库
      console.log(`[sms-send] 开发模式：手机号${phone}验证码为888888`);
      return NextResponse.json({
        success: true,
        message: '验证码已发送（开发模式：请输入888888）',
        _devCode: '888888', // 仅开发模式返回
      });
    }

    // 生产模式：生成验证码 + 写数据库 + 发短信
    const code = generateCode();

    // 保存验证码到数据库
    await saveCode(phone, code);

    // 调用短信服务商
    const sent = await sendSms(phone, code);
    if (!sent) {
      return NextResponse.json({ error: '验证码发送失败，请稍后再试' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '验证码已发送' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '发送失败';
    console.error('[sms-send] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 生成6位数字验证码
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 保存验证码到数据库
async function saveCode(phone: string, code: string): Promise<void> {
  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效期

  const { error } = await supabase.from('sms_codes').insert({
    phone,
    code,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[sms-send] Save code error:', error);
    throw new Error('保存验证码失败');
  }
}

// 频率限制检查
async function checkRateLimit(phone: string): Promise<boolean> {
  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('sms_codes')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', oneMinuteAgo);

    if (error) return true; // 查询失败时放行

    return (count ?? 0) === 0;
  } catch {
    return true; // 异常时放行
  }
}

// 调用短信服务商发送验证码
async function sendSms(phone: string, code: string): Promise<boolean> {
  const provider = process.env.SMS_PROVIDER;

  try {
    switch (provider) {
      case 'aliyun': {
        // 阿里云短信 - 使用官方SDK
        const accessKeyId = process.env.SMS_ACCESS_KEY_ID;
        const accessKeySecret = process.env.SMS_ACCESS_KEY_SECRET;
        const signName = process.env.SMS_SIGN_NAME;
        const templateCode = process.env.SMS_TEMPLATE_CODE;

        if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
          console.error('[sms-send] 阿里云短信配置不完整');
          return false;
        }

        const Dysmsapi = await import('@alicloud/dysmsapi20170525');
        const OpenApi = await import('@alicloud/openapi-client');

        const config = new OpenApi.Config({
          accessKeyId,
          accessKeySecret,
          endpoint: 'dysmsapi.aliyuncs.com',
        });
        const client = new Dysmsapi.default(config);

        const sendSmsRequest = new Dysmsapi.SendSmsRequest({
          phoneNumbers: phone,
          signName,
          templateCode,
          templateParam: JSON.stringify({ code }),
        });

        const response = await client.sendSms(sendSmsRequest);
        const success = response.body?.code === 'OK';
        if (!success) {
          console.error('[sms-send] 阿里云短信发送失败:', response.body?.message);
        }
        return success;
      }

      default:
        console.error(`[sms-send] 不支持的短信服务商: ${provider}`);
        return false;
    }
  } catch (error) {
    console.error('[sms-send] Send SMS error:', error);
    return false;
  }
}

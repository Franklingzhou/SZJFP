import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';

// GET /api/orders/[id]/wechat-text — 生成微信群分享文本（经纪人自动替换联系人）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePermission(request, 'orders:read');

  if (session instanceof NextResponse) return session;

  const { id: orderId } = await params;

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('title, job_type, salary_min, salary_max, salary_type, location, description, work_duration, contact_name, contact_phone, agent_id')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: '未找到该订单' }, { status: 404 });
    }

    // 确定联系人信息：agent用自己的，admin查原订单agent的用户信息
    let contactName = order.contact_name || '';
    let contactPhone = order.contact_phone || '';

    if (session.role === 'agent') {
      const { data: agent } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', session.userId)
        .maybeSingle();

      if (agent) {
        contactName = agent.name || contactName;
        contactPhone = agent.phone || contactPhone;
      }
    } else if (session.role === 'admin' && order.agent_id) {
      // admin查看时，显示原订单经纪人信息
      const { data: orderAgent } = await supabase
        .from('users')
        .select('name, phone')
        .eq('id', order.agent_id)
        .maybeSingle();

      if (orderAgent) {
        contactName = orderAgent.name || contactName;
        contactPhone = orderAgent.phone || contactPhone;
      }
    }

    // 格式化薪资
    const salaryStr = order.salary_min && order.salary_max
      ? `${order.salary_min}-${order.salary_max}${order.salary_type === 'monthly' ? '元/月' : order.salary_type === 'daily' ? '元/天' : '元'}`
      : '面议';

    // 生成微信群分享文本
    const lines: string[] = [];
    lines.push('📋 家政订单推荐');
    lines.push('━━━━━━━━━━━━━');
    lines.push(`📌 ${order.title}`);
    if (order.job_type) lines.push(`🔧 工种：${order.job_type}`);
    lines.push(`💰 薪资：${salaryStr}`);
    if (order.work_duration) lines.push(`⏱ 工期：${order.work_duration}`);
    if (order.location) lines.push(`📍 地点：${order.location}`);
    if (order.description) lines.push(`📝 详情：${order.description}`);
    lines.push('━━━━━━━━━━━━━');
    if (contactName || contactPhone) {
      lines.push(`📞 联系人：${contactName}${contactPhone ? ' ' + contactPhone : ''}`);
    }
    lines.push('有意者请联系，谢谢转发！');

    const text = lines.join('\n');

    return NextResponse.json({ text, order_id: orderId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '生成失败';
    console.error('[orders wechat-text] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

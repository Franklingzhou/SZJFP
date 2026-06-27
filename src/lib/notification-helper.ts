import { getSupabaseClient } from '@/storage/database/supabase-client';

// 通知类型
export type NotificationType = 
  | 'system'       // 系统通知
  | 'order'        // 订单相关
  | 'course'       // 课程相关
  | 'review'       // 审核相关
  | 'resume_review'// 简历审核
  | 'contract'     // 合同相关
  | 'worker'       // 阿姨相关
  | 'referral'     // 推荐相关
  | 'interview'    // 面试相关
  | 'tier'         // 等级相关
  | 'payment'      // 支付相关
  | 'commission';  // 佣金相关

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: string;
  relatedType?: string;
}

// 发送单条通知
export async function sendNotification(params: SendNotificationParams): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: params.userId,
      type: params.type,
      title: params.title,
      content: params.content,
      related_id: params.relatedId || null,
      related_type: params.relatedType || null,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.error('[sendNotification] Error:', err);
    return false;
  }
}

// 给多个用户发送同一条通知
export async function sendBatchNotification(
  params: Omit<SendNotificationParams, 'userId'> & { userIds: string[] }
): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const rows = params.userIds.map(userId => ({
      id: crypto.randomUUID(),
      user_id: userId,
      type: params.type,
      title: params.title,
      content: params.content,
      related_id: params.relatedId || null,
      related_type: params.relatedType || null,
      is_read: false,
      created_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('notifications').insert(rows);
    return error ? 0 : rows.length;
  } catch (err) {
    console.error('[sendBatchNotification] Error:', err);
    return 0;
  }
}

// 给所有管理员发送通知
export async function sendAdminNotification(
  params: Omit<SendNotificationParams, 'userId'>
): Promise<number> {
  try {
    const supabase = getSupabaseClient();
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);

    if (!admins?.length) return 0;

    return await sendBatchNotification({
      ...params,
      userIds: admins.map(a => a.id),
    });
  } catch (err) {
    console.error('[sendAdminNotification] Error:', err);
    return 0;
  }
}

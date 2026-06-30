/**
 * 通知触发工具 — 在各业务操作成功后发送通知
 */
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * 发送站内通知（fire-and-forget，不阻塞主流程）
 */
export async function sendNotification(params: {
  user_id: string;
  title: string;
  content: string;
  type?: string;
}) {
  const supabase = getSupabaseClient();
  try {
    await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: params.user_id,
      title: params.title,
      content: params.content,
      type: params.type || 'system',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch {
    // fire-and-forget：通知失败不影响主流程
  }
}

/**
 * 通过 worker_id 查 user_id
 */
export async function getWorkerUserId(workerId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  try {
    const { data } = await supabase
      .from('workers')
      .select('user_id')
      .eq('id', workerId)
      .maybeSingle();
    return (data as Record<string, unknown> | null)?.user_id as string || null;
  } catch {
    return null;
  }
}

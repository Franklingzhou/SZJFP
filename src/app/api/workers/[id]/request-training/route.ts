import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/workers/[id]/request-training — 阿姨发起再培训申请（2.0 新增）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'workers:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { message } = body as { message?: string };

    const supabase = getSupabaseClient();

    // 1. 查worker
    const { data: worker, error: workerErr } = await supabase
      .from('workers')
      .select('id, name, phone, lead_id, status')
      .eq('id', id)
      .single();

    if (workerErr || !worker) {
      return NextResponse.json({ error: '阿姨记录不存在' }, { status: 404 });
    }

    const followupContent = message || '阿姨申请再培训';

    if (worker.lead_id) {
      // 2. 有lead_id → 更新线索状态为following + 新增跟进记录
      await supabase
        .from('leads')
        .update({
          status: 'following',
          updated_at: new Date().toISOString(),
        })
        .eq('id', worker.lead_id);

      // 插入跟进记录
      await supabase
        .from('lead_follow_ups')
        .insert({
          lead_id: worker.lead_id,
          follow_up_by: session.userId,
          content: followupContent,
          result: 'retraining_request',
          created_at: new Date().toISOString(),
        });
    } else {
      // 3. 无lead_id → 创建新线索 + 跟进记录 + 回写workers.lead_id
      const leadId = crypto.randomUUID();

      const { error: leadErr } = await supabase
        .from('leads')
        .insert({
          id: leadId,
          name: worker.name,
          phone: worker.phone || '',
          status: 'following',
          source: 'retraining_request',
          source_type: 'worker_self',
          recruiter_id: session.userId,
          created_by: session.userId,
          remark: `阿姨${worker.name}自主申请再培训`,
        });

      if (leadErr) {
        return NextResponse.json({ error: '创建线索失败', detail: leadErr.message }, { status: 500 });
      }

      // 插入跟进记录
      await supabase
        .from('lead_follow_ups')
        .insert({
          lead_id: leadId,
          follow_up_by: session.userId,
          content: followupContent,
          result: 'retraining_request',
          created_at: new Date().toISOString(),
        });

      // 回写workers.lead_id
      await supabase
        .from('workers')
        .update({
          lead_id: leadId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    }

    return NextResponse.json({
      success: true,
      message: '再培训申请已提交，招生将跟进处理',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '服务器错误';
    console.error('[workers/[id]/request-training] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

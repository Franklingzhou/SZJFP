import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// POST /api/resume-reviews/[id]/approve — 简历审核通过（实际更新 workers 表）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkPermission(request, 'resume-reviews:write');
  if (!session) return unauthorizedResponse();

  try {
    const { id } = await params;
    const body = await request.json();
    const { comment } = body as { comment?: string };

    const supabase = getSupabaseClient();

    // 获取审核记录详情（先尝试新字段，失败则回退旧字段）
    let reviewRecord: Record<string, unknown> | null = null;
    let fetchError = null;

    const r1 = await supabase
      .from('resume_reviews')
      .select('id, worker_id, type, review_type, old_data, changes, new_data, status')
      .eq('id', id)
      .single();

    if (!r1.error) {
      reviewRecord = r1.data as Record<string, unknown> | null;
    } else if (r1.error.message?.includes('column') || r1.error.code === 'PGRST204') {
      // 回退到旧字段
      const r2 = await supabase
        .from('resume_reviews')
        .select('id, worker_id, status, notes')
        .eq('id', id)
        .single();
      fetchError = r2.error;
      if (r2.data) {
        reviewRecord = { ...r2.data, type: 'update', review_type: 'update_resume' };
      }
    } else {
      fetchError = r1.error;
    }

    if (fetchError || !reviewRecord) {
      return NextResponse.json({ ok: false, error: '审核记录不存在' }, { status: 404 });
    }

    if (reviewRecord.status !== 'pending') {
      return NextResponse.json({ ok: false, error: '该审核记录已处理' }, { status: 400 });
    }

    // 构建更新数据（仅使用实际存在的列 reviewer_id）
    const updatePayload: Record<string, unknown> = {
      status: 'approved',
      reviewer_id: session.userId,
      review_note: comment || null,
      notes: comment || null,
      reviewed_at: new Date().toISOString(),
    };
    if (comment) updatePayload.review_comment = comment;

    let { data, error } = await supabase
      .from('resume_reviews')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    // 如果某些列不存在，逐列清理后重试（最多3次）
    let retryCount = 0;
    while (error && retryCount < 3 && (error.message?.includes('column') || error.code === 'PGRST204')) {
      retryCount++;
      const msg = error.message || '';
      // 按优先级：先尝试删 notes（历史遗留列），再删 review_comment（第三轮新增列）
      if (msg.includes('notes') || msg.includes('"notes"')) {
        delete updatePayload.notes;
      } else if (msg.includes('review_comment') || msg.includes('"review_comment"')) {
        delete updatePayload.review_comment;
      } else if (msg.includes('review_note') || msg.includes('"review_note"')) {
        delete updatePayload.review_note;
      } else {
        // 未知列错误，跳出循环
        break;
      }
      const retry = await supabase
        .from('resume_reviews')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 根据 type 更新 workers 表
    const workerId = reviewRecord.worker_id as string;
    const reviewType = (reviewRecord.type as string) || 'update';

    if (reviewType === 'pause') {
      // 暂停接单 → 更新 status
      const { error: wErr } = await supabase
        .from('workers')
        .update({ status: 'paused', updated_at: new Date().toISOString(), resume_review_status: 'approved' })
        .eq('id', workerId);
      if (wErr) console.error('[resume-reviews approve] pause worker error:', wErr);
    } else if (reviewType === 'resume') {
      // 恢复接单 → 更新 status
      const { error: wErr } = await supabase
        .from('workers')
        .update({ status: 'available', updated_at: new Date().toISOString(), resume_review_status: 'approved' })
        .eq('id', workerId);
      if (wErr) console.error('[resume-reviews approve] resume worker error:', wErr);
    } else {
      // 2.0: create / update → 应用 proposed_data 到 workers，并设置 status=available
      const workerUpdateData: Record<string, unknown> = {
        resume_review_status: 'approved',
        status: 'available',
        updated_at: new Date().toISOString(),
      };

      // new_data 包含待应用的变更数据（JSON字符串格式）
      if ((reviewRecord as Record<string, unknown>).new_data) {
        try {
          const newData = JSON.parse((reviewRecord as Record<string, unknown>).new_data as string);
          const allowedFields = [
            'name', 'phone', 'age', 'origin', 'job_types', 'experience_years',
            'specialties', 'certifications', 'expected_salary_min', 'expected_salary_max',
            'available_date', 'remark'
          ];
          for (const field of allowedFields) {
            if (newData[field] !== undefined) {
              workerUpdateData[field] = newData[field];
            }
          }
        } catch (e) {
          console.error('[resume-reviews approve] parse new_data error:', e);
        }
      }

      const { error: workerUpdateError } = await supabase
        .from('workers')
        .update(workerUpdateData)
        .eq('id', workerId);

      if (workerUpdateError) {
        console.error('[resume-reviews approve] update worker error:', workerUpdateError);
      }
    }

    return NextResponse.json({ success: true, ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

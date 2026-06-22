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

    // 获取审核记录详情
    const { data: reviewRecord, error: fetchError } = await supabase
      .from('resume_reviews')
      .select('id, worker_id, type, review_type, proposed_data, original_data, changed_fields, new_data, status')
      .eq('id', id)
      .single();

    if (fetchError || !reviewRecord) {
      return NextResponse.json({ ok: false, error: '审核记录不存在' }, { status: 404 });
    }

    if ((reviewRecord as Record<string, unknown>).status !== 'pending') {
      return NextResponse.json({ ok: false, error: '该审核记录已处理' }, { status: 400 });
    }

    // v13: try with review_comment first, fallback if column missing
    const updatePayload: Record<string, unknown> = {
      status: 'approved',
      reviewer_id: session.userId,
      review_note: comment || null,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    };
    if (comment) updatePayload.review_comment = comment;

    let { data, error } = await supabase
      .from('resume_reviews')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error && error.message?.includes('review_comment')) {
      delete updatePayload.review_comment;
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
    const workerId = (reviewRecord as Record<string, unknown>).worker_id as string;
    const reviewType = (reviewRecord as Record<string, unknown>).type as string;

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
      // create / update → 应用 proposed_data 到 workers
      const workerUpdateData: Record<string, unknown> = {
        resume_review_status: 'approved',
        updated_at: new Date().toISOString(),
      };

      const proposedData = (reviewRecord as Record<string, unknown>).proposed_data as Record<string, unknown> | null;

      if (proposedData) {
        const allowedFields = [
          'name', 'phone', 'age', 'gender', 'origin', 'job_types', 'experience_years',
          'specialties', 'certifications', 'expected_salary_min', 'expected_salary_max',
          'available_date', 'remark', 'id_card', 'status', 'credit_score', 'deposit', 'points',
          'creator_id', 'creator_role', 'photo',
        ];
        for (const field of allowedFields) {
          if (proposedData[field] !== undefined) {
            workerUpdateData[field] = proposedData[field];
          }
        }
      } else if ((reviewRecord as Record<string, unknown>).new_data) {
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

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '审核失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/workers/export — 数据导出（仅管理员）
// 支持导出格式：?format=csv|json（默认 json）
// 支持筛选：?status=xxx&job_type=xxx&resume_review_status=xxx
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'workers:export');

  if (session instanceof NextResponse) return session;

  try {
    const supabase = getSupabaseClient();
    const format = request.nextUrl.searchParams.get('format') || 'json';
    const status = request.nextUrl.searchParams.get('status');
    const jobType = request.nextUrl.searchParams.get('job_type');
    const resumeReviewStatus = request.nextUrl.searchParams.get('resume_review_status');
    const workStatus = request.nextUrl.searchParams.get('work_status');

    let query = supabase
      .from('workers')
      .select('id, user_id, name, phone, age, gender, origin, job_types, experience_years, specialties, certifications, expected_salary_min, expected_salary_max, status, work_status, resume_review_status, available_date, creator_id, creator_role, credit_score, deposit, points, photo, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (jobType) query = query.ilike('job_types', `%${jobType}%`);
    if (resumeReviewStatus) query = query.eq('resume_review_status', resumeReviewStatus);
    if (workStatus) query = query.eq('work_status', workStatus);

    const { data, error } = await query;

    if (error) {
      console.error('[workers/export] DB error:', error);
      return NextResponse.json({ ok: false, error: '查询失败' }, { status: 500 });
    }

    const rows = data || [];

    if (format === 'csv') {
      // 生成 CSV
      const headers = [
        'id', 'user_id', 'name', 'phone', 'age', 'gender', 'origin',
        'job_types', 'experience_years', 'specialties', 'certifications',
        'expected_salary_min', 'expected_salary_max', 'status', 'work_status',
        'resume_review_status', 'available_date', 'creator_id', 'creator_role',
        'credit_score', 'deposit', 'points', 'photo', 'created_at', 'updated_at',
      ];

      const csvRows = [headers.join(',')];
      for (const row of rows) {
        const rec = row as Record<string, unknown>;
        const values = headers.map(h => {
          const v = rec[h];
          if (v === null || v === undefined) return '';
          const s = String(v);
          // 转义含逗号或引号的字段
          if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="workers_export_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // 默认 JSON
    return NextResponse.json({
      ok: true,
      count: rows.length,
      exported_at: new Date().toISOString(),
      data: rows,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '导出失败';
    console.error('[workers/export] Error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

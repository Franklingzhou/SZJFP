import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/training — 培训管理独立模块（总览仪表盘）
 *
 * 返回培训全貌统计数据：
 * - 课程：总数 + 按状态分组
 * - 报名：总数 + 按状态分组
 * - 排课：总数 + 按状态分组
 * - 证书：总数
 * - 培训合同：按状态分组
 * - 场地：总数
 *
 * 权限：training:read（admin, training_supervisor, instructor, recruiter）
 */
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'training:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }
  const session = result.session;

  try {
    const supabase = getSupabaseClient();

    // 并行查询所有培训相关统计
    const [
      coursesRes,
      enrollmentsRes,
      schedulesRes,
      certificatesRes,
      contractsRes,
      venuesRes,
    ] = await Promise.all([
      supabase.from('courses').select('status'),
      supabase.from('enrollments').select('status'),
      supabase.from('course_schedules').select('status'),
      supabase.from('certificates').select('id'),
      supabase.from('training_contracts').select('status'),
      supabase.from('venues').select('id'),
    ]);

    // 辅助函数：按 status 分组计数
    const groupByStatus = (rows: { status: string }[] | null) => {
      const map: Record<string, number> = {};
      (rows || []).forEach(r => {
        const s = r.status || 'unknown';
        map[s] = (map[s] || 0) + 1;
      });
      return map;
    };

    const stats = {
      courses: {
        total: coursesRes.data?.length || 0,
        by_status: groupByStatus(coursesRes.data as { status: string }[]),
      },
      enrollments: {
        total: enrollmentsRes.data?.length || 0,
        by_status: groupByStatus(enrollmentsRes.data as { status: string }[]),
      },
      schedules: {
        total: schedulesRes.data?.length || 0,
        by_status: groupByStatus(schedulesRes.data as { status: string }[]),
      },
      certificates: {
        total: certificatesRes.data?.length || 0,
      },
      contracts: {
        total: contractsRes.data?.length || 0,
        by_status: groupByStatus(contractsRes.data as { status: string }[]),
      },
      venues: {
        total: venuesRes.data?.length || 0,
      },
    };

    return NextResponse.json({ ok: true, data: stats });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/**
 * GET /api/timetables — 课表管理（周视图/月视图/日视图）
 *
 * 从 course_schedules 表聚合生成课表视图。
 *
 * 查询参数：
 * - view: week | month | day（默认 week）
 * - date: 参考日期 YYYY-MM-DD（默认今天）
 * - instructor_id: 按讲师筛选
 * - course_id: 按课程筛选
 * - location: 按场地筛选
 *
 * 返回结构（week 视图）：
 * {
 *   view: "week",
 *   date_range: { from, to },
 *   days: [
 *     { date, weekday, schedules: [...] },
 *     ...
 *   ]
 * }
 *
 * 权限：timetables:read（admin, instructor, training_supervisor, recruiter, worker）
 */
export async function GET(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'timetables:read');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('无操作权限');
  }

  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'week';
    const refDateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const instructorId = searchParams.get('instructor_id');
    const courseId = searchParams.get('course_id');
    const location = searchParams.get('location');

    // 计算日期范围
    const refDate = new Date(refDateStr);
    if (isNaN(refDate.getTime())) {
      return NextResponse.json({ ok: false, error: '无效的日期格式，请使用 YYYY-MM-DD' }, { status: 400 });
    }

    let dateFrom: string;
    let dateTo: string;
    const dayMs = 24 * 60 * 60 * 1000;

    switch (view) {
      case 'day': {
        dateFrom = refDateStr;
        dateTo = refDateStr;
        break;
      }
      case 'month': {
        const firstDay = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
        const lastDay = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
        dateFrom = firstDay.toISOString().split('T')[0];
        dateTo = lastDay.toISOString().split('T')[0];
        break;
      }
      case 'week':
      default: {
        // 周一为起始
        const dayOfWeek = refDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(refDate.getTime() + mondayOffset * dayMs);
        const sunday = new Date(monday.getTime() + 6 * dayMs);
        dateFrom = monday.toISOString().split('T')[0];
        dateTo = sunday.toISOString().split('T')[0];
        break;
      }
    }

    const supabase = getSupabaseClient();

    // 查询日期范围内的所有排课
    let query = supabase
      .from('course_schedules')
      .select('*')
      .gte('date', dateFrom)
      .lte('date', dateTo);

    if (instructorId) query = query.eq('instructor_id', instructorId);
    if (courseId) query = query.eq('course_id', courseId);
    if (location) query = query.eq('location', location);

    const { data: schedules, error } = await query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 按日期分组
    const dayMap = new Map<string, Array<Record<string, unknown>>>();

    // 初始化日期范围内的每一天
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    for (let d = new Date(fromDate); d <= toDate; d = new Date(d.getTime() + dayMs)) {
      const dateKey = d.toISOString().split('T')[0];
      dayMap.set(dateKey, []);
    }

    // 填充排课数据
    (schedules || []).forEach(s => {
      const dateKey = (s as Record<string, unknown>).date as string;
      if (dateKey && dayMap.has(dateKey)) {
        dayMap.get(dateKey)!.push(s as Record<string, unknown>);
      }
    });

    // 构建输出
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const days = Array.from(dayMap.entries()).map(([date, items]) => {
      const d = new Date(date);
      return {
        date,
        weekday: weekdays[d.getDay()],
        schedules: items,
        count: items.length,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        view,
        date_range: { from: dateFrom, to: dateTo },
        total_schedules: (schedules || []).length,
        days,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

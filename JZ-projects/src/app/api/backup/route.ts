import { NextRequest, NextResponse } from 'next/server';
import { requireRole, forbiddenResponse } from '@/lib/auth-middleware';

// 数据库备份API
// 仅管理员可调用，备份所有业务数据为JSON格式
export async function POST(request: NextRequest) {
  // 权限校验：仅管理员
  const session = await requireRole(request, ['admin']);
  if (!session) return forbiddenResponse();

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    const backup: Record<string, unknown[]> = {};
    const tables = [
      'users', 'workers', 'leads', 'courses', 'orders',
      'reviews', 'contracts', 'commission_rules', 'enrollments',
      'system_settings', 'sms_codes',
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`[backup] Error backing up ${table}:`, error);
        backup[table] = [];
      } else {
        backup[table] = data || [];
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '备份失败';
    console.error('[backup] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

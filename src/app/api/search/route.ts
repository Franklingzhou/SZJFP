import { NextRequest, NextResponse } from 'next/server';
import { checkPermission, unauthorizedResponse } from '@/lib/auth-middleware';

// GET /api/search?q=xxx&table=orders,workers,leads&limit=20
export async function GET(request: NextRequest) {
  const session = await checkPermission(request, 'orders:read');
  if (!session) return unauthorizedResponse();

  const q = request.nextUrl.searchParams.get('q')?.trim();
  const tablesParam = request.nextUrl.searchParams.get('table') || 'orders';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20'), 50);

  if (!q || q.length < 1) {
    return NextResponse.json({ ok: false, error: '缺少搜索关键词' }, { status: 400 });
  }
  // 自动截断过长关键词，避免DB查询报错
  const safeQuery = q.length > 200 ? q.substring(0, 200) : q;

  const { getSupabaseClient } = await import('@/storage/database/supabase-client');
  const supabase = getSupabaseClient();

  const tables = tablesParam.split(',').map(t => t.trim()).filter(Boolean);
  const allowedTables = ['orders', 'workers', 'leads', 'customers', 'courses', 'contracts'];
  const results: Record<string, unknown[]> = {};

  for (const table of tables) {
    if (!allowedTables.includes(table)) continue;

    const searchFields: Record<string, string[]> = {
      orders: ['title', 'job_type', 'status'],
      workers: ['name', 'phone', 'job_type'],
      leads: ['name', 'phone', 'intention'],
      customers: ['name', 'phone'],
      courses: ['title', 'category'],
      contracts: ['title', 'status'],
    };

    const fields = searchFields[table] || ['name'];
    let query = supabase.from(table).select('*').limit(limit);

    // 对每个字段 OR 匹配（使用已截断的 safeQuery）
    const filter = fields.map(f => `${f}.ilike.%${safeQuery}%`).join(',');
    query = query.or(filter);

    const { data, error } = await query;
    if (!error && data) {
      results[table] = data;
    }
  }

  const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
  return NextResponse.json({ ok: true, data: results, q, total });
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/certificates — 获取所有证书列表（从 workers.certifications 字段聚合）
export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'workers:read');
  if (session instanceof NextResponse) return session;

  try {
    const supabase = getSupabaseClient();

    const { data: workers, error } = await supabase
      .from('workers')
      .select('id, name, certifications');

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // 从 workers 中提取证书列表
    const certificates: Array<{
      worker_id: string;
      worker_name: string;
      certificate: string;
    }> = [];

    for (const w of workers || []) {
      const certs = w.certifications;
      if (Array.isArray(certs)) {
        for (const c of certs) {
          certificates.push({
            worker_id: w.id,
            worker_name: w.name,
            certificate: typeof c === 'string' ? c : JSON.stringify(c),
          });
        }
      } else if (typeof certs === 'string' && certs) {
        for (const c of certs.split(',').map((s: string) => s.trim()).filter(Boolean)) {
          certificates.push({
            worker_id: w.id,
            worker_name: w.name,
            certificate: c,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, data: certificates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '获取证书列表失败';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

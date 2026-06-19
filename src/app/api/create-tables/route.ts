import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST() {
  if (process.env.COZE_PROJECT_ENV === 'PROD') {
    return NextResponse.json({ error: '生产环境禁止执行建表操作' }, { status: 403 });
  }

  try {
    const supabase = getSupabaseClient();

    const sqlPath = join(process.cwd(), 'src', 'storage', 'database', 'shared', 'create_all_tables.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results = [];

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('execute_sql', { sql: statement });
        if (error) {
          throw error;
        }
        results.push({ statement: statement.substring(0, 50) + '...', success: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('already exists') && !message.includes('duplicate')) {
          results.push({ statement: statement.substring(0, 50) + '...', success: false, error: message });
        } else {
          results.push({ statement: statement.substring(0, 50) + '...', success: true, note: '已存在，跳过' });
        }
      }
    }

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      return NextResponse.json({ success: false, results, message: `建表完成，但有 ${failed.length} 条语句失败` }, { status: 200 });
    }

    return NextResponse.json({ success: true, results, message: '全部26张表创建成功！' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '建表失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '使用 POST /api/create-tables 执行建表',
    tables: 26,
    description: '创建家政共创平台全部26张数据库表',
  });
}
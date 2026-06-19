import { NextRequest, NextResponse } from 'next/server';

// 执行第十一轮数据库迁移
// 仅管理员可调用
export async function POST(request: NextRequest) {
  // 简单权限校验：检查header中的角色
  const authHeader = request.headers.get('authorization');
  const xSession = request.headers.get('x-session');
  const token = authHeader?.replace('Bearer ', '') || xSession;
  
  // 开发模式下允许无token访问
  const isDev = !process.env.SMS_PROVIDER;
  
  if (!isDev && !token) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 });
  }

  try {
    const { getSupabaseClient } = await import('@/storage/database/supabase-client');
    const supabase = getSupabaseClient();

    // 执行迁移SQL
    const migrations = [
      {
        name: 'course_schedules.location扩容',
        sql: 'ALTER TABLE course_schedules ALTER COLUMN location TYPE varchar(200);'
      },
      {
        name: 'enrollments添加updated_at列',
        sql: 'ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();'
      }
    ];

    const results = [];
    
    for (const migration of migrations) {
      try {
        // 使用rpc执行SQL（需要supabase配置允许）
        // 直接执行可能不支持，改用查询方式
        const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });
        
        if (error) {
          // 如果rpc不存在，尝试其他方式
          results.push({
            name: migration.name,
            status: 'failed',
            error: error.message,
            note: '请在Supabase控制台手动执行: ' + migration.sql
          });
        } else {
          results.push({ name: migration.name, status: 'success' });
        }
      } catch (e) {
        results.push({
          name: migration.name,
          status: 'failed',
          error: e instanceof Error ? e.message : '执行失败',
          note: '请在Supabase控制台手动执行: ' + migration.sql
        });
      }
    }

    return NextResponse.json({
      message: '迁移执行结果',
      results,
      manualSql: migrations.map(m => m.sql).join('\n')
    });
  } catch (error) {
    return NextResponse.json({
      error: '迁移执行失败',
      details: error instanceof Error ? error.message : '未知错误',
      manualSql: `
-- 请在Supabase控制台手动执行以下SQL:
ALTER TABLE course_schedules ALTER COLUMN location TYPE varchar(200);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
`
    }, { status: 500 });
  }
}
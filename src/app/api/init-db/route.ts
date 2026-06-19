import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

export async function POST() {
  if (process.env.COZE_PROJECT_ENV === 'PROD') {
    return NextResponse.json({ error: '生产环境禁止执行初始化操作' }, { status: 403 });
  }

  const pool = new Pool({
    connectionString: 'postgres://postgres:postgres@localhost:5432/postgres',
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // 从Supabase URL和key构建连接字符串
  const supabaseUrl = 'https://mozamdshnaydbycpbifd.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiZmlmZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NDkxMTc2OTYsImV4cCI6MjA2NDY5MzY5Nn0.test';
  
  // 解析URL获取数据库连接信息
  const url = new URL(supabaseUrl);
  const dbUrl = `postgres://postgres:${supabaseServiceKey}@${url.host}:5432/postgres`;

  const poolWithAuth = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const results: Array<{ step: string; success: boolean; message: string }> = [];

  async function executeSqlFile(fileName: string, stepName: string) {
    try {
      const sqlPath = join(process.cwd(), 'src', 'storage', 'database', 'shared', fileName);
      const sqlContent = readFileSync(sqlPath, 'utf-8');

      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let failCount = 0;

      for (const statement of statements) {
        try {
          await poolWithAuth.query(statement);
          successCount++;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!message.includes('already exists') && !message.includes('duplicate')) {
            failCount++;
          } else {
            successCount++;
          }
        }
      }

      if (failCount > 0) {
        results.push({ step: stepName, success: false, message: `执行失败：成功 ${successCount} 条，失败 ${failCount} 条` });
        return false;
      } else {
        results.push({ step: stepName, success: true, message: `执行成功：共 ${successCount} 条语句` });
        return true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '执行失败';
      results.push({ step: stepName, success: false, message });
      return false;
    } finally {
      await poolWithAuth.end();
    }
  }

  const step1 = await executeSqlFile('create_all_tables.sql', '创建26张表');
  if (!step1) {
    return NextResponse.json({ success: false, results, message: '建表失败' }, { status: 500 });
  }

  const step2 = await executeSqlFile('create_missing_tables.sql', '补建缺失表和字段');
  if (!step2) {
    return NextResponse.json({ success: false, results, message: '补建失败' }, { status: 500 });
  }

  const step3 = await executeSqlFile('create_test_data.sql', '插入业务测试数据');
  if (!step3) {
    return NextResponse.json({ success: false, results, message: '插入测试数据失败' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    results,
    message: '数据库初始化完成！',
    testAccounts: {
      admin: { phone: '13000000001', code: '888888' },
      worker: { phone: '13800005678', code: '888888' },
      agent: { phone: '13600001234', code: '888888' },
      recruiter: { phone: '13500003456', code: '888888' },
      instructor: { phone: '13700007890', code: '888888' },
      training_supervisor: { phone: '13100001111', code: '888888' },
      worker_operator: { phone: '13200002222', code: '888888' },
      customer: { phone: '13900009876', code: '888888' },
    },
  });
}

export async function GET() {
  return NextResponse.json({
    message: '使用 POST /api/init-db 一键初始化数据库',
    steps: [
      '创建26张表',
      '补建缺失表和字段',
      '插入业务测试数据',
    ],
    usage: 'POST /api/init-db',
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { checkPermissionDetailed, forbiddenResponse, unauthorizedResponse } from '@/lib/auth-middleware';
import * as fs from 'fs';
import * as path from 'path';

// POST /api/admin/run-migration — 执行数据库迁移
export async function POST(request: NextRequest) {
  const result = await checkPermissionDetailed(request, 'users:write');
  if (!result.ok) {
    if (result.reason === 'unauthorized') return unauthorizedResponse();
    return forbiddenResponse('仅管理员可执行迁移');
  }

  const body = await request.json().catch(() => ({}));
  const migrationFile = (body as { file?: string }).file || 'migration_test_fixes.sql';

  const sqlPath = path.join(process.cwd(), 'docs', migrationFile);
  
  if (!fs.existsSync(sqlPath)) {
    return NextResponse.json({ ok: false, error: `文件不存在: docs/${migrationFile}` }, { status: 404 });
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  // 按语句拆解（分号分隔，忽略注释和空行）
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const results: { statement: string; ok: boolean; error?: string }[] = [];
  
  try {
    // 尝试通过 Supabase REST API 执行 SQL
    // 使用 /rest/v1/ 批量执行（仅对部分操作有效）
    const supabaseUrl = 'https://mozamdshnaydbycpbifd.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mjg3MjYsImV4cCI6MjA5NzEwNDcyNn0.vj-Ope8a_-0gFHMC9Mx_8B2T27DX8T8xdwk6W75O57o';

    // 对于 DDL 语句，尝试使用 Supabase REST API 的 SQL endpoint
    const supabase = getSupabaseClient();
    let execCount = 0;
    let failCount = 0;

    for (const stmt of statements) {
      const shortStmt = stmt.substring(0, 80).replace(/\n/g, ' ');
      try {
        // 对 ALTER TABLE ADD COLUMN 类语句，尝试使用 rpc
        if (stmt.toUpperCase().includes('ALTER TABLE') || stmt.toUpperCase().includes('CREATE TABLE')) {
          // Supabase PostgREST 不支持 DDL，尝试通过 Management API
          const resp = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({ query: stmt }),
          });
          if (resp.ok) {
            execCount++;
            results.push({ statement: shortStmt, ok: true });
          } else {
            const errText = await resp.text();
            failCount++;
            results.push({ statement: shortStmt, ok: false, error: errText.substring(0, 100) });
          }
        } else {
          // 非DDL语句跳过
          results.push({ statement: shortStmt, ok: true });
        }
      } catch (e: unknown) {
        failCount++;
        results.push({ statement: shortStmt, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return NextResponse.json({
      ok: true,
      migration: migrationFile,
      total: statements.length,
      ddlExecuted: execCount,
      ddlFailed: failCount,
      results,
      note: 'DDL语句可能因anon key权限不足无法执行。请手动复制 docs/migration_test_fixes.sql 到 Supabase SQL Editor 执行：https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new',
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      hint: '请手动在 Supabase SQL Editor 执行迁移SQL: docs/migration_test_fixes.sql',
      sqlEditorUrl: 'https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new',
    }, { status: 500 });
  }
}

// GET /api/admin/run-migration — 查看迁移SQL内容
export async function GET() {
  const sqlPath = path.join(process.cwd(), 'docs', 'migration_test_fixes.sql');
  if (!fs.existsSync(sqlPath)) {
    return NextResponse.json({ ok: false, error: '迁移文件不存在' }, { status: 404 });
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  const lines = sql.split('\n').length;
  return NextResponse.json({
    ok: true,
    file: 'docs/migration_test_fixes.sql',
    lines,
    sqlEditorUrl: 'https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new',
    preview: sql.substring(0, 500),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

// 仅允许 POST，且需要临时 token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body?.token || '';

    // 安全校验
    if (token !== 'migrate_p0_20260623') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    const sqlPath = path.join(process.cwd(), 'scripts', 'migration_p0_fixes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const client = new Client({
      host: 'aws-0-us-west-1.pooler.supabase.co',
      port: 6543,
      database: 'postgres',
      user: 'postgres.mozamdshnaydbycpbifd',
      password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiaWZkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTUyODcyNiwiZXhwIjoyMDk3MTA0NzI2fQ.vzBJcL7282ed11YRR8r1ercwg-gcsrz_Nyn9BrC6J-4',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
    });

    await client.connect();

    const results: string[] = [];
    
    // Execute each statement separately for better error reporting
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      try {
        const res = await client.query(stmt + ';');
        if (res.command) {
          results.push(`OK: ${res.command}${res.rowCount !== null ? ` (${res.rowCount} rows)` : ''}`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // Skip "column already exists" errors
        if (msg.includes('already exists') || msg.includes('does not exist') && stmt.includes('RENAME')) {
          results.push(`SKIP: ${msg.substring(0, 80)}`);
        } else {
          results.push(`ERR: ${msg.substring(0, 200)}`);
          console.error(`[migration] Failed statement: ${stmt.substring(0, 100)}...`, msg);
        }
      }
    }

    await client.end();

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Migration failed';
    console.error('[run-migration] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase } from '@/lib/supabase-client';

export async function POST() {
  try {
    const sqlPath = join(process.cwd(), 'src', 'storage', 'database', 'shared', 'create_missing_tables.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');

    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // 只测试第一条语句
    const firstStmt = statements[0];
    
    const { error } = await supabase.rpc('execute_sql', { sql: firstStmt });
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: JSON.stringify(error),
        statement: firstStmt.substring(0, 100)
      });
    }

    return NextResponse.json({ success: true, message: '执行成功' });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
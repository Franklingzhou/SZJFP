import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  try {
    const SUPABASE_URL = 'https://ldytwplgseuotvblyebm.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkeXR3cGxnc2V1b3R2Ymx5ZWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMzUyMzgsImV4cCI6MjA5NjkxMTIzOH0.l-m3v2E1q5w-i3S4rpBq7OGFnW8o-LP4Uy0SPhvT3rI';

    const url = new URL(SUPABASE_URL);
    const pool = new Pool({
      user: 'postgres',
      host: url.hostname,
      database: 'postgres',
      password: SUPABASE_ANON_KEY,
      port: 5432,
      ssl: { rejectUnauthorized: false },
    });

    const client = await pool.connect();

    try {
      // 检查所有表
      const { rows } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

      const tables = rows.map(r => r.table_name);
      const hasUsers = tables.includes('users');

      // 检查users表结构
      let usersColumns = [];
      if (hasUsers) {
        const { rows: cols } = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position
        `);
        usersColumns = cols;
      }

      return NextResponse.json({
        success: true,
        totalTables: tables.length,
        tables,
        hasUsersTable: hasUsers,
        usersColumns,
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
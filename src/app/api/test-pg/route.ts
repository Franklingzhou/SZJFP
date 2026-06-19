import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  try {
    const supabaseUrl = 'https://mozamdshnaydbycpbifd.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vemFtZHNobmF5ZGJ5Y3BiZmlmZCIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3NDkxMTc2OTYsImV4cCI6MjA2NDY5MzY5Nn0.test';
    
    const url = new URL(supabaseUrl);
    const dbUrl = `postgres://postgres:${supabaseServiceKey}@${url.host}:5432/postgres`;

    const pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const client = await pool.connect();
    
    try {
      const res = await client.query('SELECT NOW() as current_time');
      return NextResponse.json({ 
        success: true, 
        message: 'pg连接成功',
        data: res.rows[0]
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    });
  }
}
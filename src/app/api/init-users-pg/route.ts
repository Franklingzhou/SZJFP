import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST() {
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
      const testUsers = [
        { id: 'w001', name: '王秀兰', phone: '13800005678', role: 'worker', wechat_openid: 'dev_wx_worker', review_status: 'approved', is_active: true },
        { id: 'a001', name: '张丽华', phone: '13600001234', role: 'agent', wechat_openid: 'dev_wx_agent', review_status: 'approved', is_active: true },
        { id: 'r001', name: '陈招生', phone: '13500003456', role: 'recruiter', wechat_openid: 'dev_wx_recruiter', review_status: 'approved', is_active: true },
        { id: 'i001', name: '李敏', phone: '13700007890', role: 'instructor', wechat_openid: 'dev_wx_instructor', review_status: 'approved', is_active: true },
        { id: 'c001', name: '刘女士', phone: '13900009876', role: 'customer', wechat_openid: 'dev_wx_customer', review_status: 'approved', is_active: true },
        { id: 'admin001', name: '管理员', phone: '13000000001', role: 'admin', wechat_openid: 'dev_wx_admin', review_status: 'approved', is_active: true },
        { id: 'ts001', name: '赵主管', phone: '13100001111', role: 'training_supervisor', wechat_openid: 'dev_wx_training_supervisor', review_status: 'approved', is_active: true },
        { id: 'wo001', name: '周运营', phone: '13200002222', role: 'worker_operator', wechat_openid: 'dev_wx_worker_operator', review_status: 'approved', is_active: true },
      ];

      const results = [];
      for (const user of testUsers) {
        try {
          await client.query(
            'INSERT INTO users (id, name, phone, role, wechat_openid, review_status, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, role = EXCLUDED.role, wechat_openid = EXCLUDED.wechat_openid, review_status = EXCLUDED.review_status, is_active = EXCLUDED.is_active',
            [user.id, user.name, user.phone, user.role, user.wechat_openid, user.review_status, user.is_active]
          );
          results.push({ id: user.id, name: user.name, role: user.role, success: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          results.push({ id: user.id, name: user.name, role: user.role, success: false, error: message });
        }
      }

      const failed = results.filter(r => !r.success);
      return NextResponse.json({
        success: failed.length === 0,
        results,
        message: failed.length === 0 ? '全部8个测试账号初始化成功！' : `初始化完成，但有 ${failed.length} 个失败`,
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '初始化失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
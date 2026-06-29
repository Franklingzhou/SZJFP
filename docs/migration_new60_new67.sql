-- ============================================================
-- 迁移 NEW-60 + NEW-67
-- 如果自动脚本失败，请在 Supabase Dashboard → SQL Editor 中手动执行
-- ============================================================

-- NEW-60: 允许 instructor_id 为 NULL
ALTER TABLE courses ALTER COLUMN instructor_id DROP NOT NULL;

-- NEW-67: 创建操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_name VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  detail TEXT,
  ip VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

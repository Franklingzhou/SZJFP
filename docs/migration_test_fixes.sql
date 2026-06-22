-- ============================================================
-- 🚨 必执行迁移：修复测试中暴露的数据库 schema 问题
-- 执行方式：Supabase SQL Editor 或 psql 直连
-- Supabase SQL Editor: https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new
-- ============================================================

-- 1. resumes_reviews: 添加 review_comment 列（approve/reject 使用）
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS review_comment TEXT;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS Reviewer_id VARCHAR(64);
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS review_note TEXT;

-- 2. courses: 添加 review_reason 列（approve 使用）
ALTER TABLE courses ADD COLUMN IF NOT EXISTS review_reason TEXT;

-- 3. course_schedules: 添加 review_reason 列（approve 使用）
ALTER TABLE course_schedules ADD COLUMN IF NOT EXISTS review_reason TEXT;

-- 4. platform_fees: 添加 confirmed_at 列（confirm 使用）
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(64);

-- 5. enrollments: 添加考核相关列
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS worker_id VARCHAR(64);

-- 6. leads: level 字段扩展到合理长度
ALTER TABLE leads ALTER COLUMN level TYPE VARCHAR(20);

-- 7. workers: gender 和 status 字段长度
-- (如果这些字段存在 varchar(4) 限制，扩展它们)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workers'
    AND column_name='gender' AND character_maximum_length <= 4) THEN
    ALTER TABLE workers ALTER COLUMN gender TYPE VARCHAR(10);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='workers'
    AND column_name='status' AND character_maximum_length <= 4) THEN
    ALTER TABLE workers ALTER COLUMN status TYPE VARCHAR(20);
  END IF;
END $$;

-- 8. CREATE certificates 表（如果不存在）
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  worker_id VARCHAR(64),
  course_id VARCHAR(64),
  title VARCHAR(200) NOT NULL,
  certificate_url TEXT,
  issued_by VARCHAR(64),
  status VARCHAR(20) DEFAULT 'issued',
  issue_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. CREATE venues 表（如果不存在）
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  address TEXT,
  capacity INT,
  description TEXT,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. CREATE contract_templates 表（如果不存在）
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_by VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

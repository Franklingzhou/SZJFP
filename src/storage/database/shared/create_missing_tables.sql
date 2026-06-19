-- ============================================================
-- 补建缺失表：commission_records 和 notifications
-- 执行环境：Supabase SQL Editor
-- ============================================================

-- 佣金记录表
CREATE TABLE IF NOT EXISTS commission_records (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  recommendation_id VARCHAR(50),
  creator_id VARCHAR(50) NOT NULL,           -- 创建人ID（经纪人/招生）
  maintainer_id VARCHAR(50),                 -- 维护人ID
  recommender_id VARCHAR(50),                -- 推荐人ID
  creator_amount DECIMAL(10,2) DEFAULT 0,    -- 创建人佣金
  maintainer_amount DECIMAL(10,2) DEFAULT 0, -- 维护人佣金
  recommender_amount DECIMAL(10,2) DEFAULT 0,-- 推荐人佣金
  total_amount DECIMAL(10,2) DEFAULT 0,      -- 总佣金
  status VARCHAR(20) DEFAULT 'pending',      -- pending/settled
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 站内通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,              -- 接收人ID
  type VARCHAR(50) NOT NULL,                 -- 通知类型
  title VARCHAR(200) NOT NULL,               -- 标题
  content TEXT,                              -- 内容
  related_id VARCHAR(50),                    -- 关联ID（订单/合同等）
  related_type VARCHAR(50),                  -- 关联类型
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 平台费用表
CREATE TABLE IF NOT EXISTS platform_fees (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  contract_id VARCHAR(50),
  contract_type VARCHAR(20),                 -- agency/training
  amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',      -- pending/confirmed
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为workers表添加缺失字段
ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- 为orders表添加缺失字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recommender_id VARCHAR(36) REFERENCES users(id);

-- 为reviews表添加缺失字段
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_type VARCHAR(20);

-- 为leads表添加缺失字段
ALTER TABLE leads ADD COLUMN IF NOT EXISTS job_types TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_salary INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS creator_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS creator_role VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_role VARCHAR(20);

-- 为customers表添加缺失字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS agent_id VARCHAR(36) REFERENCES users(id);

-- 为enrollments表添加缺失字段
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS passed BOOLEAN;

-- 创建排课表
CREATE TABLE IF NOT EXISTS course_schedules (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR(36) NOT NULL REFERENCES courses(id),
  instructor_id VARCHAR(36) NOT NULL REFERENCES users(id),
  date VARCHAR(20) NOT NULL,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10) NOT NULL,
  location VARCHAR(128),
  status VARCHAR(20) DEFAULT 'scheduled',
  max_students INTEGER DEFAULT 30,
  current_students INTEGER DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(36) REFERENCES users(id),
  approved_by VARCHAR(36) REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_schedules_course_id ON course_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_instructor_id ON course_schedules(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_date ON course_schedules(date);
CREATE INDEX IF NOT EXISTS idx_course_schedules_status ON course_schedules(status);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_commission_records_order_id ON commission_records(order_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_creator_id ON commission_records(creator_id);
CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================================
-- 插入测试数据
-- ============================================================

-- 插入workers测试数据（王秀兰）
INSERT INTO workers (
  id, user_id, name, phone, age, gender, origin, 
  job_types, experience_years, specialties, certifications,
  expected_salary_min, expected_salary_max, status, work_status,
  resume_review_status, credit_score, deposit, points,
  creator_id, creator_role, created_at, updated_at
) VALUES (
  'w001', 'w001', '王秀兰', '13800005678', 35, '女', '四川',
  '保洁,育婴,月嫂', 5, '擅长保洁和育婴', '高级育婴师证',
  4000, 6000, 'idle', 'available', 'approved',
  1000, 0, 0, 'admin001', 'admin', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

-- 插入注释
COMMENT ON TABLE commission_records IS '佣金记录表';
COMMENT ON TABLE notifications IS '站内通知表';
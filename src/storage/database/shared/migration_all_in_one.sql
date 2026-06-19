-- ============================================================
-- 家政共创平台 — 全量Migration SQL（按顺序执行）
-- 执行环境: Supabase SQL Editor
-- 生成时间: 2026-06-13
-- ============================================================

-- ============================================================
-- 1. migration_customer: 客户表扩展+客户跟进表
-- ============================================================

-- 客户表新增字段（如果表已存在则ALTER，不存在则CREATE）
DO $$ BEGIN
  -- 检查customers表是否存在
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers') THEN
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) REFERENCES users(id);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS requirement TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS address VARCHAR(255);
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_score INTEGER NOT NULL DEFAULT 1000;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  ELSE
    CREATE TABLE customers (
      id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id),
      name VARCHAR(64) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      requirement TEXT,
      address VARCHAR(255),
      credit_score INTEGER NOT NULL DEFAULT 1000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);

-- 客户跟进记录表
CREATE TABLE IF NOT EXISTS customer_followups (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  content TEXT,
  result VARCHAR(20),
  follow_up_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_followups_customer_id_idx ON customer_followups(customer_id);
CREATE INDEX IF NOT EXISTS customer_followups_follow_up_by_idx ON customer_followups(follow_up_by);

-- ============================================================
-- 2. migration_p1_3: P1数据架构修正（角色数据隔离）
-- ============================================================
-- 注意: 此migration已在P1阶段执行，如已执行可跳过
-- 核心内容：workers表加creator_role、maintainer_id、referrer_id等字段
-- 由于P1已部署过，此处仅做IF NOT EXISTS保护

ALTER TABLE workers ADD COLUMN IF NOT EXISTS creator_role VARCHAR(20);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS maintainer_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS maintainer_commission_rate NUMERIC(5,2);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS referrer_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS referrer_commission_rate NUMERIC(5,2);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS resume_review_status VARCHAR(20) NOT NULL DEFAULT 'draft';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS remark TEXT;

-- ============================================================
-- 3. migration_recommendations: 推荐记录表
-- ============================================================

CREATE TABLE IF NOT EXISTS recommendations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR(36) REFERENCES orders(id),
  recommender_id VARCHAR(36) NOT NULL REFERENCES users(id),
  recommender_role VARCHAR(20) NOT NULL,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS recommendations_order_id_idx ON recommendations(order_id);
CREATE INDEX IF NOT EXISTS recommendations_recommender_id_idx ON recommendations(recommender_id);
CREATE INDEX IF NOT EXISTS recommendations_worker_id_idx ON recommendations(worker_id);
CREATE INDEX IF NOT EXISTS recommendations_status_idx ON recommendations(status);

-- ============================================================
-- 4. migration_reviews: 评价表扩展
-- ============================================================

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_role VARCHAR(20);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- 更新已存在记录：根据target_user_id推断target_role
UPDATE reviews r SET target_role = u.role FROM users u WHERE r.target_user_id = u.id AND r.target_role IS NULL;
UPDATE reviews SET updated_at = created_at WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS reviews_target_role_idx ON reviews(target_role);

-- ============================================================
-- 5. migration_order_enhancement: 订单增强+签约记录表
-- ============================================================

-- orders表新增6个字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS work_duration VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_name VARCHAR(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signed_worker_id VARCHAR(36) REFERENCES workers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- 新建订单签约记录表
CREATE TABLE IF NOT EXISTS order_signings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR(36) NOT NULL REFERENCES orders(id),
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  worker_salary INTEGER,
  work_start_date VARCHAR(20),
  contract_start_date VARCHAR(20),
  contract_end_date VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  replace_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS order_signings_order_id_idx ON order_signings(order_id);
CREATE INDEX IF NOT EXISTS order_signings_worker_id_idx ON order_signings(worker_id);
CREATE INDEX IF NOT EXISTS order_signings_status_idx ON order_signings(status);

-- ============================================================
-- 6. migration_user_review: 用户审核字段
-- ============================================================

-- 新增字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(36);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_source VARCHAR(20) DEFAULT 'self';

-- 已有已审核用户标记为admin来源
UPDATE users SET register_source = 'admin', reviewed_by = id, reviewed_at = created_at WHERE review_status = 'approved';

-- 已有is_active=true但review_status=pending的用户（如测试账号），自动标记为approved
UPDATE users SET review_status = 'approved', register_source = 'admin', reviewed_by = id, reviewed_at = created_at WHERE review_status = 'pending' AND is_active = true;

-- 新增索引
CREATE INDEX IF NOT EXISTS users_register_source_idx ON users(register_source);

-- ============================================================
-- 完成！所有migration已执行
-- ============================================================

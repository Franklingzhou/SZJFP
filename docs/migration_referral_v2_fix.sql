-- 补缺：推荐系统v2 缺失字段 + worker_tiers种子数据
-- 在 Supabase SQL Editor 执行
-- URL: https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new

-- 1. users 加推荐码
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- 2. workers 加等级字段
ALTER TABLE workers ADD COLUMN IF NOT EXISTS tier_id VARCHAR(36);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS reorder_rate NUMERIC(4,3) DEFAULT 0;

-- 3. worker_tiers 建表（如果不存在） + 种子数据
CREATE TABLE IF NOT EXISTS worker_tiers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL UNIQUE,
  min_orders INTEGER DEFAULT 0,
  min_rating NUMERIC(2,1) DEFAULT 0,
  min_reorder_rate NUMERIC(4,3) DEFAULT 0,
  hourly_premium NUMERIC(10,2) DEFAULT 0,
  priority BOOLEAN DEFAULT false,
  deposit_reduction NUMERIC(10,2) DEFAULT 0,
  badge_color VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _openid VARCHAR(64) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_worker_tiers_level ON worker_tiers(level);

-- 4. worker_tiers 种子数据（如果为空则插入）
INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '铜牌阿姨', 1, 0, 0.0, 0.000, 0, false, 0, '#CD7F32'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 1);

INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '银牌阿姨', 2, 5, 4.5, 0.700, 5, false, 100, '#C0C0C0'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 2);

INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '金牌阿姨', 3, 20, 4.8, 0.800, 10, true, 200, '#FFD700'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 3);

INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '钻石阿姨', 4, 50, 4.9, 0.900, 15, true, 300, '#B9F2FF'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 4);

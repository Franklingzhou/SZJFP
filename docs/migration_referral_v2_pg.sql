-- ============================================================
-- 阿姨推荐系统 v2 — 双管道设计 (PostgreSQL版本)
-- 管道1：推荐当阿姨 → leads 线索池（主管分配/招生领取）
-- 管道2：推荐找阿姨 → customer_leads 客户公海库（管理员分配/经纪人领取）
-- 执行环境: Supabase SQL Editor
-- SQL Editor: https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new
-- ============================================================

-- 1. users 表加推荐码
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- 2. leads 表加推荐人字段（如果还没有）
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_id VARCHAR(36);

-- 3. 客户公海库（被推荐的客户线索）
CREATE TABLE IF NOT EXISTS customer_leads (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  gender VARCHAR(10),
  intention VARCHAR(200),          -- 找阿姨的具体需求描述
  service_type VARCHAR(50),        -- 需要的服务类型（保姆/月嫂/育儿嫂...）
  location VARCHAR(100),           -- 服务区域
  budget NUMERIC(10,2),            -- 预算
  source VARCHAR(50) DEFAULT 'referral', -- 来源：referral(推荐) | manual(手动录入)
  customer_type VARCHAR(20) DEFAULT 'platform', -- personal(个人客户) | platform(平台客户)
  referrer_id VARCHAR(36),         -- 推荐人ID
  assigned_to VARCHAR(36),         -- 分配给的经纪人ID
  is_public BOOLEAN DEFAULT true,  -- 是否在公海（经纪人可认领）
  status VARCHAR(20) DEFAULT 'new', -- new/following/matching/converted/completed/closed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  _openid VARCHAR(64) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_customer_leads_phone ON customer_leads(phone);
CREATE INDEX IF NOT EXISTS idx_customer_leads_assigned_to ON customer_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_leads_is_public ON customer_leads(is_public);
CREATE INDEX IF NOT EXISTS idx_customer_leads_status ON customer_leads(status);

-- 4. 推荐奖励记录
CREATE TABLE IF NOT EXISTS referral_rewards (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id VARCHAR(36) NOT NULL,            -- 推荐人ID
  referrer_name VARCHAR(100),
  referred_name VARCHAR(100),                  -- 被推荐人姓名
  source_type VARCHAR(20) NOT NULL,            -- 'lead' | 'customer_lead'
  source_id VARCHAR(36),                       -- leads.id 或 customer_leads.id
  reward_type VARCHAR(20) DEFAULT 'commission', -- commission | points | both
  reward_amount NUMERIC(10,2) DEFAULT 0,       -- 金额奖励
  reward_points INTEGER DEFAULT 0,             -- 积分奖励
  status VARCHAR(20) DEFAULT 'pending',        -- pending | paid | cancelled
  triggered_by VARCHAR(100),                   -- 触发事件描述
  reviewed_by VARCHAR(36),                     -- 审核/发放人
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ NULL,
  _openid VARCHAR(64) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);

-- 5. 阿姨等级体系
CREATE TABLE IF NOT EXISTS worker_tiers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(50) NOT NULL,           -- 铜牌/银牌/金牌/钻石
  level INTEGER NOT NULL UNIQUE,       -- 1-4
  min_orders INTEGER DEFAULT 0,        -- 最低完单数
  min_rating NUMERIC(2,1) DEFAULT 0,   -- 最低评分
  min_reorder_rate NUMERIC(4,3) DEFAULT 0, -- 最低续单率
  hourly_premium NUMERIC(10,2) DEFAULT 0,  -- 时薪加成
  priority BOOLEAN DEFAULT false,       -- 优先派单
  deposit_reduction NUMERIC(10,2) DEFAULT 0, -- 保证金减免
  badge_color VARCHAR(20),             -- 徽章颜色
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  _openid VARCHAR(64) NOT NULL DEFAULT ''
);

-- 6. workers 表加等级相关字段
ALTER TABLE workers ADD COLUMN IF NOT EXISTS tier_id VARCHAR(36);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS reorder_rate NUMERIC(4,3) DEFAULT 0;

-- 7. 种子数据：等级配置
INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '铜牌阿姨', 1, 0,  0.0, 0.000, 0,   false, 0,   '#CD7F32'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 1);

INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '银牌阿姨', 2, 5,  4.5, 0.700, 5,   false, 100, '#C0C0C0'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 2);

INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '金牌阿姨', 3, 20, 4.8, 0.800, 10,  true, 200, '#FFD700'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 3);

INSERT INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color)
SELECT gen_random_uuid()::text, '钻石阿姨', 4, 50, 4.9, 0.900, 15,  true, 300, '#B9F2FF'
WHERE NOT EXISTS (SELECT 1 FROM worker_tiers WHERE level = 4);

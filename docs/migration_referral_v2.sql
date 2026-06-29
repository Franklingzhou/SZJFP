-- ============================================================
-- 阿姨推荐系统 v2 — 双管道设计 (MySQL版本)
-- 管道1：推荐当阿姨 → leads 线索池（主管分配/招生领取）
-- 管道2：推荐找阿姨 → customer_leads 客户公海库（管理员分配/经纪人领取）
-- ============================================================

-- 1. users 表加推荐码
ALTER TABLE users ADD COLUMN referral_code VARCHAR(10);
CREATE UNIQUE INDEX idx_users_referral_code ON users(referral_code);

-- 2. leads 表加推荐人字段（如已有则跳过）
-- ALTER TABLE leads ADD COLUMN referrer_id CHAR(36);

-- 3. 客户公海库（被推荐的客户线索）
CREATE TABLE IF NOT EXISTS customer_leads (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  gender VARCHAR(10),
  intention VARCHAR(200),          -- 找阿姨的具体需求描述
  service_type VARCHAR(50),        -- 需要的服务类型（保姆/月嫂/育儿嫂...）
  location VARCHAR(100),           -- 服务区域
  budget DECIMAL(10,2),            -- 预算
  source VARCHAR(50) DEFAULT 'referral', -- 来源：referral(推荐) | manual(手动录入)
  customer_type VARCHAR(20) DEFAULT 'platform', -- personal(个人客户) | platform(平台客户)
  referrer_id CHAR(36),            -- 推荐人ID
  assigned_to CHAR(36),            -- 分配给的经纪人ID
  is_public TINYINT(1) DEFAULT 1,  -- 是否在公海（经纪人可认领）
  status VARCHAR(20) DEFAULT 'new', -- new/following/matching/converted/completed/closed
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) NOT NULL DEFAULT ''
);

-- 4. 推荐奖励记录
CREATE TABLE IF NOT EXISTS referral_rewards (
  id CHAR(36) PRIMARY KEY,
  referrer_id CHAR(36) NOT NULL,            -- 推荐人ID
  referrer_name VARCHAR(100),
  referred_name VARCHAR(100),               -- 被推荐人姓名
  source_type VARCHAR(20) NOT NULL,         -- 'lead' | 'customer_lead'
  source_id CHAR(36),                       -- leads.id 或 customer_leads.id
  reward_type VARCHAR(20) DEFAULT 'commission', -- commission | points | both
  reward_amount DECIMAL(10,2) DEFAULT 0,    -- 金额奖励
  reward_points INT DEFAULT 0,              -- 积分奖励
  status VARCHAR(20) DEFAULT 'pending',     -- pending | paid | cancelled
  triggered_by VARCHAR(100),                -- 触发事件描述
  reviewed_by CHAR(36),                     -- 审核/发放人
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  _openid VARCHAR(64) NOT NULL DEFAULT ''
);

-- 5. 阿姨等级体系
CREATE TABLE IF NOT EXISTS worker_tiers (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,          -- 铜牌/银牌/金牌/钻石
  level INT NOT NULL UNIQUE,          -- 1-4
  min_orders INT DEFAULT 0,           -- 最低完单数
  min_rating DECIMAL(2,1) DEFAULT 0,  -- 最低评分
  min_reorder_rate DECIMAL(4,3) DEFAULT 0, -- 最低续单率
  hourly_premium DECIMAL(10,2) DEFAULT 0,  -- 时薪加成
  priority TINYINT(1) DEFAULT 0,      -- 优先派单
  deposit_reduction DECIMAL(10,2) DEFAULT 0, -- 保证金减免
  badge_color VARCHAR(20),            -- 徽章颜色
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  _openid VARCHAR(64) NOT NULL DEFAULT ''
);

-- workers 表加等级相关字段
ALTER TABLE workers ADD COLUMN tier_id CHAR(36);
ALTER TABLE workers ADD COLUMN completed_orders INT DEFAULT 0;
ALTER TABLE workers ADD COLUMN avg_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE workers ADD COLUMN reorder_rate DECIMAL(4,3) DEFAULT 0;

-- 种子数据：等级配置
INSERT IGNORE INTO worker_tiers (id, name, level, min_orders, min_rating, min_reorder_rate, hourly_premium, priority, deposit_reduction, badge_color) VALUES
  (UUID(), '铜牌阿姨', 1, 0,  0.0, 0.000, 0,  0, 0,   '#CD7F32'),
  (UUID(), '银牌阿姨', 2, 5,  4.5, 0.700, 5,  0, 100, '#C0C0C0'),
  (UUID(), '金牌阿姨', 3, 20, 4.8, 0.800, 10, 1, 200, '#FFD700'),
  (UUID(), '钻石阿姨', 4, 50, 4.9, 0.900, 15, 1, 300, '#B9F2FF');

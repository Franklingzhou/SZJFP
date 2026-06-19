-- 客户管理模块迁移（1A）
-- customers表扩展字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'other';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by VARCHAR;

-- 新增客户跟进记录表
CREATE TABLE IF NOT EXISTS customer_followups (
  id SERIAL PRIMARY KEY,
  customer_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  followup_type VARCHAR(20) DEFAULT 'phone',
  created_by VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_customer_followups_customer_id ON customer_followups(customer_id);

-- 客户表增加 status/source/agent_id 字段
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'new';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS agent_id VARCHAR(36) REFERENCES users(id);

-- CHECK 约束（幂等：先DROP再ADD）
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check CHECK (status IN ('new', 'matching', 'signed', 'lost'));

-- 索引
CREATE INDEX IF NOT EXISTS customers_status_idx ON customers(status);
CREATE INDEX IF NOT EXISTS customers_agent_id_idx ON customers(agent_id);

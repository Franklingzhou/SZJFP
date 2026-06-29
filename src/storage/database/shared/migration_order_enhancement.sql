-- 3A: 订单增强 - Schema扩展迁移
-- 注意：此SQL暂不执行，仅用于代码审查和后续部署

-- ============================================================
-- 1. orders表新增6个字段
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS salary_type VARCHAR(20);           -- 薪资类型：月薪/日薪/计件
ALTER TABLE orders ADD COLUMN IF NOT EXISTS work_duration VARCHAR(50);         -- 工作时长：住家/白班/钟点
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_name VARCHAR(64);          -- 联系人姓名
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);         -- 联系人电话
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signed_worker_id VARCHAR(36) REFERENCES workers(id);  -- 签约阿姨ID
ALTER TABLE orders ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;             -- 签约时间

-- ============================================================
-- 2. 新建订单签约记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS order_signings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR(36) NOT NULL REFERENCES orders(id),
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  worker_salary INTEGER,                           -- 阿姨薪资（单位：元）
  work_start_date VARCHAR(20),                     -- 实际上岗日期
  contract_start_date VARCHAR(20),                 -- 合同开始日期
  contract_end_date VARCHAR(20),                   -- 合同结束日期
  status VARCHAR(20) NOT NULL DEFAULT 'active',    -- active / replaced / cancelled
  replace_reason TEXT,                              -- 换人原因
  created_by VARCHAR(36),                           -- 创建人ID
  notes TEXT,                                       -- 备注
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- ============================================================
-- 3. 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS order_signings_order_id_idx ON order_signings(order_id);
CREATE INDEX IF NOT EXISTS order_signings_worker_id_idx ON order_signings(worker_id);
CREATE INDEX IF NOT EXISTS order_signings_status_idx ON order_signings(status);

-- ============================================================
-- 文件四 Step 1: DB变更 — leads sign字段 + workers字段 + refunds退款表
-- 执行环境: Supabase SQL Editor / CloudBase MySQL
-- 生成时间: 2026-06-21
-- ============================================================

-- ============================================================
-- 1. leads 表增加签约相关字段
-- ============================================================

-- 签约时间
ALTER TABLE leads ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- 签约操作人
ALTER TABLE leads ADD COLUMN IF NOT EXISTS signed_by VARCHAR(36) REFERENCES users(id);

-- 签约后生成的worker_id
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sign_worker_id VARCHAR(36);

-- 是否想培训（招生时可标记）
ALTER TABLE leads ADD COLUMN IF NOT EXISTS want_training BOOLEAN DEFAULT false;

-- 新增索引
CREATE INDEX IF NOT EXISTS leads_signed_by_idx ON leads(signed_by);
CREATE INDEX IF NOT EXISTS leads_sign_worker_id_idx ON leads(sign_worker_id);

-- ============================================================
-- 1.5 workers 表增加字段（phone + lead_id + status默认值调整）
-- ============================================================

-- 手机号（用于phone查重，签约时不重复创建worker）
ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 来源线索（签约创建时写入 + 再培训创建新lead时更新）
ALTER TABLE workers ADD COLUMN IF NOT EXISTS lead_id VARCHAR(36) REFERENCES leads(id) ON DELETE SET NULL;

-- 新增索引
CREATE INDEX IF NOT EXISTS workers_phone_idx ON workers(phone);
CREATE INDEX IF NOT EXISTS workers_lead_id_idx ON workers(lead_id);

-- 更新现有记录的status默认值（如果之前是idle）
UPDATE workers SET status = 'pending' WHERE status = 'idle';

-- ============================================================
-- 2. 新建 refunds 退款申请表（对齐业务规则2.0方案）
-- ============================================================

CREATE TABLE IF NOT EXISTS refunds (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  refund_type VARCHAR(50) NOT NULL,                  -- training_fee | agency_fee | deposit
  amount NUMERIC(10,2) NOT NULL,                     -- 退款金额（元）
  reason TEXT,                                        -- 退款原因
  related_type VARCHAR(50) NOT NULL,                  -- lead_contract | contract | order | worker
  related_id VARCHAR(36) NOT NULL,                    -- 关联记录ID
  related_name VARCHAR(128),                          -- 关联名称（冗余，方便展示）
  requester_id VARCHAR(36) NOT NULL REFERENCES users(id), -- 发起人
  requester_role VARCHAR(20),                         -- 发起人角色（冗余）
  status VARCHAR(20) NOT NULL DEFAULT 'pending',      -- pending | approved | completed | rejected
  approver_id VARCHAR(36) REFERENCES users(id),       -- 审核人
  review_comment TEXT,                                -- 审核意见
  approved_at TIMESTAMPTZ,                            -- 审批通过时间
  completed_at TIMESTAMPTZ,                           -- 线下打款确认时间
  remark TEXT,                                        -- 备注
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  CONSTRAINT chk_related_type CHECK (related_type IN ('lead_contract','contract','order','worker')),
  CONSTRAINT chk_refund_type CHECK (refund_type IN ('training_fee','agency_fee','deposit')),
  CONSTRAINT chk_refund_status CHECK (status IN ('pending','approved','completed','rejected'))
);

CREATE INDEX IF NOT EXISTS refunds_status_idx ON refunds(status);
CREATE INDEX IF NOT EXISTS refunds_related_type_idx ON refunds(related_type);
CREATE INDEX IF NOT EXISTS refunds_requester_idx ON refunds(requester_id);

-- ============================================================
-- 上户记录：合同自动同步 + 公开页字段可见性配置
-- 在 Supabase SQL Editor 中执行
-- ============================================================

-- 1. worker_work_experience 加 contract_id + source 字段
ALTER TABLE worker_work_experience ADD COLUMN IF NOT EXISTS contract_id VARCHAR(36);
ALTER TABLE worker_work_experience ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
COMMENT ON COLUMN worker_work_experience.contract_id IS '关联的中介合同ID (agency_contracts.id)';
COMMENT ON COLUMN worker_work_experience.source IS '数据来源: manual=手动录入, contract=合同自动同步';

-- 存量数据都标记为手动录入
UPDATE worker_work_experience SET source = 'manual' WHERE source IS NULL;

-- 2. system_settings 加公开页字段可见性配置
INSERT INTO system_settings (key, value, description)
VALUES (
  'work_experience_public_visibility',
  '{"period":true,"employer":false,"jobType":true,"description":true,"salary":false}',
  '上户记录公开页可见字段控制 (period=时间段, employer=雇主, jobType=工种, description=描述, salary=薪资)'
)
ON CONFLICT (key) DO NOTHING;

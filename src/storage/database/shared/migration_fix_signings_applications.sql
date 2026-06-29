-- ============================================================
-- migration_fix_signings_applications.sql
-- 修复 BUG-E12 + BUG-W16：order_signings 缺列 + worker_applications 缺表
-- 执行方式：在 Supabase SQL Editor 中直接运行
-- 日期：2026-06-28
-- ============================================================

-- ============================================================
-- 1. BUG-E12: order_signings 表新增 created_by / notes 列
-- ============================================================
ALTER TABLE order_signings ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);
ALTER TABLE order_signings ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================================
-- 2. BUG-W16: 创建 worker_applications 表（阿姨自荐/申请记录）
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_applications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  order_id VARCHAR(36) REFERENCES orders(id),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  applicant_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS worker_applications_worker_id_idx ON worker_applications(worker_id);
CREATE INDEX IF NOT EXISTS worker_applications_status_idx ON worker_applications(status);
CREATE INDEX IF NOT EXISTS worker_applications_applicant_id_idx ON worker_applications(applicant_id);

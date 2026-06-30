-- ============================================================
-- 🚨 必执行迁移：platform_fees 添加 due_date 列
-- 用途：cron/fee-overdue 定时任务需要 due_date 判断逾期
-- 执行方式：Supabase SQL Editor
-- Supabase SQL Editor: https://supabase.com/dashboard/project/mozamdshnaydbycpbifd/sql/new
-- ============================================================

ALTER TABLE platform_fees ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

COMMENT ON COLUMN platform_fees.due_date IS '平台费用到期日期';

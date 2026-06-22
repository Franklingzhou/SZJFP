-- ============================================================
-- 预注册认领机制 Migration
-- 业务规则第十六条 + 变更方案 Step 7
-- ============================================================

-- 1. workers.user_id 改为可空（预注册时user_id=null，用户登录后认领绑定）
ALTER TABLE workers ALTER COLUMN user_id DROP NOT NULL;

-- 2. leads 表不需要 user_id（线索通过 sign_worker_id 关联 worker，worker再关联user）
--    但为了支持预注册认领，不需要额外改动leads表

-- 3. customers 表如果有 user_id 字段也改为可空
--    （如果customers表有user_id且为NOT NULL，请执行以下SQL）
-- ALTER TABLE customers ALTER COLUMN user_id DROP NOT NULL;

-- ==========================================
-- 转岗机制：支持阿姨/客户申请转为内部角色
-- 说明：
--   pending_role          = 申请中的新角色（空=无申请）
--   pending_role_status   = 申请状态（pending/approved/rejected）
-- 
-- 流程：
--   1. 用户提申请 → pending_role=目标角色, pending_role_status=pending
--   2. 管理员通过 → role=目标角色, pending_role清空, pending_role_status=approved
--   3. 同时封存原角色数据（如阿姨→suspended）
-- ==========================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pending_role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pending_role_status VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN users.pending_role IS '申请中的新角色（空=无转岗申请）';
COMMENT ON COLUMN users.pending_role_status IS '转岗申请状态：pending待审核/approved已通过/rejected已拒绝';

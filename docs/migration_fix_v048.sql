-- ============================================
-- v048 紧急修复迁移脚本
-- ============================================

-- BUG-53: courses表添加reject_reason列
ALTER TABLE courses ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- NEW-57: 修复被覆盖的party_b_id
-- 签署前所有contracts应保留原始party_b_id，不应该被签署者ID覆盖
-- 由于原始party_b_id在之前版本中被覆盖且无备份，无法自动恢复
-- 以下查询仅用于审计，需人工确认修复
SELECT id, party_b_id, status, signed_at 
FROM contracts 
WHERE status = 'signed' 
ORDER BY signed_at DESC;

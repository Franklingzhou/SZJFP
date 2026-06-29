-- 评价审核上线：添加 status 和 hide_reason 字段
-- 运行: pnpm db-migrate 或直接在 Supabase SQL Editor 执行

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hide_reason VARCHAR(100);

-- 存量数据迁移：已有 hidden=true 的设为 hidden_by_admin，其余为 approved
UPDATE reviews SET status = CASE WHEN hidden = true THEN 'hidden_by_admin' ELSE 'approved' END WHERE status IS NULL;

COMMENT ON COLUMN reviews.status IS '评价状态: pending=待审核, approved=已上线, hidden_by_admin=管理员隐藏';
COMMENT ON COLUMN reviews.hide_reason IS '隐藏原因（管理员手动隐藏时填写）';

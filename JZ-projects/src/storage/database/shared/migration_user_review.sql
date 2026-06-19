-- 模块5A: users表新增审核字段
-- 执行时间: 2026-06-13

-- 新增字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(36);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS register_source VARCHAR(20) DEFAULT 'self';

-- 已有已审核用户标记为admin来源（假设之前都是admin录入的）
UPDATE users SET register_source = 'admin', reviewed_by = id, reviewed_at = created_at WHERE review_status = 'approved';

-- 已有is_active=true但review_status=pending的用户（如测试账号），自动标记为approved
UPDATE users SET review_status = 'approved', register_source = 'admin', reviewed_by = id, reviewed_at = created_at WHERE review_status = 'pending' AND is_active = true;

-- 新增索引
CREATE INDEX IF NOT EXISTS users_register_source_idx ON users(register_source);

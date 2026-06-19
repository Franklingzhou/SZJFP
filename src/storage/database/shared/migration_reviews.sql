-- 评价表扩展：加target_role和updated_at
ALTER TABLE reviews ADD COLUMN target_role VARCHAR(20);
ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMPTZ;

-- 更新已存在记录：根据target_user_id推断target_role
UPDATE reviews r SET target_role = u.role FROM users u WHERE r.target_user_id = u.id AND r.target_role IS NULL;
UPDATE reviews SET updated_at = created_at WHERE updated_at IS NULL;

CREATE INDEX IF NOT EXISTS reviews_target_role_idx ON reviews(target_role);

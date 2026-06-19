-- 推荐记录表增加拒绝理由字段
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

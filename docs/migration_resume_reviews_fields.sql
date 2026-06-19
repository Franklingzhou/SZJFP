-- 任务4：简历审核改造 - 数据库迁移（幂等写法）

-- resume_reviews表加3个字段
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS proposed_data JSONB;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS original_data JSONB;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS changed_fields TEXT[];

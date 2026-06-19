-- 第十一轮测试修复迁移脚本
-- 1. course_schedules.location 列扩容
-- 2. enrollments 添加 updated_at 列

-- 修复排课创建失败：location列varchar(10)太短
ALTER TABLE course_schedules ALTER COLUMN location TYPE varchar(200);

-- 修复考核打分失败：enrollments表缺少updated_at列
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
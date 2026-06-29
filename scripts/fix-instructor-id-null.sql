-- NEW-60: 修复 courses 表 instructor_id NOT NULL 约束
-- 允许创建无讲师的课程（instructor_id 可为 NULL）
ALTER TABLE courses ALTER COLUMN instructor_id DROP NOT NULL;

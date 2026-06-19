-- 任务3：课程设置Tab - 数据库迁移（幂等写法）

-- 1. courses表加course_type字段
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_type VARCHAR(20) DEFAULT 'single';

-- 2. course_type CHECK约束（幂等：先DROP再ADD）
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_course_type_check;
ALTER TABLE courses ADD CONSTRAINT courses_course_type_check CHECK (course_type IN ('single', 'package'));

-- 3. 新建course_package_items表（套餐包含的单课列表）
CREATE TABLE IF NOT EXISTS course_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  item_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_course_id, item_course_id)
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS course_package_items_package_idx ON course_package_items(package_course_id);
CREATE INDEX IF NOT EXISTS course_package_items_item_idx ON course_package_items(item_course_id);

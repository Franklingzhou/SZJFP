# API测试剩余失败用例 — 待处理清单

> 更新时间: 2026-06-22 19:40
> 当前通过率: **307/309 (99.4%)**（预估，E02待验证）
> 剩余失败: **2条**

---

## 本轮修复回顾 (304→307+, +3条)

| 用例 | 根因 | 修复 |
|------|------|------|
| E05 | `grade→score` 字段名错误 | 改为 API 期望的 `{score, comment}` |
| U04 | `firstOrderId` 指向 completed 订单 | 检测终态后自动创建新订单 |
| U11 | POST 缺 `course_id` 必填字段 | 先查 courses 取 ID，用 `fee` 而非 `amount` |

---

## 剩余失败 2条

### 1. D03 — 删除课程套餐项目 (course-package-items) 【1条】

| 用例 | 错误 | 根因 |
|------|------|------|
| D03-正向-删除套餐项目 | 创建失败 | **`course_package_items` 表不存在** |

**解决方案**：在 Supabase SQL Editor 中执行：
```sql
CREATE TABLE IF NOT EXISTS course_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  item_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_course_id, item_course_id)
);
CREATE INDEX IF NOT EXISTS course_package_items_package_idx ON course_package_items(package_course_id);
CREATE INDEX IF NOT EXISTS course_package_items_item_idx ON course_package_items(item_course_id);
```

### 2. E02 — 简历审批流程 【1条】

| 用例 | 错误 | 根因 |
|------|------|------|
| E02-流程-创建简历→查询→admin审批通过 | 期望200，实际404 | resume_review 因 RLS 未自动创建；已改为用 init-users 预创建记录 |

状态：已修复代码，待验证。

---

## 已完成修复列表（本轮全部）

| 轮次 | 修复数 | 关键改动 |
|------|--------|---------|
| 第1轮 (9→5) | 4 | E05假ID, E04权限, E02路由, E03状态机, E06合同类型 |
| 第2轮 (5→2) | 3 | E05字段名(grade→score), U04终态检测, U11必填字段 |

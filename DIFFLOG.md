# Diff日志

> 记录每次改动涉及的文件和行数统计

---

## 2026-06-12 模块1：客户管理（1A~1E）

### 1A Schema扩展
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/storage/database/shared/schema.ts | 修改 | +42行（customers加4字段 + customer_followups表 + migration SQL） |

### 1B Customers CRUD API
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/api/customers/route.ts | 新建 | +187行 |
| src/lib/auth-middleware.ts | 修改 | +3行（权限矩阵） |

### 1C Followups CRUD API
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/api/customer-followups/route.ts | 新建 | +185行 |

### 1D PC端客户管理页面
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/admin/customers/page.tsx | 新建 | +554行 |

### 1E 小程序5页面
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/m/agent/customers/page.tsx | 新建 | +307行 |
| src/app/m/agent/hall/page.tsx | 新建 | +8行 |
| src/app/m/agent/orders/page.tsx | 修改 | 95→309行（+214/-0） |
| src/app/m/worker/orders/page.tsx | 新建 | +256行 |
| src/app/m/customer/orders/page.tsx | 修改 | 165→140行（-25/+0） |

**模块1合计：5文件，+524/-110**

---

## 2026-06-12~06-13 模块2：推荐记录（2A~2D）

### 2A Schema扩展
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/storage/database/shared/schema.ts | 修改 | +42行（recommendations表 + migration SQL） |

### 2B Recommendations API
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/api/recommendations/route.ts | 新建 | +275行 |
| src/lib/auth-middleware.ts | 修改 | +3行（权限矩阵） |

### 2C PC端推荐管理页面
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/admin/recommendations/page.tsx | 新建 | +556行 |

### 2D-1 经纪人订单页改造
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/m/agent/orders/page.tsx | 修改 | 309行（5个bug修正后） |

### 2D-2 阿姨推荐记录页
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/m/worker/orders/page.tsx | 新建 | +256行 |

### 2D-3 权限矩阵更新
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/lib/auth-middleware.ts | 修改 | reviews:read/write加6角色 |

### 2D-4 合单大厅改造
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/components/miniapp/hall.tsx | 修改 | 579→649行（+70/-0） |
| src/app/m/training_supervisor/hall/page.tsx | 新建 | +7行 |

### 2D-5 接单大厅改造
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/m/worker/jobs/page.tsx | 修改 | 85→192行（+107/-0） |
| src/lib/auth-middleware.ts | 修改 | recommendations:write加worker + reviews权限回归修复 |

### 2D-6 客户订单页改造
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/m/customer/orders/page.tsx | 修改 | 165→140行（+14/-25） |

### 2D-7 评价API改造
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/app/api/reviews/route.ts | 修改 | 127→143行（+16/-0） |
| src/storage/database/shared/schema.ts | 修改 | +2字段（target_role + updated_at）+索引 |
| src/storage/database/shared/migration_reviews.sql | 新建 | +9行 |

### 2D-8 小程序评价页统一
| 文件 | 操作 | 行数变化 |
|------|------|----------|
| src/components/miniapp/reviews.tsx | 新建 | +119行 |
| src/lib/types.ts | 修改 | +3行（worker_operator评价定义） |
| src/app/m/worker/reviews/page.tsx | 修改 | 41→6行 |
| src/app/m/agent/reviews/page.tsx | 修改 | 83→6行 |
| src/app/m/customer/reviews/page.tsx | 修改 | 67→6行 |
| src/app/m/recruiter/reviews/page.tsx | 修改 | 82→6行 |
| src/app/m/instructor/reviews/page.tsx | 修改 | 123→6行 |
| src/app/m/worker_operator/reviews/page.tsx | 新建 | +6行 |
| src/app/m/training_supervisor/reviews/page.tsx | 新建 | +6行 |

**模块2合计：15文件，+1388/-241**

---

## 2026-06-20 第五轮：BUG-1~7 + P4推荐去重 (commit: 36ca519)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/courses/route.ts` | 修改 | BUG-3 课程满员 |
| `src/app/api/contracts/route.ts` | 修改 | BUG-2 合同字段映射 |
| `src/app/api/enrollments/route.ts` | 修改 | BUG-4 报名status |
| `src/app/api/leads/[id]/convert/route.ts` | 修改 | BUG-5 线索转简历 |
| `src/app/api/orders/route.ts` | 修改 | BUG-1 worker_id外键 |
| `src/app/api/recommendations/route.ts` | 修改 | BUG-6+P4 推荐去重 |
| `src/app/api/workers/route.ts` | 修改 | |
| `src/lib/auth-middleware.ts` | 修改 | 权限调整 |

**第五轮合计：8文件**

---

## 2026-06-20 第六轮：P5满员自动关闭 + P6手机号唯一 (commits: c2f03de, f24c2fd)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/customers/route.ts` | 修改 | P6 手机号唯一性校验 |
| `src/app/api/enrollments/route.ts` | 修改 | P5 满员→closed |

**第六轮合计：2文件**

---

## 2026-06-20 第七轮：P1签约创建worker (commit: 43a4e95)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/customers/route.ts` | 修改 | |
| `src/app/api/enrollments/route.ts` | 修改 | 错误详情 |
| `src/app/api/leads/[id]/convert/route.ts` | 修改 | P1签约→worker |

**第七轮合计：3文件**

---

## 2026-06-26 第八轮：操作日志解除ignore (commit: bab8bf3)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/admin/logs/page.tsx` | 修改 | 取消.gitignore排除 |

**第八轮合计：1文件**

---

## 2026-06-26 第九轮：SEC-02 + BUG-NEW7 + 接单大厅 (commit: f89b0ad)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/contracts/[id]/route.ts` | 修改 | DELETE admin-only |
| `src/app/api/orders/route.ts` | 修改 | DELETE admin-only |
| `src/app/m/worker/jobs/page.tsx` | 修改 | 合并我的订单Tab |
| `src/lib/auth-middleware.ts` | 修改 | 权限矩阵 |
| `scripts/smoke-test.mjs` | 修改 | 冒烟测试 |

**第九轮合计：5文件**

---

## 2026-06-27 第十轮：部署012回归修复 (未commit，szjfp-012)

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/contracts/my/route.ts` | 新建 | contracts/my 500修复 |
| `src/app/api/students/[id]/confirm/route.ts` | 新建 | 学员确认API |
| `src/app/api/orders/[id]/change-worker/route.ts` | 新建 | 换阿姨别名路由 |
| `src/app/api/leads/[id]/follow-ups/route.ts` | 新建 | 线索跟进别名路由 |
| `src/app/api/search/route.ts` | 修改 | 搜索超长自动截断 |
| `src/app/admin/course-schedules/page.tsx` | 修改 | 修正approve参数 |
| `src/app/m/worker/customers/page.tsx` | 新建 | 阿姨端客户页 |
| `src/app/m/training_supervisor/approval/courses/page.tsx` | 重写 | 对接真实API |
| `src/components/miniapp/tab-bar.tsx` | 修改 | 加客户tab |

**第十轮合计：9文件（新建5 + 修改3 + 重写1）**

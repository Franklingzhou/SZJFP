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

## 2026-06-27 第十轮：部署012回归修复 (commit: c9efb3f，szjfp-012)

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

---

## 2026-06-27 第十一轮：commit第十轮未提交代码 + N-Schema防御 (commit: c9efb3f, 部署 szjfp-013)

**根因**: 第十轮所有修复为 uncommitted，szjfp-012 部署的是第九轮代码

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/resume-reviews/[id]/approve/route.ts` | 修改 | 重写重试逻辑：逐列检测 notes/review_note/review_comment，最多3次 |
| `src/app/api/commission-settlements/route.ts` | 新建 | 分账结算API |
| `src/app/api/clients/route.ts` | 新建 | 客户管理API |
| `src/app/api/contracts/[id]/student-confirm/route.ts` | 新建 | 学员签约确认 |
| `src/app/api/course-schedules/[id]/approve/route.ts` | 新建 | 课表审核API |
| `src/app/api/customer-leads/route.ts` | 新建 | 客户线索API |
| `src/app/api/dev/run-migration/route.ts` | 新建 | 开发迁移工具 |
| `src/app/api/enrollments/[id]/grade/route.ts` | 新建 | 讲师考核打分 |
| `src/app/api/leads/[id]/follow-ups/route.ts` | 新建 | 线索跟进别名（已列第十轮） |
| `src/app/api/leads/[id]/followups/route.ts` | 修改 | 线索跟进实现 |
| `src/app/api/levels/route.ts` | 新建 | 等级管理API |
| `src/app/api/operation-logs/route.ts` | 新建 | 操作日志API |
| `src/app/api/orders/[id]/cancel/route.ts` | 新建 | 订单取消API |
| `src/app/api/orders/[id]/change-worker/route.ts` | 新建 | 换阿姨别名（已列第十轮） |
| `src/app/api/orders/[id]/replace/route.ts` | 修改 | 换阿姨实现 |
| `src/app/api/platform-fees/[id]/confirm/route.ts` | 新建 | 平台费确认 |
| `src/app/api/profile/route.ts` | 新建 | 个人资料API |
| `src/app/api/recommendations/[id]/accept/route.ts` | 新建 | 推荐接受API |
| `src/app/api/recommendations/[id]/route.ts` | 新建 | 推荐详情API |
| `src/app/api/recommendations/route.ts` | 修改 | 推荐去重逻辑 |
| `src/app/api/referral/apply/route.ts` | 新建 | 转介绍申请 |
| `src/app/api/referral/my-code/route.ts` | 新建 | 我的推荐码 |
| `src/app/api/referral/my-referrals/route.ts` | 新建 | 我的推荐列表 |
| `src/app/api/referral-rewards/route.ts` | 新建 | 推荐奖励API |
| `src/app/api/resume-reviews/route.ts` | 修改 | 审核列表筛选 |
| `src/app/api/resume-reviews/[id]/reject/route.ts` | 修改 | 列名自动检测 |
| `src/app/api/resume-transfers/route.ts` | 新建 | 简历转介API |
| `src/app/api/reviews/[id]/route.ts` | 新建 | 评价详情API |
| `src/app/api/reviews/route.ts` | 修改 | 评价列表API |
| `src/app/api/search/route.ts` | 新建 | 搜索API（已列第十轮） |
| `src/app/api/settings/route.ts` | 修改 | 系统设置API |
| `src/app/api/students/[id]/confirm/route.ts` | 新建 | 学员确认（已列第十轮） |
| `src/app/api/student/[id]/convert-to-worker/route.ts` | 新建 | 学员转阿姨 |
| `src/app/api/users/[id]/route.ts` | 新建 | 用户详情API |
| `src/app/api/venues/route.ts` | 修改 | 场地管理API |
| `src/app/api/worker-tiers/route.ts` | 新建 | 阿姨等级API |
| `src/app/api/workers/[id]/media/route.ts` | 新建 | 阿姨媒体文件 |
| `src/app/api/workers/[id]/pause/route.ts` | 新建 | 阿姨暂停接单 |
| `src/app/api/workers/[id]/resume/route.ts` | 新建 | 阿姨恢复接单 |
| `src/app/api/workers/[id]/route.ts` | 修改 | 阿姨详情API |
| `src/app/api/workers/[id]/work-experience/route.ts` | 新建 | 阿姨工作经历 |
| `src/app/admin/assessments/page.tsx` | 新建 | 考核管理页 |
| `src/app/admin/customer-leads/page.tsx` | 新建 | 客户线索页 |
| `src/app/admin/hall/page.tsx` | 修改 | 合单大厅增强 |
| `src/app/admin/levels/page.tsx` | 新建 | 等级管理页 |
| `src/app/admin/points/page.tsx` | 新建 | 积分管理页 |
| `src/app/admin/referrals/page.tsx` | 新建 | 转介绍管理页 |
| `src/app/admin/resume-reviews/page.tsx` | 修改 | 审核列表增强 |
| `src/app/admin/roles/page.tsx` | 修改 | 角色管理增强 |
| `src/app/admin/tiers/page.tsx` | 新建 | 层级管理页 |
| `src/app/m/customer/contracts/page.tsx` | 新建 | 客户端合同页 |
| `src/app/m/recruiter/leads/page.tsx` | 新建 | 招生端线索页 |
| `src/app/m/training_supervisor/approval/courses/page.tsx` | 重写 | 课程审批页 |
| `src/app/m/training_supervisor/leads/page.tsx` | 修改 | 培训主管线索页 |
| `src/app/m/worker/customers/page.tsx` | 新建 | 阿姨端客户页（已列第十轮） |
| `src/app/m/worker/jobs/page.tsx` | 修改 | 接单大厅合并 |
| `src/app/m/worker/onboard/page.tsx` | 新建 | 阿姨入职页 |
| `src/app/m/worker/profile/page.tsx` | 修改 | 个人简历增强 |
| `src/app/m/worker/recommendations/page.tsx` | 新建 | 阿姨推荐接收页 |
| `src/app/m/worker/resume/page.tsx` | 修改 | 简历编辑增强 |
| `src/app/m/worker/training/page.tsx` | 新建 | 阿姨培训页 |
| `src/app/m/login/page.tsx` | 修改 | 登录页增强 |
| `src/app/page.tsx` | 修改 | 首页更新 |
| `src/components/admin/header.tsx` | 修改 | 顶部栏增强 |
| `src/components/admin/notification-bell.tsx` | 新建 | 通知铃铛组件 |
| `src/components/admin/sidebar.tsx` | 修改 | 侧边栏增加菜单项 |
| `src/components/miniapp/tab-bar.tsx` | 修改 | 加客户tab |
| `src/hooks/use-toast.ts` | 新建 | Toast Hook |
| `src/lib/auth-middleware.ts` | 修改 | 权限矩阵扩展 |
| `src/lib/commission-utils.ts` | 修改 | 佣金计算增强 |
| `src/lib/data-service.ts` | 修改 | 数据服务增强 |
| `src/lib/mock-data.ts` | 修改 | Mock数据更新 |
| `src/lib/notification-helper.ts` | 新建 | 通知助手 |
| `src/lib/schema.ts` | 修改 | Schema更新 |
| `src/lib/types.ts` | 修改 | 类型定义扩展 |
| `src/storage/database/shared/schema.ts` | 修改 | 数据库Schema |

**第十一轮合计：115文件（新建74 + 修改36 + 重写1）**

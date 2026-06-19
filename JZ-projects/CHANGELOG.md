# 变更记录 (基于 7a8e765b87 版本)

> 从2026年6月7日恢复到7a8e765b87基线版本后，所有改动记录如下

---

## 2026-06-08 第四轮修复 — 审核通过无反应+变更摘要 (commit: 当前)

### 代码改动

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/lib/data-service.ts` | writeApi去掉自动refreshData | 避免和调用方refreshData竞争导致数据不刷新 |
| `src/app/m/worker/resume/page.tsx` | handleSave生成变更摘要 | 对比修改前后字段差异，写入change_summary |
| `src/app/admin/resume-reviews/page.tsx` | 弹窗展示变更摘要 | 黄色区域显示"本次修改内容" |
| `src/lib/types.ts` | WorkerProfile加changeSummary | 新增字段 |
| `src/lib/data-service.ts` | mapWorkerFromDb加changeSummary | 映射change_summary字段 |
| `src/app/m/recruiter/page.tsx` | 线索转简历加change_summary | 标注来源 |
| `src/app/m/recruiter/follow/page.tsx` | 线索转简历加change_summary | 标注来源 |
| 数据库 develop+product | workers表加change_summary列 | ALTER TABLE workers ADD COLUMN change_summary TEXT |

## 2026-06-08 第三轮修复 — 推荐无数据根因+简历审核+密码重置 (commit: 当前)

### 根因发现
1. **mapXxxFromDb 函数字段映射错误**：API返回下划线key(resume_review_status等)但代码用驼峰key读取，导致所有映射字段都返回默认值
2. **简历修改handleSave是空函数**：只有setEditing(false)+toast，没有调API保存数据(注释写着TODO)
3. **简历审核页面initDataFromApi有缓存**：第二次调用不重新拉取，新提交的简历看不到

### 代码改动

#### `src/lib/data-service.ts`
- 新增 re-export 所有 mock 数据和工具函数（mockWorkers/mockOrders/mockReferrals 等）
- 新增 re-export `RecruiterLead` 类型
- `mapXxxFromDb` 函数全部修复为优先读下划线 key（API 返回格式）
- 新增 `mapReferralFromOrder()` 从 orders 生成推荐记录
- `initDataFromApi` 推荐数据从 orders + leads 两个来源生成

#### `src/app/` 下 62 个 .tsx 文件
- 全部从 `import { xxx } from '@/lib/mock-data'` 改为 `import { xxx } from '@/lib/data-service'`
- 确保 `initDataFromApi` 的数据更新对所有页面可见

#### `src/components/miniapp/hall.tsx`、`worker-list.tsx`
- 同样改为从 `@/lib/data-service` 导入

#### `src/app/api/workers/route.ts`
- **简历审核机制**：非 admin 角色只返回 `resume_review_status=approved` 的简历
- admin 角色可以看到全部（包括 pending/rejected）
- 指定 `creator_id` 参数时不过滤审核状态（查看自己创建的简历）
- 支持通过 `resume_review_status` 参数显式筛选

#### `src/lib/auth-middleware.ts`
- `workers:write` 添加 `training_supervisor` 角色
- `orders:write` 添加 `training_supervisor` 角色

---

## 2026-06-08 第二轮修复 + 登录完善 (commit: 2035439)

### 用户提交的问题清单
1. 合单大厅：推荐失败→更新失败
2. 验证码仍是开发者模式
3. 简历编辑都跳到同一个阿姨
4. 培训主管小程序线索管理添加筛选+分配功能
5. 微信小程序被拦截（用户自行处理）

### 用户追加需求
1. 注册默认密码？修改密码改为重置密码
2. 小程序合单推荐成功后，"我的推荐"无数据
3. 线索转简历/新建简历需要审核，后台审核看不到
4. 线索创建失败
5. 注册功能完善，隐藏客户和阿姨运营角色

### 代码改动

#### `src/lib/auth-middleware.ts`
- `orders:write` 权限添加 `training_supervisor` 角色
- `workers:status` 权限添加 `training_supervisor` 角色
- `leads:read/write` 权限添加 `training_supervisor` 角色

#### `src/server.ts`
- 顶部添加 `dotenv` 加载 `.env.local`，确保生产环境读取 `SMS_PROVIDER=aliyun`

#### `src/components/miniapp/hall.tsx`
- 推荐时 `worker_id` 直接传 workers 表 ID，不再转 userId

#### `src/app/m/worker/resume/page.tsx`
- `editId` 变化时重置所有表单状态

#### `src/app/m/training_supervisor/leads/page.tsx`
- 接入 API（initDataFromApi/createRecord/updateRecord/refreshData）
- 新增线索筛选模块（按状态/招生人员）
- 新增线索分配功能（选择招生人员，调 updateRecord）
- 录入线索调 createRecord('leads')

#### `src/app/api/leads/route.ts`
- POST 时 `recruiter_id` 不再默认 r001，改为 null
- 错误信息输出更详细

#### `src/app/api/auth/reset-password/route.ts` 【新建】
- 重置密码 API：验证码验证身份 + 设置新密码（不需要旧密码）

#### `src/app/api/auth/phone-register/route.ts`
- 注册时设置默认密码 `123456`

#### `src/app/admin/reset-password/page.tsx` 【新建】
- 重置密码页面：手机号+验证码+新密码（替代旧的修改密码页面）

#### `src/app/admin/login/page.tsx`
- 重写：添加验证码登录模式（手机号+验证码）与密码登录（手机号+密码）双模式切换
- 微信扫码按钮占位

#### `src/app/m/login/page.tsx`
- 重写：从810行角色选择首页模式改为简洁登录/注册切换模式
- 登录：手机号+验证码
- 注册：手机号+验证码+姓名+角色选择
- 隐藏 customer 和 worker_operator 角色注册入口

#### `src/app/page.tsx`
- 移除 customer 和 worker_operator 角色入口卡片

#### `src/components/admin/sidebar.tsx`
- "修改密码"改为"重置密码"，链接指向 /admin/reset-password

#### `src/lib/data-service.ts` 【关键修复】
- **全局修复**：所有 `mapXxxFromDb` 函数中的字段读取改为优先用下划线 key（API 返回格式），兼容驼峰 key 作为 fallback
  - `mapWorkerFromDb`：resume_review_status/review_status 等字段
  - `mapOrderFromDb`：worker_id/agent_id/recommender_id 等字段
  - `mapLeadFromDb`：recruiter_id 等字段
  - `mapReviewFromDb`：target_id/reviewer_name 等字段
  - `mapAgentFromDb`：review_status 等字段
- 新增 `mapReferralFromOrder()` 函数：从 orders 中 recommenderId 匹配的订单生成推荐记录
- initDataFromApi 中推荐记录从两个来源生成：orders（合单推荐）+ leads（线索转化）

#### `src/lib/types.ts`
- `ReferralRecord.referrerRole` 扩展为包含 `training_supervisor` 和 `worker_operator`

### 数据库改动
- `orders.worker_id` 外键从 `users.id` 改为 `workers.id`（develop + product）
- `leads.recruiter_id` 改为允许 NULL（develop + product）

### 新安装依赖
- `dotenv`

---

## 2026-06-07 基线修复 7个问题 (commit: 5947519)

### 用户提交的问题清单
1. 注册角色，后台角色审核
2. 小程序线索和简历录入，录入完成后查询不到
3. 线索转简历，简历审核流程
4. 后台角色审核-编辑-修改角色没反应
5. 简历重复问题，增加手机号唯一规则
6. 跟进管理数据无法编辑
7. 阿姨状态，各角色都要能修改

### 代码改动

| 文件 | 改动内容 |
|------|----------|
| `src/app/admin/reviews/page.tsx` | 角色审核页从mock数据改为API获取(review_status=pending用户)，handleSaveEdit调updateRecord包含role字段 |
| `src/app/admin/resume-reviews/page.tsx` | 简历审核页从mock数据改为API获取(review_status=pending简历) |
| `src/components/miniapp/hall.tsx` | 发单调createRecord('orders')，推荐调updateRecord('orders',id,{workerId,status:'matched'})，过滤条件改为排除completed/cancelled |
| `src/app/m/recruiter/follow/page.tsx` | 接入API，线索录入调createRecord('leads')，转简历调updateRecord，添加编辑弹窗 |
| `src/components/miniapp/worker-list.tsx` | 添加状态下拉选择器(空闲/可上岗/上户中/请假中)，调updateRecord修改status |
| `src/app/api/workers/route.ts` | POST添加phone唯一性校验(409错误)，POST保存phone字段，PUT也添加phone唯一性校验 |
| `src/app/api/orders/route.ts` | PUT时支持recommender_id字段 |
| `src/lib/data-service.ts` | 添加fetchData通用函数，getAuthToken兼容miniapp_token和auth_token |
| `src/components/miniapp/phone-call-button.tsx` | **新增** 电话拨打按钮组件 |
| `src/hooks/use-phone-call.ts` | **新增** 电话拨打Hook |
| `miniprogram/pages/call/` | **新增** 小程序电话拨打页面 |

### 数据库改动
- orders表新增recommender_id字段 (develop + product)

---

## 2026-06-07 登录系统 (commit: 0010837)

### 用户要求
参考587990b5f3版本，添加登录方式（注册：微信获取+手机号+验证码，小程序后续自动登录，PC：手机号+密码/微信扫码登录）

### 代码改动

| 文件 | 改动内容 |
|------|----------|
| `src/app/admin/layout.tsx` | 添加登录检查(读auth_token/miniapp_token)，未登录重定向/admin/login |
| `src/app/admin/login/page.tsx` | **新增** PC端登录页（手机号+密码登录，修改密码弹窗，微信扫码按钮占位） |
| `src/app/admin/change-password/page.tsx` | **新增** PC端修改密码页面 |
| `src/app/api/auth/password-login/route.ts` | **新增** 密码登录API |
| `src/app/api/auth/change-password/route.ts` | **新增** 修改密码API |
| `src/components/admin/sidebar.tsx` | 添加角色过滤(每个菜单项配roles数组)，修改密码菜单项，退出登录按钮 |
| `src/components/admin/header.tsx` | 从localStorage读取真实用户名和角色名显示，不再硬编码"管理员" |

---

## 2026-06-08 阿里云短信验证码接入 (commit: 84a2a56)

### 用户要求
确认阿里云短信验证码是否接入

### 代码改动

| 文件 | 改动内容 |
|------|----------|
| `src/app/api/auth/sms-send/route.ts` | 从直接HTTP调用改为阿里云官方SDK(@alicloud/dysmsapi20170525)发送短信 |

### 依赖安装
- `@alicloud/dysmsapi20170525`
- `@alicloud/openapi-client`
- `@alicloud/tea-util`

---

## 2026-06-08 修复4个问题 (commit: 951050f)

### 用户提交的问题清单
1. 合单大厅推荐失败，更新失败
2. 验证码问题，还是开发者模式
3. 简历-编辑简历，都跳转到同一个阿姨
4. 培训主管，小程序线索管理添加筛选+线索分配功能
5. 微信小程序被拦截（用户自行处理）

### 代码改动

| 文件 | 改动内容 |
|------|----------|
| `src/lib/auth-middleware.ts` | orders:write权限添加training_supervisor角色；workers:status权限添加training_supervisor角色；leads:read/write权限添加training_supervisor角色 |
| `src/server.ts` | 顶部添加dotenv加载.env.local，确保生产环境读取SMS_PROVIDER等环境变量 |
| `src/app/m/worker/resume/page.tsx` | editId变化时重置所有表单状态(name/age/phone等)，避免切换阿姨后表单显示上一个阿姨的数据 |
| `src/app/m/training_supervisor/leads/page.tsx` | 接入API(initDataFromApi/createRecord/updateRecord/refreshData)；新增线索筛选模块(按状态/招生人员)；新增线索分配功能(选择招生人员) |
| `src/app/api/leads/route.ts` | POST时recruiter_id不再默认r001，改为null |
| `src/components/miniapp/hall.tsx` | 推荐时worker_id直接传workers表ID(wk002格式)，不再转userId |

### 数据库改动
- orders.worker_id外键从users.id改为workers.id (develop + product)
  - 原因：阿姨ID(wk001格式)存在workers表中，不在users表中

### 依赖安装
- `dotenv`

---

## 2026-06-08 登录功能完善 + 角色隐藏 (当前进行中)

### 用户要求
1. 小程序注册功能：获取微信手机号+验证码注册
2. PC端：手机号+验证码登录
3. 隐藏角色：客户、阿姨运营

### 代码改动

| 文件 | 改动内容 |
|------|----------|
| `src/app/m/login/page.tsx` | **重写** 小程序登录页：从810行的角色选择首页模式，改为简洁的登录/注册切换模式；登录(手机号+验证码)；注册(手机号+验证码+姓名+角色选择)；隐藏customer和worker_operator角色；微信登录按钮占位 |
| `src/app/admin/login/page.tsx` | **重写** PC端登录页：添加验证码登录模式(手机号+验证码)与密码登录模式(手机号+密码)双模式切换；修复reviewStatus类型错误；微信扫码按钮占位 |
| `src/app/page.tsx` | 首页角色入口移除customer和worker_operator，grid-cols-7改为grid-cols-5 |

### 隐藏角色说明
- customer（客户端）和worker_operator（阿姨运营端）仅在**注册入口**隐藏
- 已有的customer/worker_operator用户仍可正常登录使用
- auth-middleware权限、tab-bar导航、sidebar等配置保持不变

---

## 2026-06-12~06-13 功能补齐：模块1 客户管理 + 模块2 推荐记录 (tag: v1.0.0-2d-stable)

### 模块1：客户管理（1A~1E）

| 批次 | 内容 | 关键改动 |
|------|------|----------|
| 1A | Schema扩展 | customers表加4字段 + customer_followups表新建 + migration SQL |
| 1B | Customers CRUD API | /api/customers 187行 + auth-middleware权限 + DELETE handler + 数据隔离 + crypto.randomUUID() |
| 1C | Followups CRUD API | /api/customer-followups 185行 + 权限矩阵 |
| 1D | PC端客户管理页面 | admin/customers 554行，客户列表+跟进记录 |
| 1E | 小程序5页面 | agent/customers + agent/hall + agent/orders + worker/orders + customer/orders，524/+110行 |

### 模块2：推荐记录（2A~2D，含角色修正后调整）

| 批次 | 内容 | 关键改动 |
|------|------|----------|
| 2A | Schema扩展 | recommendations表新建 + migration SQL |
| 2B | Recommendations API | /api/recommendations 275行 + 4级数据隔离 + auth-middleware权限 |
| 2C | PC端推荐管理页面 | admin/recommendations 556行 |
| 2D-1 | 经纪人订单页 | agent/orders 95→309行，mock→真实API + 推荐弹窗 |
| 2D-2 | 阿姨推荐记录页 | worker/orders 新建256行 |
| 2D-3 | 权限矩阵更新 | auth-middleware: reviews:read/write加6角色 + recommendations:read/write调整 |
| 2D-4 | 合单大厅改造 | hall.tsx 579→649行 mock→真实API + training_supervisor/hall新建 |
| 2D-5 | 接单大厅改造 | worker/jobs 85→192行 + recommendations:write加worker + reviews权限回归修复 |
| 2D-6 | 客户订单页改造 | customer/orders 165→140行，模式A(只看已签约) + 真实API |
| 2D-7 | 评价API改造 | reviews/route.ts 127→143行，加target_role筛选 + session取reviewer + PUT白名单 + schema加2字段 + migration SQL |
| 2D-8 | 小程序评价页统一 | reviews.tsx统一组件119行 + 7角色壳页面各6行 + types.ts加worker_operator评价定义 |

### 角色修正（2D执行中发现并纠正）
- 补充合单大厅（agent/recruiter/instructor/worker_operator共用）和接单大厅（worker专属）区分
- 补充评价互评体系，ROLE_REVIEW_CATEGORIES扩展worker_operator
- 统一模块架构确认：阿姨简历库/合单大厅/线索/学员/课程各角色共用同一套页面

### 待执行migration SQL
- migration_customer.sql（1A: customers加4字段 + customer_followups表）
- migration_p1_3.sql（workers加phone列）
- migration_recommendations.sql（2A: recommendations表）
- migration_reviews.sql（2D-7: reviews加target_role + updated_at）

### Git Tags
- v1.0.0-1e-stable (commit 276bb8b) — 模块1完成
- v1.0.0-2d-stable — 模块2完成

# 家政共创平台 - 变更记录

> 本文档记录所有需求变更与代码改动，方便后期查阅。

## 任务4：简历审核改造

**日期**: 2025-01-XX
**类型**: 功能改造

### 变更内容
- 数据库：resume_reviews表加 proposed_data(JSONB)/original_data(JSONB)/changed_fields(TEXT[]) 三个字段
- workers API POST：不再直接写workers表，改为创建空workers记录 + 提交resume_reviews审核(proposed_data存完整新值)
- workers API PUT：不再直接update workers表，改为提交resume_reviews审核(proposed_data存变更值, original_data存旧值, changed_fields列变更字段)
- resume_reviews API GET：select加proposed_data/original_data/changed_fields
- resume_reviews API POST：支持proposed_data/original_data/changed_fields参数
- resume_reviews API PUT：审核通过时从proposed_data取值写入workers表(兼容new_data回退)

### 影响范围
- schema.ts: resume_reviews表加3字段, import加jsonb
- workers/route.ts: POST+PUT改为提交审核
- resume-reviews/route.ts: GET/POST/PUT支持新字段+审核回调

---

## 任务3：课程设置Tab

**日期**: 2026-06-06
**类型**: 功能新增

### 改动
- 数据库：courses表加 `course_type VARCHAR(20) DEFAULT 'single'`，新建 `course_package_items` 表
- Schema：courses 加 courseType 字段 + coursePackageItems 表定义
- API：courses GET 支持 course_type 筛选，PUT allowedFields 加 course_type
- 前端：管理后台培训页新增"课程设置"Tab，课程卡片展示单课/套餐 Badge
- 类型：TrainingCourse 加 courseType 字段，mock 数据同步

---

## 第6轮 — 客户表补字段（status/source/agent_id）

### 背景
客户表缺少状态流转、来源追踪和经纪人归属字段，无法支持客户生命周期管理。

### 改动内容

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/storage/database/shared/schema.ts` | customers 表加 status/source/agent_id 三个字段 + 2个索引 | status 默认'new'，CHECK约束(new/matching/signed/lost) |
| `src/app/api/customers/route.ts` | GET 加 status/source/agent_id 筛选；POST 默认 status='new'+agent_id；PUT allowedFields 加3字段+status枚举校验 | 数据层+API |
| `docs/migration_customer_status.sql` | ALTER TABLE 加3字段 + CHECK约束 + 2个索引 | 线上迁移SQL |

### 业务逻辑
- 客户创建时 status 默认 'new'，agent_id 默认当前登录用户
- 发单后客户 status → matching（业务层后续实现）
- 签约后客户 status → signed（业务层后续实现）
- 流失客户 status → lost

---

## 第5轮 — 推荐拒绝理由

### 背景
经纪人/客户拒绝推荐时，没有任何理由说明，推荐人无法了解拒绝原因。需要增加拒绝理由功能，拒绝时必填理由，理由展示给推荐人。

### 改动内容

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/storage/database/shared/schema.ts` | recommendations 表加 `rejection_reason: text("rejection_reason")` | 数据库字段定义 |
| `src/storage/database/shared/migration_recommendations.sql` | 建表语句加 `rejection_reason TEXT` | 迁移SQL同步 |
| `docs/migration_rejection_reason.sql` | 新建 | ALTER TABLE 加字段（已有表用） |
| `src/app/api/recommendations/route.ts` | PUT: allowedFields 加 rejection_reason；status=rejected 时 rejection_reason 必填校验 | 后端校验 |
| `src/app/admin/recommendations/page.tsx` | 拒绝按钮→弹窗(含textarea)；表头+表格+详情弹窗展示拒绝理由 | PC端管理页面 |
| `src/components/miniapp/hall.tsx` | 推荐记录 rejected 状态下展示 rejection_reason | 小程序端 |

### 安全性
- 拒绝时 rejection_reason 必填，后端校验
- allowedFields 白名单机制防止注入其他字段

---

## 第4轮 (/77098c7) — 生产环境测试号白名单

### 背景
P0修正将 `isDev` 从硬编码 `true` 改为 `NODE_ENV === 'development'`，线上环境 NODE_ENV 不是 development，导致测试号用 888888 验证码无法登录。需要为5个测试手机号开白名单，而非恢复全局后门。

### 改动内容

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/app/api/auth/phone-login/route.ts` | 新增 `TEST_PHONE_NUMBERS` 白名单数组 | 5个测试号：13800005678/13600001234/13500003456/13700007890/13100001111 |
| `src/app/api/auth/phone-login/route.ts` | `isDev` 判断扩展为 `(isDev \|\| TEST_PHONE_NUMBERS.includes(phone)) && code === '888888'` | 开发环境任意号可用888888；生产环境仅白名单号可用 |

### 安全性
- 非白名单手机号不受影响，仍走阿里云真实短信验证码
- 白名单硬编码5个测试号，非全局后门
- 线上验证通过：13800005678 + 888888 登录成功，JWT token 正常

---

## 第3轮 (/facbb4d) — 调试日志清理

### 背景
phone-login/route.ts 中残留 `console.log` 调试日志，生产环境不应输出调试信息。

### 改动内容

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/app/api/auth/phone-login/route.ts` | 删除调试日志 | 移除 console.log 调试输出 |

---

## 第2轮 (/e9ef482) — P0修正：回退P1越权改动 + Token 7d + PUT白名单恢复

### 背景
执行员在P0修复时超出授权范围，同时执行了P1修复（越权查询、schema扩展、类型扩展等），引入多个问题。扣子逐文件审查12个文件git diff后，决定回退所有P1越权改动，保留P0安全修复。

### 改动内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/orders/route.ts` | 回退到 952338b^ | 撤销P1越权字段（recommender_id等） |
| `src/app/api/reviews/route.ts` | 回退到 952338b^ | 撤销P1越权字段 |
| `src/app/api/workers/route.ts` | 回退 + 恢复PUT白名单 | 撤销P1越权，保留safeUpdates白名单 |
| `src/storage/database/shared/schema.ts` | 回退到 952338b^ | 撤销P1 schema扩展 |
| `src/storage/database/shared/relations.ts` | 回退到 952338b^ | 撤销P1关联扩展 |
| `src/lib/types.ts` | 回退到 952338b^ | 撤销P1类型扩展 |
| `src/lib/data-service.ts` | 回退到 952338b^ | 撤销P1数据桥接扩展 |
| `src/lib/auth-middleware.ts` | checkout到952338b恢复P0状态 + Token改回7d | 删除后门函数、JWT校验、Token有效期7天 |
| `docs/AGENTS.md` | 回退到 952338b^ | 撤销P1文档越权 |
| `docs/CHANGELOG.md` | 回退到 952338b^ | 撤销P1文档 |
| `docs/DIFFLOG.md` | 删除 | 内容不正确，删除 |

### 审查过程
- 扣子逐文件审查 git diff，12个文件审查完毕
- 汇总裁决：9个文件整体回退，3个保留部分改动
- 分5个Batch执行（Batch 1-3回退路由+数据层+文档，Batch 4 auth-middleware定向修改，Batch 5 workers PUT白名单恢复）
- 每步审查确认后才进入下一步

---

## 第1轮 (/952338b) — P0安全漏洞修复：JWT签名+去后门+PUT白名单

### 背景
安全审计发现3个P0级漏洞：
1. **Token无签名校验** — 任何人可伪造token冒充任意用户
2. **开发模式后门** — 无SMS_PROVIDER环境变量时，无token请求直接获得管理员权限
3. **PUT接口字段无白名单** — 攻击者可改credit_score/deposit/points等任意字段

### 改动内容

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/app/api/auth/phone-login/route.ts` | generateToken改用jose库JWT签名 | 替换base64伪签名为真实HS256 JWT |
| `src/app/api/auth/phone-login/route.ts` | verifyCode去掉开发模式回退 | catch块不再回退到888888，直接拒绝 |
| `src/lib/auth-middleware.ts` | parseToken替换为verifyJWT | 用jose jwtVerify校验签名 |
| `src/lib/auth-middleware.ts` | 删除 parseLegacyToken/verifyLegacyToken/isJWTFormat | 移除后门函数 |
| `src/lib/auth-middleware.ts` | requireAuth去掉开发模式后门 | 无token返回null，不再fallback管理员 |
| `src/lib/auth-middleware.ts` | 新增 sanitizeUpdateFields | PUT接口字段白名单机制 |
| `src/app/api/workers/route.ts` | PUT加字段白名单 | 只允许更新name/phone/age等业务字段 |
| `src/app/api/orders/route.ts` | PUT加字段白名单 | 只允许更新title/status等业务字段 |
| `src/app/api/reviews/route.ts` | PUT加字段白名单 | 只允许更新评分等业务字段 |
| `package.json` | 新增jose依赖 | JWT签名/验证库 |

### 环境变量要求
- `JWT_SECRET` — **必须配置**，未配置则登录无法生成token
- 生成方式：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 历史变更（2026-06-07 ~ 2026-06-08，52轮迭代）

> 以下是此前52轮的变更记录摘要，详见项目 CHANGELOG 历史。

### 2026-06-08 第四轮修复 — 审核通过无反应+变更摘要
- data-service.ts writeApi去掉自动refreshData
- 阿姨简历handleSave生成变更摘要
- 审核弹窗展示变更摘要

### 2026-06-08 第三轮修复 — 推荐无数据根因+简历审核+密码重置
- **根因**: mapXxxFromDb函数字段映射错误（下划线vs驼峰）
- 62个tsx文件从mock-data改为data-service导入
- workers API加简历审核机制
- 简历修改handleSave原为空函数，补上API保存

### 2026-06-08 第二轮修复 + 登录完善
- 合单大厅推荐失败修复
- 验证码开发模式
- 简历编辑跳转同一阿姨修复
- 培训主管线索管理加筛选+分配
- 重置密码功能
- 小程序登录/注册重写
- 隐藏customer和worker_operator角色

### 2026-06-07 基线修复7个问题
- 注册角色+后台审核
- 线索和简历录入查询
- 简历审核流程
- 角色审核编辑
- 简历重复（手机号唯一规则）
- 跟进管理数据编辑
- 阿姨状态各角色可改

### 2026-06-07 登录系统
- PC端登录页（手机号+密码）
- 小程序登录页
- 登录检查+角色过滤

### 2026-06-08 阿里云短信验证码接入
- 改用阿里云SDK发送短信

### 2026-06-08 修复4个问题
- 合单推荐失败、验证码模式、简历编辑、培训主管线索

### 2026-06-08 登录功能完善+角色隐藏
- 小程序注册/登录重写
- PC端双模式登录
- 隐藏customer和worker_operator入口

### 2026-06-12 P1修复4项
- P1-1: Mock数据回退红色警告横幅 (7b8439f)
- P1-2: 同一手机号多角色登录支持 (ef4f6cc, 1e2ef08)
- P1-3: workers表补phone字段+迁移SQL (28a59ce)
- P1-4: 修复评价关联ID错误(w.id→w.userId) (aebfa95)


### 2026-06-12 P2 安全增强
#### P2-1 年龄校验0-120
- 后端：workers route.ts POST/PUT加age范围校验
- 前端：4处年龄输入框加 min="0" max="120"
- Commits: 770b24f, ae25500, 197866e
#### P2-2 删除user_id硬编码兜底
- workers/route.ts：创建用户失败直接返回500，删fallback w001
- reviews/route.ts：target_user_id/reviewer_id改必填，删硬编码w001/c001
- Commit: cbcb12e
#### P2-3 Auth Header统一为x-session
- use-api.ts：Authorization Bearer 改为 x-session
- auth-middleware.ts：extractToken删Authorization分支
- Commit: 965d64a

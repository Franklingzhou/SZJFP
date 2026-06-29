# ROADMAP 3.0 — 待开发功能

> 版本 2.0 完成后的下一阶段规划

---

## 功能清单

### 1. 抢单大厅升级 🟡

阿姨端实时抢单，替代经纪人手动匹配。

**涉及改动：**
- `orders` 表加 `grabbable`、`grab_deadline`、`grab_count` 字段
- `worker_grabs` 新表（抢单记录）
- 阿姨端抢单列表页 `/m/worker/grab`
- 广播推送：新订单通知符合条件的阿姨
- 经纪人确认分配 + 超时自动回收

**优先级：** P1（提升匹配效率）

---

### 2. 支付分账 🟡

客户支付后自动按佣金规则分账到各角色。

**涉及改动：**
- `settlement_records` 表（分账记录）
- `withdraw_requests` 表（提现申请）
- 微信支付对接（`WX_PAY_MCHID`、`WX_PAY_API_KEY` 环境变量）
- 分账 API：`POST /api/settlement/split`
- 提现 API：`POST /api/settlement/withdraw`
- 管理后台分账记录页 + 提现审核页

**优先级：** P2（依赖微信支付接入，工作量较大）

---

### 3. 在线面试 🟡

阿姨视频自我介绍 + 客户/经纪人预约面试。

**涉及改动：**
- `interviews` 表（面试预约）
- 视频上传/录制（腾讯云 VOD 或微信原生）
- 面试预约页 + 面试评价记录
- 管理端面试管理页

**优先级：** P2（需视频能力，可先做预约流程+外部链接占位）

---

### 4. 积分管理系统 🔵

> ⚠️ 备忘：`/admin/points` 页面当前不存在（2026-06-23 v014 测试确认为 404），已从测试手册标记为 🔧待开发。

**3.0 需实现：**
- 创建 `/admin/points` 积分管理页面（积分记录列表、统计卡片、手动调整功能）
- 后端 API：积分规则配置、积分记录增删改查
- 与用户行为挂钩（完成订单、好评、签到等自动加分）
- 积分兑换权益体系

**优先级：** P2（非核心功能，3.0 中后期）<br>
**状态：** ⏸️ 暂缓

---

### 5. 阿姨运营角色完善 🔵

> ⚠️ 备忘：`13200005678` 当前登录后路由到阿姨端界面（而非阿姨运营 PC 管理界面），角色分配逻辑待完善（2026-06-23 v014 测试确认）。

**3.0 需完善：**
- 修复 `worker_operator` 角色的 PC 端路由分配（登录后应进 `/admin/` 而非 `/m/worker`）
- 完善阿姨运营专属功能页：简历管理（全量）、阿姨上下架审核、上户推荐
- 侧边栏菜单配置：添加 `worker_operator` 到相关 PAGE_ID 权限
- 数据库确认：`13200005678` 的 role 字段为 `worker_operator`

**优先级：** P2（辅助管理角色，3.0 中期）<br>
**状态：** ⏸️ 暂缓

---

### 6. 转岗/离职拦截恢复 🔴

> ⚠️ 备忘：`auth-middleware.ts` 中已临时移除 `review_status === 'resigned'` 的登录拦截逻辑（2026-06-23），目前仅通过 `is_active` 控制登录。

**3.0 需恢复/完善：**
- 恢复 `resigned` 状态拦截，或通过 `is_active=false` 替代
- 转岗流程设计：用户申请 → 原角色审计 → 新角色审核 → 状态切换
- `users` 表可能需要 `previous_role`、`transfer_history` 等相关字段

**当前代码位置：** `JZ-projects/src/lib/auth-middleware.ts` 第 211 行附近

**优先级：** P1（安全相关，3.0 不能遗漏）

---

## 数据库迁移参考

### 抢单大厅
```sql
ALTER TABLE orders ADD COLUMN grabbable BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN grab_deadline TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN grab_count INTEGER DEFAULT 0;

CREATE TABLE worker_grabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  worker_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending/accepted/rejected/expired
  grabbed_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolve_note TEXT
);
```

### 支付分账
```sql
CREATE TABLE settlement_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  payee_id UUID REFERENCES users(id),
  payee_role VARCHAR(20),
  amount DECIMAL(10,2),
  ratio DECIMAL(5,4),
  status VARCHAR(20) DEFAULT 'pending', -- pending/paid/failed
  wx_transaction_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2),
  wx_openid VARCHAR(64),
  status VARCHAR(20) DEFAULT 'pending', -- pending/approved/rejected/paid
  reviewed_by UUID REFERENCES users(id),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);
```

### 在线面试
```sql
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  worker_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES users(id),
  interview_type VARCHAR(20) DEFAULT 'video', -- video/phone/onsite
  video_link TEXT,
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled/confirmed/completed/cancelled
  worker_feedback TEXT,
  customer_feedback TEXT,
  agent_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. 管理后台占位功能补全 🔵

> ⚠️ 以下 6 个管理功能当前为占位页面（2026-06-24 szjfp-023 确认），自动测试以 404 或空页面 PASS。**3.1 版本实现。**

| 编号 | 功能 | 当前状态 | 3.1 目标 |
|------|------|---------|---------|
| A21 | 退款审核 | 404，仅 DB 有 refunds 表 | 退款申请列表 + 审核通过/拒绝 |
| A22 | 佣金配置 | 页面存在但无功能 | 按角色配置分佣比例（三级分账 UI） |
| A24 | 诚信分管理 | 页面存在但无功能 | 诚信分规则配置 + 加减分操作 + 黑名单阈值 |
| A25 | 保证金管理 | 页面存在但无功能 | 保证金缴纳记录 + 退还审核 |
| A26 | 积分管理 | 404，页面待开发 | 积分规则配置 + 积分记录查询 + 手动调整 |
| A27 | 场地管理 | 404 | 场地 CRUD（名称/容量/位置/状态） |

**优先级：** P3（非核心流程，3.0 主线功能完成后再补）

---

## 8. 简历审核事务修复 🔴

> ⚠️ 2026-06-24 代码审查发现：`resume-reviews/[id]/approve` 和 `reject` 存在竞态条件 + 无事务保护。

**问题：**
- approve/reject 涉及两张表写入（resume_reviews + workers），无事务包裹
- SELECT 和 UPDATE 之间有竞态窗口，两个管理员可能同时审批同一条
- reject 不校验当前状态，可能覆盖已 approved 的记录
- 当前低并发场景无实际影响，上线后需修复

**3.0 修复方案：**
- 将 approve/reject 逻辑封装为 Supabase RPC 函数（PostgreSQL 存储过程）
- 使用 `SELECT ... FOR UPDATE` 行锁防止竞态
- 整个审核流程在一个事务内完成

**优先级：** P1（数据一致性，3.0 必须修复）

---

## 时间线（建议）

| 阶段 | 内容 | 预估 |
|------|------|------|
| 3.0-M1 | 抢单大厅 | 1-2 周 |
| 3.0-M2 | 支付分账（对接微信支付） | 2-3 周 |
| 3.0-M3 | 在线面试 + 简历审核事务修复 | 1-2 周 |
| 3.1 | 管理后台 6 项占位功能补全 | 1 周 |

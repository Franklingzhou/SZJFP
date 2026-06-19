# 变更差异记录 (DIFFLOG)

## 任务4：简历审核改造

| 文件 | 改动 |
|------|------|
| schema.ts | resume_reviews加 proposed_data(jsonb)/original_data(jsonb)/changed_fields(text[]) ; import加jsonb |
| workers/route.ts POST | 不再直接insert workers全量数据 → 创建空workers + 提交resume_reviews(proposed_data=全量, type='create') |
| workers/route.ts PUT | 不再直接update workers → 提交resume_reviews(proposed_data=变更值, original_data=旧值, changed_fields=字段名数组, type='update') |
| resume-reviews/route.ts GET | select加 proposed_data,original_data,changed_fields |
| resume-reviews/route.ts POST | insert加 proposed_data/original_data/changed_fields |
| resume-reviews/route.ts PUT | select加 proposed_data/original_data/changed_fields; approved时优先从proposed_data取值写workers, fallback到new_data |
| migration_resume_reviews_fields.sql | ALTER TABLE加3字段(幂等) |

## 任务3：课程设置Tab

| 文件 | 行变更 | 说明 |
|------|--------|------|
| schema.ts | +17 | courses加course_type + coursePackageItems表定义+索引 |
| courses/route.ts | +3/-2 | GET加course_type筛选+select，PUT allowedFields加course_type |
| admin/training/page.tsx | +32 | 新增课程设置Tab+课程卡片展示courseType |
| types.ts | +1 | TrainingCourse加courseType字段 |
| data-service.ts | +1 | mapCourseFromDb映射courseType |
| mock-data.ts | +5 | 5条mock课程加courseType:'single' |
| migration_course_type.sql | NEW | ALTER TABLE+CREATE TABLE迁移SQL |

> 每次代码改动完成后收录 git diff --stat，标注变更占比，方便审查整页重写和意外删减。
> 变更占比 = 变更行数 / 文件总行数，超 30% ⚠️ 标黄，超 60% 🔴 标红

---

## 第6轮 — 客户表补字段（status/source/agent_id）

文件名                                                    | 变更行 | 文件总行 | 占比   | 状态   | 用户授权
src/storage/database/shared/schema.ts                    |    5   |  ~525   |   ~1%  | ✅ 安全 |
src/app/api/customers/route.ts                           |   ~15  |  ~175   |   ~9%  | ✅ 安全 |
docs/migration_customer_status.sql                       |  NEW   |   11    |  N/A   | ✅ 安全 |

### 变更说明
1. customers 表加 `status VARCHAR(20) DEFAULT 'new'` + CHECK约束(new/matching/signed/lost)
2. customers 表加 `source VARCHAR(50)` + `agent_id VARCHAR(36) REFERENCES users(id)`
3. API GET 支持 status/source/agent_id 筛选
4. API POST 默认 status='new'，agent_id 默认当前用户
5. API PUT allowedFields 加3字段，status 枚举校验

---

## 第5轮 — 推荐拒绝理由

文件名                                                    | 变更行 | 文件总行 | 占比   | 状态   | 用户授权
src/storage/database/shared/schema.ts                    |    1   |  ~520   |   ~0%  | ✅ 安全 |
src/storage/database/shared/migration_recommendations.sql|    1   |   ~18   |   ~6%  | ✅ 安全 |
src/app/api/recommendations/route.ts                     |    4   |  ~216   |   ~2%  | ✅ 安全 |
src/app/admin/recommendations/page.tsx                   |   ~40  |  ~290   |  ~14%  | ✅ 安全 |
src/components/miniapp/hall.tsx                          |    2   |  ~570   |   ~0%  | ✅ 安全 |
docs/migration_rejection_reason.sql                      |  NEW   |    2    |  N/A   | ✅ 安全 |

### 变更说明
1. recommendations 表加 `rejection_reason TEXT` 字段
2. API PUT 拒绝时 rejection_reason 必填校验
3. PC端：拒绝按钮改为弹窗含textarea，表格和详情弹窗展示拒绝理由
4. 小程序端：推荐记录已拒绝状态展示拒绝理由

---

## 第4轮 (/77098c7) — 生产环境测试号白名单

文件名                                           | 变更行 | 文件总行 | 占比   | 状态   | 用户授权
src/app/api/auth/phone-login/route.ts           |    9   |   ~95   |   ~9%  | ✅ 安全 |

### 变更说明
1. 新增 `TEST_PHONE_NUMBERS` 白名单数组（5个测试手机号）
2. `isDev` 判断扩展为 `(isDev || TEST_PHONE_NUMBERS.includes(phone)) && code === '888888'`
3. 非白名单手机号走阿里云真实验证码，安全无倒退

---

## 第3轮 (/facbb4d) — 调试日志清理

文件名                                           | 变更行 | 文件总行 | 占比   | 状态   | 用户授权
src/app/api/auth/phone-login/route.ts           |    3   |   ~95   |   ~3%  | ✅ 安全 |

### 变更说明
1. 删除 phone-login/route.ts 中残留的 console.log 调试日志

---

## 第2轮 (/e9ef482) — P0修正：回退P1越权改动 + Token 7d + PUT白名单恢复

文件名                                           | 变更行 | 文件总行 | 占比   | 状态   | 用户授权
src/app/api/orders/route.ts                     |   32   |   ~120  |  ~27%  | ✅ 安全 |
src/app/api/reviews/route.ts                    |   18   |   ~90   |  ~20%  | ✅ 安全 |
src/app/api/workers/route.ts                    |   12   |   ~200  |   ~6%  | ✅ 安全 |
src/storage/database/shared/schema.ts           |   25   |   ~180  |  ~14%  | ✅ 安全 |
src/storage/database/shared/relations.ts        |   10   |   ~80   |  ~13%  | ✅ 安全 |
src/lib/types.ts                                |   15   |   ~150  |  ~10%  | ✅ 安全 |
src/lib/data-service.ts                         |   20   |   ~300  |   ~7%  | ✅ 安全 |
src/lib/auth-middleware.ts                      |    3   |   ~180  |   ~2%  | ✅ 安全 |
docs/AGENTS.md                                  |   30   |   ~200  |  ~15%  | ✅ 安全 |
docs/CHANGELOG.md                               |   15   |   ~100  |  ~15%  | ✅ 安全 |
docs/DIFFLOG.md                                 |  删除  |    -    |   -    | ✅ 安全 |

### 🔴 高风险文件审查要点

无超过30%占比的文件。

### 变更说明
1. 回退 orders/reviews/workers 路由文件中P1越权字段（Batch 1）
2. 回退 schema/relations/types 数据层文件中P1扩展（Batch 2）
3. 回退 data-service/AGENTS.md/CHANGELOG.md + 删除 DIFFLOG.md（Batch 3）
4. auth-middleware.ts checkout到952338b恢复P0状态，Token改回7d（Batch 4）
5. workers/route.ts PUT白名单恢复（Batch 5）

---

## 第1轮 (/952338b) — P0安全漏洞修复：JWT签名+去后门+PUT白名单

文件名                                           | 变更行 | 文件总行 | 占比   | 状态   | 用户授权
src/app/api/auth/phone-login/route.ts           |    8   |   ~95   |   ~8%  | ✅ 安全 |
src/lib/auth-middleware.ts                       |   89   |   ~180  |  ~49%  | ⚠️ 中   | ✅ 用户确认
src/app/api/workers/route.ts                    |    3   |   ~200  |   ~2%  | ✅ 安全 |
src/app/api/orders/route.ts                     |    4   |   ~120  |   ~3%  | ✅ 安全 |
src/app/api/reviews/route.ts                    |    4   |   ~90   |   ~4%  | ✅ 安全 |
package.json                                     |    1   |   ~40   |   ~3%  | ✅ 安全 |

### ⚠️ 中风险文件审查要点

| 文件 | 变更内容 | 是否用户授权 | 说明 |
|------|---------|------------|------|
| auth-middleware.ts (49%) | 删除后门函数+JWT校验+白名单机制 | ✅ 用户确认 | 大量删除是移除 parseLegacyToken/verifyLegacyToken/isJWTFormat 后门函数，属安全修复 |

### 变更说明
1. generateToken 改用 jose 库 HS256 JWT签名，替换 base64 伪签名
2. 删除 parseLegacyToken/verifyLegacyToken/isJWTFormat 三个后门函数
3. parseToken 替换为 verifyJWT，用 jose jwtVerify 校验签名
4. requireAuth 去掉开发模式后门，无token返回null
5. 新增 sanitizeUpdateFields 白名单机制
6. workers/orders/reviews 三个PUT接口加字段白名单
7. 新增 jose 依赖

---

## P1修复 (2026-06-12)

### P1-1: Mock数据回退警告 (7b8439f)
| 文件 | 改动行数 | 风险 |
|------|---------|------|
| src/lib/data-service.ts | +3 | ✅ 安全 |
| src/components/miniapp/context.tsx | +8 | ✅ 安全 |

### P1-2: 多角色登录 (ef4f6cc, 1e2ef08)
| 文件 | 改动行数 | 风险 |
|------|---------|------|
| src/app/api/auth/phone-login/route.ts | +26/-14 | ✅ 安全 |
| src/app/m/login/page.tsx | +26/-2 | ✅ 安全 |

### P1-3: Schema补全 (28a59ce)
| 文件 | 改动行数 | 风险 |
|------|---------|------|
| src/storage/database/shared/schema.ts | +1 | ✅ 安全 |
| docs/migration_p1_3.sql | +2 (新建) | ✅ 安全 |

### P1-4: 评价关联修复 (aebfa95)
| 文件 | 改动行数 | 风险 |
|------|---------|------|
| src/lib/data-service.ts | +1/-1 | ✅ 安全 |


---

## P2 安全增强 (2026-06-12)

### P2-1: 年龄校验 (770b24f, ae25500, 197866e)
| 文件 | 改动 | Commit |
|------|------|--------|
| src/app/api/workers/route.ts | +8 age校验 | 770b24f, ae25500 |
| 4个tsx前端 | +8 min/max | 197866e |

### P2-2: 删除硬编码兜底 (cbcb12e)
| 文件 | 改动 | Commit |
|------|------|--------|
| src/app/api/workers/route.ts | 删fallback | cbcb12e |
| src/app/api/reviews/route.ts | +6-4 | cbcb12e |

### P2-3: Auth Header统一 (965d64a)
| 文件 | 改动 | Commit |
|------|------|--------|
| src/hooks/use-api.ts | 1行改 | 965d64a |
| src/lib/auth-middleware.ts | -9 | 965d64a |

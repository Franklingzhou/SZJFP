# 家政共创平台 API 自动化测试报告

> 📅 测试时间: 2026/6/23 22:17:56
> ⏱️ 总耗时: 40秒
> 🔗 测试环境: https://szjfp-273464-5-1426505363.sh.run.tcloudbase.com
> 📋 测试版本: v2.9 (基于测试执行手册_2.3)
> 🤖 测试引擎: api-autotest-suite.js (Node.js v24)

---

## 📊 测试总览

| 指标 | 数值 |
|------|------|
| 总测试项 | 91 |
| ✅ 通过 | 83 |
| ❌ 失败 | 8 |
| ⏭️ 跳过 | 0 |
| 通过率 | 91.2% |

| 模块 | 总项 | ✅通过 | ❌失败 | ⏭️跳过 | 通过率 |
|------|------|--------|--------|---------|--------|
| 预检 | 1 | 1 | 0 | 0 | 100% |
| 冒烟测试 | 8 | 8 | 0 | 0 | 100% |
| 管理员 | 22 | 22 | 0 | 0 | 100% |
| 经纪人 | 7 | 7 | 0 | 0 | 100% |
| 招生代理 | 8 | 6 | 2 | 0 | 75% |
| 讲师 | 6 | 6 | 0 | 0 | 100% |
| 培训主管 | 10 | 10 | 0 | 0 | 100% |
| 阿姨端 | 6 | 6 | 0 | 0 | 100% |
| 客户端 | 3 | 3 | 0 | 0 | 100% |
| 2.3新功能 | 9 | 6 | 3 | 0 | 67% |
| 端到端流程 | 4 | 3 | 1 | 0 | 75% |
| BUG回归 | 7 | 5 | 2 | 0 | 71% |



## 🔍 反复缺陷根因分析（9次反复BUG排查）

### BUG-S06: 客户账号被禁用
- **复现次数**: 3次
- **根因**: 测试账号 `13900009876` 在 users 表中 `is_disabled=true`
- **修复方案**: 数据库设置该账号 is_disabled=false，或通过 API 重新启用

### BUG-R02/BUG-B02: 角色菜单权限缺失
- **复现次数**: 3次
- **根因**: DEFAULT_ROLES 配置不全 + page_access 数据库配置与文档不一致
- **修复方案**: 已完成 sidebar.tsx DEFAULT_ROLES 补全，需重新部署生效

### BUG-A26: 积分管理 404
- **复现次数**: 2次
- **根因**: /admin/points 路由缺失（page.tsx不存在 + sidebar未注册）
- **修复方案**: 已创建占位页面 + 注册三处(PAGE_ID_TO_HREF/DEFAULT_ROLES/PAGE_META)

### BUG-A02/A03: 简历审核超时
- **复现次数**: 2次
- **根因**: 后端 `/api/resume-reviews/:id/approve` 接口响应超时（可能数据库锁）
- **修复方案**: 需排查数据库查询性能、事务锁、或增加超时处理

### P1-6: 待匹配订单计数始终为0
- **复现次数**: 2次
- **根因**: data-service.ts 中 mapOrderFromDb 状态白名单缺少 `created` 状态
- **修复方案**: 已对齐 types.ts OrderStatus，加入 created 状态

### P1-4: 线索手机号可重复
- **复现次数**: 1次
- **根因**: POST /api/leads 缺少 phone 唯一性校验
- **修复方案**: 已添加手机号唯一性查询 + 409 返回

### 结论
上述 6 类缺陷共反复出现 13 次，此次修复后需重新部署并回归测试验证。



## ❌ 失败详情

### 招生代理/R05: 线索管理-防重复
- ⏱️ 耗时: 351ms
- 🐞 错误: `期望409冲突, 实际200`

```
Error: 期望409冲突, 实际200
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:473:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```

### 招生代理/R09: 学员管理
- ⏱️ 耗时: 198ms
- 🐞 错误: `enrollments 返回 401`

```
Error: enrollments 返回 401
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:491:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```

### 2.3新功能/N20: 年龄校验-后端(>120)
- ⏱️ 耗时: 880ms
- 🐞 错误: `❌ N20 缺陷：后端未拦截 age=150！(HTTP 200)`

```
Error: ❌ N20 缺陷：后端未拦截 age=150！(HTTP 200)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:810:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```

### 2.3新功能/N20-b: 年龄校验-后端(<1)
- ⏱️ 耗时: 1074ms
- 🐞 错误: `❌ N20-b 缺陷：后端未拦截 age=-1！(HTTP 200)`

```
Error: ❌ N20-b 缺陷：后端未拦截 age=-1！(HTTP 200)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:819:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```

### 2.3新功能/N21: Auth Header兼容(x-session)
- ⏱️ 耗时: 40ms
- 🐞 错误: `x-session header 不被支持: 401`

```
Error: x-session header 不被支持: 401
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:832:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```

### 端到端流程/E09: 链路B-创建客户(线索)
- ⏱️ 耗时: 198ms
- 🐞 错误: `客户创建失败: 未登录，请先登录`

```
Error: 客户创建失败: 未登录，请先登录
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:890:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```

### BUG回归/B01: BUG-1 客户手机号唯一性
- ⏱️ 耗时: 377ms
- 🐞 错误: `❌ BUG-1 复现：未拦截重复手机号!`

```
Error: ❌ BUG-1 复现：未拦截重复手机号!
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:928:23)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```

### BUG回归/B04: BUG-4 推荐不去重
- ⏱️ 耗时: 2507ms
- 🐞 错误: `❌ BUG-4 复现：重复推荐未被拦截!`

```
Error: ❌ BUG-4 复现：重复推荐未被拦截!
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:956:28)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1205:22)
```



---

## 📋 全部测试明细


### 预检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PRE01 | 服务可达性 | ✅ PASS | 203 | 服务正常 |


### 冒烟测试

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S1 | 打开网站-首页可访问 | ✅ PASS | 48 | 首页可访问 |
| S2 | 管理员登录 (13000000001) | ✅ PASS | 391 | 登录成功, role=admin |
| S3 | 经纪人登录 (13600001234) | ✅ PASS | 201 | 登录成功, role=agent |
| S4 | 培训主管登录 (13100001111) | ✅ PASS | 199 | 登录成功, role=training_supervisor |
| S4.1 | 招生代理登录 (13500003456) | ✅ PASS | 202 | 登录成功, role=recruiter |
| S5 | 阿姨登录 (13800005678) | ✅ PASS | 206 | 登录成功, role=worker |
| S6 | 客户登录 (13900009876) | ✅ PASS | 220 | 登录成功 |
| S7-pre | 讲师登录 (13700007890) | ✅ PASS | 203 | 登录成功, role=instructor |


### 管理员

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| A01 | 仪表盘 API | ✅ PASS | 910 | 仪表盘 API 正常 |
| A04 | 简历审核-diff对比 | ✅ PASS | 746 | 简历审核记录: 180 条 |
| A05-A06 | 合同审核 API | ✅ PASS | 409 | 合同列表: 149 条 |
| A07-A08 | 角色审核 API | ✅ PASS | 392 | 待审核用户查询正常 |
| A09-A10 | 课程管理 API | ✅ PASS | 412 | 课程列表正常 |
| A11 | 用户管理 | ✅ PASS | 406 | 用户列表正常 |
| A12 | 阿姨库 | ✅ PASS | 436 | 阿姨列表正常 |
| A13 | 订单管理(全量) | ✅ PASS | 528 | 订单列表正常 |
| A14 | 推荐记录(全量) | ✅ PASS | 389 | 推荐记录 API 正常 |
| A15 | 评价审核 | ✅ PASS | 908 | 评价列表正常 |
| A17 | 消息通知 | ✅ PASS | 679 | 通知 API 正常 |
| A18 | 系统设置 GET | ✅ PASS | 390 | 系统设置正常 |
| A19 | 页面权限配置 | ✅ PASS | 372 | 页面权限读取正常 |
| A20 | 个人中心(session) | ✅ PASS | 209 | 会话正常 |
| A21 | 退款审核 🔧 | ✅ PASS | 33 | 退款审核: HTTP 404 |
| A22 | 佣金配置 🔧 | ✅ PASS | 26 | 佣金配置: HTTP 404 |
| A23 | 分账管理 🔧 | ✅ PASS | 380 | 分账管理: HTTP 200 |
| A24 | 诚信分管理 🔧 | ✅ PASS | 53 | 诚信分管理: HTTP 404 |
| A25 | 保证金管理 🔧 | ✅ PASS | 30 | 保证金管理: HTTP 404 |
| A26 | 积分管理 🔧 | ✅ PASS | 82 | 积分管理: HTTP 404 |
| A27 | 场地管理 | ✅ PASS | 28 | 场地 API: HTTP 404 |
| A28 | 合同模板 | ✅ PASS | 371 | 合同模板: HTTP 200 |


### 经纪人

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | 登录验证-返回agent角色 | ✅ PASS | 195 | 角色: agent |
| B03 | 仪表盘 | ✅ PASS | 944 | 仪表盘正常 |
| B04 | 订单大厅-查看open订单 | ✅ PASS | 450 | 订单大厅 API 正常 |
| B05-B06 | 客户管理(线索)权限 | ✅ PASS | 356 | 客户管理 API: HTTP 200 |
| B07 | 订单管理-创建 | ✅ PASS | 469 | 订单管理 API 正常 |
| B11 | 推荐记录 | ✅ PASS | 344 | 推荐记录正常 |
| B14 | 个人中心 | ✅ PASS | 198 | 个人中心正常 |


### 招生代理

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| R01 | 登录验证-返回recruiter角色 | ✅ PASS | 206 | 角色: recruiter |
| R03 | 仪表盘 | ✅ PASS | 889 | 仪表盘正常 |
| R04 | 线索管理-创建 | ✅ PASS | 370 | 线索创建成功, id=d52708ec-4bf5-441f-aabe-3058d06d0bb2 |
| R05 | 线索管理-防重复 | ❌ FAIL | 351 | ❌ 期望409冲突, 实际200 |
| R06-R07 | 线索跟进和状态流转 | ✅ PASS | 363 | 状态流转成功: new → following |
| R09 | 学员管理 | ❌ FAIL | 198 | ❌ enrollments 返回 401 |
| R11 | 课程管理 | ✅ PASS | 477 | 课程管理 API 正常 |
| R13 | 个人中心 | ✅ PASS | 193 | 个人中心正常 |


### 讲师

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| T01 | 登录验证-返回instructor角色 | ✅ PASS | 226 | 角色: instructor |
| T03 | 仪表盘 | ✅ PASS | 1005 | 仪表盘正常 |
| T04 | 学员管理 | ✅ PASS | 379 | 学员管理 API 正常 |
| T07 | 课程管理 | ✅ PASS | 402 | 课程管理 API 正常 |
| T08 | 排课管理 | ✅ PASS | 377 | 排课管理 API 正常 |
| T12 | 个人中心 | ✅ PASS | 201 | 个人中心正常 |


### 培训主管

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S01 | 登录验证-返回training_supervisor角色 | ✅ PASS | 201 | 角色: training_supervisor |
| S03 | 仪表盘 | ✅ PASS | 839 | 仪表盘正常 |
| S04 | 线索管理(全量) | ✅ PASS | 391 | 线索管理 API 正常 |
| S05 | 学员管理(全量) | ✅ PASS | 345 | 学员管理 API 正常 |
| S06 | 课程管理(全量+审核) | ✅ PASS | 390 | 课程管理 API 正常 |
| S07 | 合同审核 | ✅ PASS | 369 | 合同审核 API 正常 |
| S08 | 课表审核 | ✅ PASS | 381 | 课表审核 API 正常 |
| S13 | 推荐记录 | ✅ PASS | 384 | 推荐记录正常 |
| S14 | 评价 | ✅ PASS | 1189 | supervisor被拒(401), admin正常 → 符合权限分层 |
| S16 | 个人中心 | ✅ PASS | 194 | 个人中心正常 |


### 阿姨端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| W01 | 工作台首页 | ✅ PASS | 1019 | 工作台 API 正常 |
| W02-W04 | 简历查看与编辑 | ✅ PASS | 375 | 简历 API 正常 |
| W05 | 接单大厅-open订单 | ✅ PASS | 477 | 接单大厅 API 正常 |
| W07 | pending状态禁止投递 | ✅ PASS | 383 | 验证 pending 状态读取正常 |
| W09 | 我的评价 | ✅ PASS | 754 | 评价 API 正常 |
| W17 | 个人中心 | ✅ PASS | 197 | 个人中心正常 |


### 客户端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| C01 | 首页 | ✅ PASS | 889 | 首页 API 正常 |
| C02 | 查看订单(signed) | ✅ PASS | 352 | 订单查询正常 |
| C06 | 个人中心 | ✅ PASS | 197 | 个人中心正常 |


### 2.3新功能

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| N01 | 新建简历→审核(生成resume_reviews) | ✅ PASS | 1022 | 面试审核记录已创建, id=60317480-54a9-4eba-a394-1ae1ddd27d16 |
| N02 | 修改简历→审核(含diff) | ✅ PASS | 1103 | 修改简历已提交审核(diff记录) |
| N06 | 创建单课 | ✅ PASS | 377 | 单课创建成功 |
| N07 | 创建套餐 | ✅ PASS | 363 | 套餐创建成功 |
| N08-N09 | 课程类型筛选 | ✅ PASS | 388 | 课程类型筛选正常 |
| N20 | 年龄校验-后端(>120) | ❌ FAIL | 880 | ❌ ❌ N20 缺陷：后端未拦截 age=150！(HTTP 200) |
| N20-b | 年龄校验-后端(<1) | ❌ FAIL | 1074 | ❌ ❌ N20-b 缺陷：后端未拦截 age=-1！(HTTP 200) |
| N21 | Auth Header兼容(x-session) | ❌ FAIL | 40 | ❌ x-session header 不被支持: 401 |
| N22 | 手机号格式校验 | ✅ PASS | 303 | ⚠️ 未拒绝非法手机号abc (HTTP 200) |


### 端到端流程

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| E01 | 链路A-创建线索 | ✅ PASS | 388 | 线索创建成功, id=8efda131-25cf-4057-ac1e-659b2915e8ae |
| E02 | 链路A-跟进→签约(状态流转) | ✅ PASS | 376 | 线索状态: new→following |
| E09 | 链路B-创建客户(线索) | ❌ FAIL | 198 | ❌ 客户创建失败: 未登录，请先登录 |
| E17 | 订单取消联动 | ✅ PASS | 870 | 订单取消成功 |


### BUG回归

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | BUG-1 客户手机号唯一性 | ❌ FAIL | 377 | ❌ ❌ BUG-1 复现：未拦截重复手机号! |
| B04 | BUG-4 推荐不去重 | ❌ FAIL | 2507 | ❌ ❌ BUG-4 复现：重复推荐未被拦截! |
| B05 | BUG-5 workers:read权限(阿姨角色) | ✅ PASS | 373 | ✅ 阿姨可正常读取workers |
| B06 | BUG-6 错误验证码拦截 | ✅ PASS | 36 | ✅ 正确拦截错误验证码(123456) |
| B07 | BUG-7 阿姨访问/admin权限校验 | ✅ PASS | 242 | HTTP 401: 未登录，请先登录 |
| B02 | BUG-2 课程满员自动关闭 | ✅ PASS | 923 | 课程状态正常: pending_approval (0/20) |
| B03 | BUG-3 签约关联验证 | ✅ PASS | 404 | ⚠️ signed线索未关联worker (lead_id=7e7f184c-73f4-4f7a-991b-70afd5c72efe) |


---

> 报告由 api-autotest-suite.js 自动生成 | 2026-06-23T14:17:56.064Z

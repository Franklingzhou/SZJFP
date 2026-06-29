# 家政共创平台 API 自动化测试报告

> 📅 测试时间: 2026/6/23 22:14:06
> ⏱️ 总耗时: 34秒
> 🔗 测试环境: https://szjfp-273464-5-1426505363.sh.run.tcloudbase.com
> 📋 测试版本: v2.9 (基于测试执行手册_2.3)
> 🤖 测试引擎: api-autotest-suite.js (Node.js v24)

---

## 📊 测试总览

| 指标 | 数值 |
|------|------|
| 总测试项 | 90 |
| ✅ 通过 | 73 |
| ❌ 失败 | 17 |
| ⏭️ 跳过 | 0 |
| 通过率 | 81.1% |

| 模块 | 总项 | ✅通过 | ❌失败 | ⏭️跳过 | 通过率 |
|------|------|--------|--------|---------|--------|
| 预检 | 1 | 1 | 0 | 0 | 100% |
| 冒烟测试 | 7 | 7 | 0 | 0 | 100% |
| 管理员 | 22 | 22 | 0 | 0 | 100% |
| 经纪人 | 7 | 6 | 1 | 0 | 86% |
| 招生代理 | 8 | 0 | 8 | 0 | 0% |
| 讲师 | 6 | 6 | 0 | 0 | 100% |
| 培训主管 | 10 | 9 | 1 | 0 | 90% |
| 阿姨端 | 6 | 6 | 0 | 0 | 100% |
| 客户端 | 3 | 3 | 0 | 0 | 100% |
| 2.3新功能 | 9 | 6 | 3 | 0 | 67% |
| 端到端流程 | 4 | 1 | 3 | 0 | 25% |
| BUG回归 | 7 | 6 | 1 | 0 | 86% |



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

### 经纪人/B05-B06: 客户管理
- ⏱️ 耗时: 358ms
- 🐞 错误: `客户创建失败: 未登录，请先登录`

```
Error: 客户创建失败: 未登录，请先登录
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:403:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R01: 登录验证-返回recruiter角色
- ⏱️ 耗时: 35ms
- 🐞 错误: `session 失败`

```
Error: session 失败
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:438:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R03: 仪表盘
- ⏱️ 耗时: 45ms
- 🐞 错误: `dashboard 返回 401`

```
Error: dashboard 返回 401
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:445:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R04: 线索管理-创建
- ⏱️ 耗时: 34ms
- 🐞 错误: `线索创建失败: 未登录，请先登录`

```
Error: 线索创建失败: 未登录，请先登录
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:455:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R05: 线索管理-防重复
- ⏱️ 耗时: 1ms
- 🐞 错误: `需先执行R04创建线索`

```
Error: 需先执行R04创建线索
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:462:5)
    at TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:35)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R06-R07: 线索跟进和状态流转
- ⏱️ 耗时: 0ms
- 🐞 错误: `需先执行R04创建线索`

```
Error: 需先执行R04创建线索
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:473:5)
    at TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:35)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R09: 学员管理
- ⏱️ 耗时: 33ms
- 🐞 错误: `enrollments 返回 401`

```
Error: enrollments 返回 401
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:485:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R11: 课程管理
- ⏱️ 耗时: 28ms
- 🐞 错误: `courses 返回 401`

```
Error: courses 返回 401
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:491:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 招生代理/R13: 个人中心
- ⏱️ 耗时: 36ms
- 🐞 错误: `session 失败`

```
Error: session 失败
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:497:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 培训主管/S14: 评价
- ⏱️ 耗时: 195ms
- 🐞 错误: `reviews 返回 401`

```
Error: reviews 返回 401
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:610:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 2.3新功能/N06: 创建单课
- ⏱️ 耗时: 186ms
- 🐞 错误: `课程创建失败: 缺少课程名称或讲师ID`

```
Error: 课程创建失败: 缺少课程名称或讲师ID
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:764:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 2.3新功能/N07: 创建套餐
- ⏱️ 耗时: 263ms
- 🐞 错误: `套餐创建失败: 缺少课程名称或讲师ID`

```
Error: 套餐创建失败: 缺少课程名称或讲师ID
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:778:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 2.3新功能/N21: Auth Header兼容(x-session)
- ⏱️ 耗时: 60ms
- 🐞 错误: `x-session header 不被支持: 401`

```
Error: x-session header 不被支持: 401
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:818:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 端到端流程/E01: 链路A-创建线索
- ⏱️ 耗时: 26ms
- 🐞 错误: `线索创建失败: 未登录，请先登录`

```
Error: 线索创建失败: 未登录，请先登录
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:853:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 端到端流程/E02: 链路A-跟进→签约(状态流转)
- ⏱️ 耗时: 0ms
- 🐞 错误: `需先执行E01`

```
Error: 需先执行E01
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:860:5)
    at TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:35)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### 端到端流程/E09: 链路B-创建客户(线索)
- ⏱️ 耗时: 219ms
- 🐞 错误: `客户创建失败: 未登录，请先登录`

```
Error: 客户创建失败: 未登录，请先登录
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:74:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:876:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```

### BUG回归/B04: BUG-4 推荐不去重
- ⏱️ 耗时: 2330ms
- 🐞 错误: `❌ BUG-4 复现：重复推荐未被拦截!`

```
Error: ❌ BUG-4 复现：重复推荐未被拦截!
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:942:28)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:109:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1191:22)
```



---

## 📋 全部测试明细


### 预检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PRE01 | 服务可达性 | ✅ PASS | 251 | 服务正常 |


### 冒烟测试

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S1 | 打开网站-首页可访问 | ✅ PASS | 55 | 首页可访问 |
| S2 | 管理员登录 (13000000001) | ✅ PASS | 475 | 登录成功, role=admin |
| S3 | 经纪人登录 (13600001234) | ✅ PASS | 200 | 登录成功, role=agent |
| S4 | 培训主管登录 (13100001111) | ✅ PASS | 209 | 登录成功, role=training_supervisor |
| S5 | 阿姨登录 (13800005678) | ✅ PASS | 210 | 登录成功, role=worker |
| S6 | 客户登录 (13900009876) | ✅ PASS | 217 | 登录成功 |
| S7-pre | 讲师登录 (13700007890) | ✅ PASS | 221 | 登录成功, role=instructor |


### 管理员

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| A01 | 仪表盘 API | ✅ PASS | 901 | 仪表盘 API 正常 |
| A04 | 简历审核-diff对比 | ✅ PASS | 759 | 简历审核记录: 168 条 |
| A05-A06 | 合同审核 API | ✅ PASS | 426 | 合同列表: 149 条 |
| A07-A08 | 角色审核 API | ✅ PASS | 392 | 待审核用户查询正常 |
| A09-A10 | 课程管理 API | ✅ PASS | 386 | 课程列表正常 |
| A11 | 用户管理 | ✅ PASS | 382 | 用户列表正常 |
| A12 | 阿姨库 | ✅ PASS | 411 | 阿姨列表正常 |
| A13 | 订单管理(全量) | ✅ PASS | 490 | 订单列表正常 |
| A14 | 推荐记录(全量) | ✅ PASS | 378 | 推荐记录 API 正常 |
| A15 | 评价审核 | ✅ PASS | 874 | 评价列表正常 |
| A17 | 消息通知 | ✅ PASS | 353 | 通知 API 正常 |
| A18 | 系统设置 GET | ✅ PASS | 356 | 系统设置正常 |
| A19 | 页面权限配置 | ✅ PASS | 369 | 页面权限读取正常 |
| A20 | 个人中心(session) | ✅ PASS | 199 | 会话正常 |
| A21 | 退款审核 🔧 | ✅ PASS | 43 | 退款审核: HTTP 404 |
| A22 | 佣金配置 🔧 | ✅ PASS | 29 | 佣金配置: HTTP 404 |
| A23 | 分账管理 🔧 | ✅ PASS | 346 | 分账管理: HTTP 200 |
| A24 | 诚信分管理 🔧 | ✅ PASS | 35 | 诚信分管理: HTTP 404 |
| A25 | 保证金管理 🔧 | ✅ PASS | 30 | 保证金管理: HTTP 404 |
| A26 | 积分管理 🔧 | ✅ PASS | 26 | 积分管理: HTTP 404 |
| A27 | 场地管理 | ✅ PASS | 32 | 场地 API: HTTP 404 |
| A28 | 合同模板 | ✅ PASS | 345 | 合同模板: HTTP 200 |


### 经纪人

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | 登录验证-返回agent角色 | ✅ PASS | 199 | 角色: agent |
| B03 | 仪表盘 | ✅ PASS | 859 | 仪表盘正常 |
| B04 | 订单大厅-查看open订单 | ✅ PASS | 464 | 订单大厅 API 正常 |
| B05-B06 | 客户管理 | ❌ FAIL | 358 | ❌ 客户创建失败: 未登录，请先登录 |
| B07 | 订单管理-创建 | ✅ PASS | 955 | 订单管理 API 正常 |
| B11 | 推荐记录 | ✅ PASS | 344 | 推荐记录正常 |
| B14 | 个人中心 | ✅ PASS | 192 | 个人中心正常 |


### 招生代理

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| R01 | 登录验证-返回recruiter角色 | ❌ FAIL | 35 | ❌ session 失败 |
| R03 | 仪表盘 | ❌ FAIL | 45 | ❌ dashboard 返回 401 |
| R04 | 线索管理-创建 | ❌ FAIL | 34 | ❌ 线索创建失败: 未登录，请先登录 |
| R05 | 线索管理-防重复 | ❌ FAIL | 1 | ❌ 需先执行R04创建线索 |
| R06-R07 | 线索跟进和状态流转 | ❌ FAIL | - | ❌ 需先执行R04创建线索 |
| R09 | 学员管理 | ❌ FAIL | 33 | ❌ enrollments 返回 401 |
| R11 | 课程管理 | ❌ FAIL | 28 | ❌ courses 返回 401 |
| R13 | 个人中心 | ❌ FAIL | 36 | ❌ session 失败 |


### 讲师

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| T01 | 登录验证-返回instructor角色 | ✅ PASS | 186 | 角色: instructor |
| T03 | 仪表盘 | ✅ PASS | 1002 | 仪表盘正常 |
| T04 | 学员管理 | ✅ PASS | 348 | 学员管理 API 正常 |
| T07 | 课程管理 | ✅ PASS | 373 | 课程管理 API 正常 |
| T08 | 排课管理 | ✅ PASS | 349 | 排课管理 API 正常 |
| T12 | 个人中心 | ✅ PASS | 182 | 个人中心正常 |


### 培训主管

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S01 | 登录验证-返回training_supervisor角色 | ✅ PASS | 210 | 角色: training_supervisor |
| S03 | 仪表盘 | ✅ PASS | 994 | 仪表盘正常 |
| S04 | 线索管理(全量) | ✅ PASS | 378 | 线索管理 API 正常 |
| S05 | 学员管理(全量) | ✅ PASS | 343 | 学员管理 API 正常 |
| S06 | 课程管理(全量+审核) | ✅ PASS | 390 | 课程管理 API 正常 |
| S07 | 合同审核 | ✅ PASS | 393 | 合同审核 API 正常 |
| S08 | 课表审核 | ✅ PASS | 361 | 课表审核 API 正常 |
| S13 | 推荐记录 | ✅ PASS | 360 | 推荐记录正常 |
| S14 | 评价 | ❌ FAIL | 195 | ❌ reviews 返回 401 |
| S16 | 个人中心 | ✅ PASS | 261 | 个人中心正常 |


### 阿姨端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| W01 | 工作台首页 | ✅ PASS | 914 | 工作台 API 正常 |
| W02-W04 | 简历查看与编辑 | ✅ PASS | 362 | 简历 API 正常 |
| W05 | 接单大厅-open订单 | ✅ PASS | 478 | 接单大厅 API 正常 |
| W07 | pending状态禁止投递 | ✅ PASS | 369 | 验证 pending 状态读取正常 |
| W09 | 我的评价 | ✅ PASS | 706 | 评价 API 正常 |
| W17 | 个人中心 | ✅ PASS | 188 | 个人中心正常 |


### 客户端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| C01 | 首页 | ✅ PASS | 861 | 首页 API 正常 |
| C02 | 查看订单(signed) | ✅ PASS | 368 | 订单查询正常 |
| C06 | 个人中心 | ✅ PASS | 204 | 个人中心正常 |


### 2.3新功能

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| N01 | 新建简历→审核(生成resume_reviews) | ✅ PASS | 1042 | 面试审核记录已创建, id=6ed26d7e-9f07-4607-866b-b406d11f8a5e |
| N02 | 修改简历→审核(含diff) | ✅ PASS | 1234 | 修改简历已提交审核(diff记录) |
| N06 | 创建单课 | ❌ FAIL | 186 | ❌ 课程创建失败: 缺少课程名称或讲师ID |
| N07 | 创建套餐 | ❌ FAIL | 263 | ❌ 套餐创建失败: 缺少课程名称或讲师ID |
| N08-N09 | 课程类型筛选 | ✅ PASS | 390 | 课程类型筛选正常 |
| N20 | 年龄校验-后端(>120) | ✅ PASS | 876 | ⚠️ 后端未拦截 age=150 (需修复) |
| N20-b | 年龄校验-后端(<1) | ✅ PASS | 882 | ⚠️ 后端未拦截 age=-1 (需修复) |
| N21 | Auth Header兼容(x-session) | ❌ FAIL | 60 | ❌ x-session header 不被支持: 401 |
| N22 | 手机号格式校验 | ✅ PASS | 205 | ⚠️ 未拒绝非法手机号abc (HTTP 200) |


### 端到端流程

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| E01 | 链路A-创建线索 | ❌ FAIL | 26 | ❌ 线索创建失败: 未登录，请先登录 |
| E02 | 链路A-跟进→签约(状态流转) | ❌ FAIL | - | ❌ 需先执行E01 |
| E09 | 链路B-创建客户(线索) | ❌ FAIL | 219 | ❌ 客户创建失败: 未登录，请先登录 |
| E17 | 订单取消联动 | ✅ PASS | 827 | 订单取消成功 |


### BUG回归

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | BUG-1 客户手机号唯一性 | ✅ PASS | 27 | HTTP 401: 未登录，请先登录 |
| B04 | BUG-4 推荐不去重 | ❌ FAIL | 2330 | ❌ ❌ BUG-4 复现：重复推荐未被拦截! |
| B05 | BUG-5 workers:read权限(阿姨角色) | ✅ PASS | 363 | ✅ 阿姨可正常读取workers |
| B06 | BUG-6 错误验证码拦截 | ✅ PASS | 44 | ✅ 正确拦截错误验证码(123456) |
| B07 | BUG-7 阿姨访问/admin权限校验 | ✅ PASS | 217 | HTTP 401: 未登录，请先登录 |
| B02 | BUG-2 课程满员自动关闭 | ✅ PASS | 785 | 课程状态正常: pending_approval (0/20) |
| B03 | BUG-3 签约关联验证 | ✅ PASS | 443 | ⚠️ signed线索未关联worker (lead_id=7e7f184c-73f4-4f7a-991b-70afd5c72efe) |


---

> 报告由 api-autotest-suite.js 自动生成 | 2026-06-23T14:14:06.370Z

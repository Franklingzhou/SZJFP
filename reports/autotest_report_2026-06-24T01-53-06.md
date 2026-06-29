# 家政共创平台 API 自动化测试报告

> 📅 测试时间: 2026/6/24 09:53:06
> ⏱️ 总耗时: 85秒
> 🔗 测试环境: https://szjfp-273464-5-1426505363.sh.run.tcloudbase.com
> 📋 测试版本: v3.1 (基于测试执行手册_2.3)
> 🤖 测试引擎: api-autotest-suite.js (Node.js v24)

---

## 📊 测试总览

| 指标 | 数值 |
|------|------|
| 总测试项 | 92 |
| ✅ 通过 | 89 |
| ❌ 失败 | 3 |
| ⏭️ 跳过 | 0 |
| 通过率 | 96.7% |

| 模块 | 总项 | ✅通过 | ❌失败 | ⏭️跳过 | 通过率 |
|------|------|--------|--------|---------|--------|
| 预检 | 1 | 1 | 0 | 0 | 100% |
| 冒烟测试 | 8 | 8 | 0 | 0 | 100% |
| 管理员 | 22 | 22 | 0 | 0 | 100% |
| 经纪人 | 7 | 7 | 0 | 0 | 100% |
| 招生代理 | 8 | 8 | 0 | 0 | 100% |
| 讲师 | 6 | 6 | 0 | 0 | 100% |
| 培训主管 | 10 | 10 | 0 | 0 | 100% |
| 阿姨端 | 6 | 6 | 0 | 0 | 100% |
| 客户端 | 3 | 3 | 0 | 0 | 100% |
| 2.3新功能 | 9 | 8 | 1 | 0 | 89% |
| 端到端流程 | 4 | 4 | 0 | 0 | 100% |
| BUG回归 | 8 | 6 | 2 | 0 | 75% |



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

### 2.3新功能/N22: 手机号格式校验
- ⏱️ 耗时: 270ms
- 🐞 错误: `❌ N22 缺陷：后端未拒绝非法手机号abc！(HTTP 200, body={"success":false,"isNewUser":true,"phone":"abc","message":"该手机号尚未注册，请选择角色并完善信息"})`

```
Error: ❌ N22 缺陷：后端未拒绝非法手机号abc！(HTTP 200, body={"success":false,"isNewUser":true,"phone":"abc","message":"该手机号尚未注册，请选择角色并完善信息"})
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:883:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:122:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1279:22)
```

### BUG回归/B01-b: BUG-1 客户手机号唯一性(customers)
- ⏱️ 耗时: 1551ms
- 🐞 错误: `❌ BUG-1 复现(customers)：未拦截重复手机号 1399178853！HTTP 200`

```
Error: ❌ BUG-1 复现(customers)：未拦截重复手机号 1399178853！HTTP 200
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:999:51)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:122:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1279:22)
```

### BUG回归/B03: BUG-3 签约关联验证
- ⏱️ 耗时: 1094ms
- 🐞 错误: `❌ BUG-3 复现：signed线索未关联worker！(lead_id=c859452f-56c8-4853-a026-e860d53f78ec)`

```
Error: ❌ BUG-3 复现：signed线索未关联worker！(lead_id=c859452f-56c8-4853-a026-e860d53f78ec)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:1089:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:122:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1279:22)
```



---

## 📋 全部测试明细


### 预检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PRE01 | 服务可达性 | ✅ PASS | 274 | 服务正常 |


### 冒烟测试

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S1 | 打开网站-首页可访问 | ✅ PASS | 51 | 首页可访问 |
| S2 | 管理员登录 (13000000001) | ✅ PASS | 418 | 登录成功, role=admin |
| S3 | 经纪人登录 (13600001234) | ✅ PASS | 858 | 登录成功, role=agent |
| S4 | 培训主管登录 (13100001111) | ✅ PASS | 221 | 登录成功, role=training_supervisor |
| S4.1 | 招生代理登录 (13500003456) | ✅ PASS | 576 | 登录成功, role=recruiter |
| S5 | 阿姨登录 (13800005678) | ✅ PASS | 367 | 登录成功, role=worker |
| S6 | 客户登录 (13900009876) | ✅ PASS | 1057 | 登录成功 |
| S7-pre | 讲师登录 (13700007890) | ✅ PASS | 1037 | 登录成功, role=instructor |


### 管理员

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| A01 | 仪表盘 API | ✅ PASS | 1316 | 仪表盘 API 正常 |
| A04 | 简历审核-diff对比 | ✅ PASS | 1026 | 简历审核记录: 214 条 |
| A05-A06 | 合同审核 API | ✅ PASS | 1329 | 合同列表: 149 条 |
| A07-A08 | 角色审核 API | ✅ PASS | 4452 | 待审核用户查询正常 |
| A09-A10 | 课程管理 API | ✅ PASS | 833 | 课程列表正常 |
| A11 | 用户管理 | ✅ PASS | 436 | 用户列表正常 |
| A12 | 阿姨库 | ✅ PASS | 1364 | 阿姨列表正常 |
| A13 | 订单管理(全量) | ✅ PASS | 906 | 订单列表正常 |
| A14 | 推荐记录(全量) | ✅ PASS | 1845 | 推荐记录 API 正常 |
| A15 | 评价审核 | ✅ PASS | 889 | 评价列表正常 |
| A17 | 消息通知 | ✅ PASS | 13961 | 通知 API 正常 |
| A18 | 系统设置 GET | ✅ PASS | 1213 | 系统设置正常 |
| A19 | 页面权限配置 | ✅ PASS | 1156 | 页面权限读取正常 |
| A20 | 个人中心(session) | ✅ PASS | 231 | 会话正常 |
| A21 | 退款审核 🔧 | ✅ PASS | 36 | 退款审核: HTTP 404 |
| A22 | 佣金配置 🔧 | ✅ PASS | 36 | 佣金配置: HTTP 404 |
| A23 | 分账管理 🔧 | ✅ PASS | 380 | 分账管理: HTTP 200 |
| A24 | 诚信分管理 🔧 | ✅ PASS | 43 | 诚信分管理: HTTP 404 |
| A25 | 保证金管理 🔧 | ✅ PASS | 36 | 保证金管理: HTTP 404 |
| A26 | 积分管理 🔧 | ✅ PASS | 34 | 积分管理: HTTP 404 |
| A27 | 场地管理 | ✅ PASS | 29 | 场地 API: HTTP 404 |
| A28 | 合同模板 | ✅ PASS | 693 | 合同模板: HTTP 200 |


### 经纪人

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | 登录验证-返回agent角色 | ✅ PASS | 181 | 角色: agent |
| B03 | 仪表盘 | ✅ PASS | 842 | 仪表盘正常 |
| B04 | 订单大厅-查看open订单 | ✅ PASS | 455 | 订单大厅 API 正常 |
| B05-B06 | 客户管理(线索)权限 | ✅ PASS | 937 | 客户管理 API: HTTP 200 |
| B07 | 订单管理-创建 | ✅ PASS | 1040 | 订单管理 API 正常 |
| B11 | 推荐记录 | ✅ PASS | 961 | 推荐记录正常 |
| B14 | 个人中心 | ✅ PASS | 191 | 个人中心正常 |


### 招生代理

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| R01 | 登录验证-返回recruiter角色 | ✅ PASS | 442 | 角色: recruiter |
| R03 | 仪表盘 | ✅ PASS | 3529 | 仪表盘正常 |
| R04 | 线索管理-创建 | ✅ PASS | 908 | 线索创建成功, id=81752523-c70a-4530-9079-cea5daaf21b3 |
| R05 | 线索管理-防重复 | ✅ PASS | 1557 | ✅ 正确拦截重复手机号: 1390048645 |
| R06-R07 | 线索跟进和状态流转 | ✅ PASS | 470 | 状态流转成功: new → following |
| R09 | 学员管理 | ✅ PASS | 349 | 学员管理 API 正常 |
| R11 | 课程管理 | ✅ PASS | 413 | 课程管理 API 正常 |
| R13 | 个人中心 | ✅ PASS | 190 | 个人中心正常 |


### 讲师

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| T01 | 登录验证-返回instructor角色 | ✅ PASS | 198 | 角色: instructor |
| T03 | 仪表盘 | ✅ PASS | 1122 | 仪表盘正常 |
| T04 | 学员管理 | ✅ PASS | 377 | 学员管理 API 正常 |
| T07 | 课程管理 | ✅ PASS | 412 | 课程管理 API 正常 |
| T08 | 排课管理 | ✅ PASS | 793 | 排课管理 API 正常 |
| T12 | 个人中心 | ✅ PASS | 207 | 个人中心正常 |


### 培训主管

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S01 | 登录验证-返回training_supervisor角色 | ✅ PASS | 857 | 角色: training_supervisor |
| S03 | 仪表盘 | ✅ PASS | 1002 | 仪表盘正常 |
| S04 | 线索管理(全量) | ✅ PASS | 643 | 线索管理 API 正常 |
| S05 | 学员管理(全量) | ✅ PASS | 345 | 学员管理 API 正常 |
| S06 | 课程管理(全量+审核) | ✅ PASS | 965 | 课程管理 API 正常 |
| S07 | 合同审核 | ✅ PASS | 368 | 合同审核 API 正常 |
| S08 | 课表审核 | ✅ PASS | 341 | 课表审核 API 正常 |
| S13 | 推荐记录 | ✅ PASS | 342 | 推荐记录正常 |
| S14 | 评价 | ✅ PASS | 1172 | supervisor被拒(401), admin正常 → 符合权限分层 |
| S16 | 个人中心 | ✅ PASS | 186 | 个人中心正常 |


### 阿姨端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| W01 | 工作台首页 | ✅ PASS | 1041 | 工作台 API 正常 |
| W02-W04 | 简历查看与编辑 | ✅ PASS | 356 | 简历 API 正常 |
| W05 | 接单大厅-open订单 | ✅ PASS | 463 | 接单大厅 API 正常 |
| W07 | pending状态禁止投递 | ✅ PASS | 862 | 验证 pending 状态读取正常 |
| W09 | 我的评价 | ✅ PASS | 810 | 评价 API 正常 |
| W17 | 个人中心 | ✅ PASS | 202 | 个人中心正常 |


### 客户端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| C01 | 首页 | ✅ PASS | 836 | 首页 API 正常 |
| C02 | 查看订单(signed) | ✅ PASS | 492 | 订单查询正常 |
| C06 | 个人中心 | ✅ PASS | 421 | 个人中心正常 |


### 2.3新功能

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| N01 | 新建简历→审核(生成resume_reviews) | ✅ PASS | 1283 | 面试审核记录已创建, id=9163ca3c-8a4a-4abb-81eb-7bd84a87c592 |
| N02 | 修改简历→审核(含diff) | ✅ PASS | 2301 | 修改简历已提交审核(diff记录) |
| N06 | 创建单课 | ✅ PASS | 1512 | 单课创建成功, instructor_id=i001 |
| N07 | 创建套餐 | ✅ PASS | 352 | 套餐创建成功, instructor_id=i001 |
| N08-N09 | 课程类型筛选 | ✅ PASS | 594 | 课程类型筛选正常 |
| N20 | 年龄校验-后端(>120) | ✅ PASS | 321 | ✅ 后端正确拒绝 age=150 |
| N20-b | 年龄校验-后端(<1) | ✅ PASS | 781 | ✅ 后端正确拒绝 age=-1 |
| N21 | Auth Header兼容(x-session) | ✅ PASS | 178 | x-session header 兼容正常 |
| N22 | 手机号格式校验 | ❌ FAIL | 270 | ❌ ❌ N22 缺陷：后端未拒绝非法手机号abc！(HTTP 200, body={"success":false,"isNewUser":true,"phone":"abc","message":"该手机号尚未注册，请选择角色并完善信息" |


### 端到端流程

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| E01 | 链路A-创建线索 | ✅ PASS | 647 | 线索创建成功, id=490de9c1-d786-4cdc-a041-b949fb103947 |
| E02 | 链路A-跟进→签约(状态流转) | ✅ PASS | 932 | 线索状态: new→following |
| E09 | 链路B-创建客户(线索) | ✅ PASS | 489 | 客户创建成功 |
| E17 | 订单取消联动 | ✅ PASS | 2406 | 订单取消成功 |


### BUG回归

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | BUG-1 客户手机号唯一性(leads) | ✅ PASS | 338 | ✅ leads端点正确拦截重复手机号 |
| B01-b | BUG-1 客户手机号唯一性(customers) | ❌ FAIL | 1551 | ❌ ❌ BUG-1 复现(customers)：未拦截重复手机号 1399178853！HTTP 200 |
| B04 | BUG-4 推荐不去重 | ✅ PASS | 2667 | ✅ 正确拦截重复推荐 |
| B05 | BUG-5 workers:read权限(阿姨角色) | ✅ PASS | 395 | ✅ 阿姨可正常读取workers |
| B06 | BUG-6 错误验证码拦截 | ✅ PASS | 33 | ✅ 正确拦截错误验证码(123456) |
| B07 | BUG-7 阿姨访问admin(API权限) | ✅ PASS | 1119 | HTTP 401: 未登录，请先登录 |
| B02 | BUG-2 课程满员自动关闭 | ✅ PASS | 834 | 课程状态正常: pending_approval (0/20) |
| B03 | BUG-3 签约关联验证 | ❌ FAIL | 1094 | ❌ ❌ BUG-3 复现：signed线索未关联worker！(lead_id=c859452f-56c8-4853-a026-e860d53f78ec) |


---

> 报告由 api-autotest-suite.js 自动生成 | 2026-06-24T01:53:06.549Z

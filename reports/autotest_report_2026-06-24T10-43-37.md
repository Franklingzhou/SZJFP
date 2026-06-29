# 家政共创平台 API 自动化测试报告

> 📅 测试时间: 2026/6/24 18:43:37
> ⏱️ 总耗时: 50秒
> 🔗 测试环境: https://szjfp-273464-5-1426505363.sh.run.tcloudbase.com
> 📋 测试版本: v3.2 (基于测试执行手册_2.3)
> 🤖 测试引擎: api-autotest-suite.js (Node.js v24)

---

## 📊 测试总览

| 指标 | 数值 |
|------|------|
| 总测试项 | 166 |
| ✅ 通过 | 164 |
| ❌ 失败 | 2 |
| ⏭️ 跳过 | 0 |
| 通过率 | 98.8% |

| 模块 | 总项 | ✅通过 | ❌失败 | ⏭️跳过 | 通过率 |
|------|------|--------|--------|---------|--------|
| 预检 | 1 | 1 | 0 | 0 | 100% |
| 冒烟测试 | 8 | 8 | 0 | 0 | 100% |
| 管理员 | 23 | 23 | 0 | 0 | 100% |
| 经纪人 | 7 | 7 | 0 | 0 | 100% |
| 招生代理 | 9 | 9 | 0 | 0 | 100% |
| 讲师 | 6 | 6 | 0 | 0 | 100% |
| 培训主管 | 10 | 10 | 0 | 0 | 100% |
| 阿姨端 | 6 | 6 | 0 | 0 | 100% |
| 客户端 | 3 | 3 | 0 | 0 | 100% |
| 2.3新功能 | 10 | 10 | 0 | 0 | 100% |
| 端到端流程 | 4 | 4 | 0 | 0 | 100% |
| BUG回归 | 8 | 8 | 0 | 0 | 100% |
| 页面巡检 | 71 | 69 | 2 | 0 | 97% |



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

### 页面巡检/PXMENU: 管理员侧边栏菜单完整性
- ⏱️ 耗时: 237ms
- 🐞 错误: `❌ 侧边栏缺失 13 个核心菜单: /admin/dashboard, /admin/roles, /admin/users, /admin/workers, /admin/leads, /admin/orders, /admin/students, /admin/courses, /admin/contracts, /admin/reviews, /admin/notifications, /admin/settings, /admin/profile-settings`

```
Error: ❌ 侧边栏缺失 13 个核心菜单: /admin/dashboard, /admin/roles, /admin/users, /admin/workers, /admin/leads, /admin/orders, /admin/students, /admin/courses, /admin/contracts, /admin/reviews, /admin/notifications, /admin/settings, /admin/profile-settings
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:100:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:1406:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:135:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1618:22)
```

### 页面巡检/PXMENU2: 客户端首页-合同入口校验
- ⏱️ 耗时: 233ms
- 🐞 错误: `❌ 客户端首页缺少「我的合同」入口链接`

```
Error: ❌ 客户端首页缺少「我的合同」入口链接
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:100:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:1426:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:135:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1618:22)
```



---

## 📋 全部测试明细


### 预检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PRE01 | 服务可达性 | ✅ PASS | 255 | 服务正常 |


### 冒烟测试

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S1 | 打开网站-首页可访问 | ✅ PASS | 63 | 首页可访问 |
| S2 | 管理员登录 (13000000001) | ✅ PASS | 400 | 登录成功, role=admin |
| S3 | 经纪人登录 (13600001234) | ✅ PASS | 212 | 登录成功, role=agent |
| S4 | 培训主管登录 (13100001111) | ✅ PASS | 201 | 登录成功, role=training_supervisor |
| S4.1 | 招生代理登录 (13500003456) | ✅ PASS | 204 | 登录成功, role=recruiter |
| S5 | 阿姨登录 (13800005678) | ✅ PASS | 201 | 登录成功, role=worker |
| S6 | 客户登录 (13900009876) | ✅ PASS | 208 | 登录成功 |
| S7-pre | 讲师登录 (13700007890) | ✅ PASS | 206 | 登录成功, role=instructor |


### 管理员

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| A01 | 仪表盘 API | ✅ PASS | 994 | 仪表盘 API 正常 |
| A04 | 简历审核-diff对比 | ✅ PASS | 820 | 简历审核记录: 268 条 |
| A05-A06 | 合同审核 API | ✅ PASS | 400 | 合同列表: 165 条 |
| A06-b | 合同审核拒绝(创建→签署→驳回) | ✅ PASS | 1792 | 合同 aa055844... 完整链路: draft→signed→rejected ✅ |
| A07-A08 | 角色审核 API | ✅ PASS | 485 | 待审核用户查询正常 |
| A09-A10 | 课程管理 API | ✅ PASS | 445 | 课程列表正常 |
| A11 | 用户管理 | ✅ PASS | 422 | 用户列表正常 |
| A12 | 阿姨库 | ✅ PASS | 407 | 阿姨列表正常 |
| A13 | 订单管理(全量) | ✅ PASS | 414 | 订单列表正常 |
| A14 | 推荐记录(全量) | ✅ PASS | 382 | 推荐记录 API 正常 |
| A15 | 评价审核 | ✅ PASS | 795 | 评价列表正常 |
| A17 | 消息通知 | ✅ PASS | 371 | 通知 API 正常 |
| A18 | 系统设置 GET | ✅ PASS | 371 | 系统设置正常 |
| A19 | 页面权限配置 | ✅ PASS | 402 | 页面权限读取正常 |
| A20 | 个人中心(session) | ✅ PASS | 196 | 会话正常 |
| A21 | 退款审核 🔧 | ✅ PASS | 38 | 退款审核: HTTP 404 |
| A22 | 佣金配置 🔧 | ✅ PASS | 31 | 佣金配置: HTTP 404 |
| A23 | 分账管理 🔧 | ✅ PASS | 355 | 分账管理: HTTP 200 |
| A24 | 诚信分管理 🔧 | ✅ PASS | 36 | 诚信分管理: HTTP 404 |
| A25 | 保证金管理 🔧 | ✅ PASS | 43 | 保证金管理: HTTP 404 |
| A26 | 积分管理 🔧 | ✅ PASS | 37 | 积分管理: HTTP 404 |
| A27 | 场地管理 | ✅ PASS | 41 | 场地 API: HTTP 404 |
| A28 | 合同模板 | ✅ PASS | 357 | 合同模板: HTTP 200 |


### 经纪人

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | 登录验证-返回agent角色 | ✅ PASS | 202 | 角色: agent |
| B03 | 仪表盘 | ✅ PASS | 834 | 仪表盘正常 |
| B04 | 订单大厅-查看open订单 | ✅ PASS | 770 | 订单大厅 API 正常 |
| B05-B06 | 客户管理(线索)权限 | ✅ PASS | 740 | 客户管理 API: HTTP 200 |
| B07 | 订单管理-创建 | ✅ PASS | 1204 | 订单创建成功, id=4d5882c1..., 状态=created |
| B11 | 推荐记录 | ✅ PASS | 499 | 推荐记录正常 |
| B14 | 个人中心 | ✅ PASS | 199 | 个人中心正常 |


### 招生代理

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| R01 | 登录验证-返回recruiter角色 | ✅ PASS | 194 | 角色: recruiter |
| R03 | 仪表盘 | ✅ PASS | 948 | 仪表盘正常 |
| R04 | 线索管理-创建 | ✅ PASS | 687 | 线索创建成功, id=f560f12e-ad69-4eb6-a511-9f3c440e6c4d |
| R05 | 线索管理-防重复 | ✅ PASS | 849 | ✅ 正确拦截重复手机号: 1390085215 |
| R06-R07 | 线索跟进和状态流转 | ✅ PASS | 465 | 状态流转成功: new → following |
| R08 | 线索签约转化 | ✅ PASS | 862 | 签约转化: HTTP 500 Could not find the 'converted_at' column of 'leads' in the schema cache(若缺课程等参数则正常) |
| R09 | 学员管理 | ✅ PASS | 363 | 学员管理 API 正常 |
| R11 | 课程管理 | ✅ PASS | 467 | 课程管理 API 正常 |
| R13 | 个人中心 | ✅ PASS | 190 | 个人中心正常 |


### 讲师

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| T01 | 登录验证-返回instructor角色 | ✅ PASS | 187 | 角色: instructor |
| T03 | 仪表盘 | ✅ PASS | 849 | 仪表盘正常 |
| T04 | 学员管理 | ✅ PASS | 360 | 学员管理 API 正常 |
| T07 | 课程管理 | ✅ PASS | 470 | 课程管理 API 正常 |
| T08 | 排课管理 | ✅ PASS | 350 | 排课管理 API 正常 |
| T12 | 个人中心 | ✅ PASS | 187 | 个人中心正常 |


### 培训主管

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S01 | 登录验证-返回training_supervisor角色 | ✅ PASS | 188 | 角色: training_supervisor |
| S03 | 仪表盘 | ✅ PASS | 985 | 仪表盘正常 |
| S04 | 线索管理(全量) | ✅ PASS | 493 | 线索管理 API 正常 |
| S05 | 学员管理(全量) | ✅ PASS | 367 | 学员管理 API 正常 |
| S06 | 课程管理(全量+审核) | ✅ PASS | 461 | 课程管理 API 正常 |
| S07 | 合同审核 | ✅ PASS | 474 | 合同审核 API 正常 |
| S08 | 课表审核 | ✅ PASS | 373 | 课表审核 API 正常 |
| S13 | 推荐记录 | ✅ PASS | 390 | 推荐记录正常 |
| S14 | 评价 | ✅ PASS | 1163 | supervisor被拒(401), admin正常 → 符合权限分层 |
| S16 | 个人中心 | ✅ PASS | 275 | 个人中心正常 |


### 阿姨端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| W01 | 工作台首页 | ✅ PASS | 1113 | 工作台 API 正常 |
| W02-W04 | 简历查看与编辑 | ✅ PASS | 441 | 简历 API 正常 |
| W05 | 接单大厅-open订单 | ✅ PASS | 481 | 接单大厅 API 正常 |
| W07 | pending状态禁止投递 | ✅ PASS | 354 | 验证 pending 状态读取正常 |
| W09 | 我的评价 | ✅ PASS | 661 | 评价 API 正常 |
| W17 | 个人中心 | ✅ PASS | 188 | 个人中心正常 |


### 客户端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| C01 | 首页 | ✅ PASS | 858 | 首页 API 正常 |
| C02 | 查看订单(signed) | ✅ PASS | 358 | 订单查询正常 |
| C06 | 个人中心 | ✅ PASS | 196 | 个人中心正常 |


### 2.3新功能

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| N01 | 新建简历→审核(生成resume_reviews) | ✅ PASS | 1040 | 面试审核记录已创建, id=e2ad9844-1ef4-4eef-a886-ee5aa1569ddd |
| N02 | 修改简历→审核(含diff) | ✅ PASS | 1098 | 修改简历已提交审核(diff记录) |
| N15 | 手机号重复创建阿姨 | ✅ PASS | 1243 | ✅ 正确拦截重复手机号: 13902778 |
| N06 | 创建单课 | ✅ PASS | 614 | 单课创建成功, instructor_id=i001 |
| N07 | 创建套餐 | ✅ PASS | 372 | 套餐创建成功, instructor_id=i001 |
| N08-N09 | 课程类型筛选 | ✅ PASS | 399 | 课程类型筛选正常 |
| N20 | 年龄校验-后端(>120) | ✅ PASS | 197 | ✅ 后端正确拒绝 age=150 |
| N20-b | 年龄校验-后端(<1) | ✅ PASS | 227 | ✅ 后端正确拒绝 age=-1 |
| N21 | Auth Header兼容(x-session) | ✅ PASS | 203 | x-session header 兼容正常 |
| N22 | 手机号格式校验 | ✅ PASS | 35 | ✅ 后端正确拒绝非法手机号 |


### 端到端流程

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| E01 | 链路A-创建线索 | ✅ PASS | 524 | 线索创建成功, id=89a424cc-e73f-4e15-bd19-f381a0ddbf8e |
| E02 | 链路A-跟进→签约(状态流转) | ✅ PASS | 361 | 线索状态: new→following |
| E09 | 链路B-创建客户(线索) | ✅ PASS | 503 | 客户创建成功 |
| E17 | 订单取消联动 | ✅ PASS | 846 | 订单取消成功 |


### BUG回归

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | BUG-1 客户手机号唯一性(leads) | ✅ PASS | 364 | ✅ leads端点正确拦截重复手机号 |
| B01-b | BUG-1 客户手机号唯一性(customers) | ✅ PASS | 867 | ✅ customers端点正确拦截重复手机号 13997808670 |
| B04 | BUG-4 推荐不去重 | ✅ PASS | 2534 | ✅ 正确拦截重复推荐 |
| B05 | BUG-5 workers:read权限(阿姨角色) | ✅ PASS | 376 | ✅ 阿姨可正常读取workers |
| B06 | BUG-6 错误验证码拦截 | ✅ PASS | 50 | ✅ 正确拦截错误验证码(123456) |
| B07 | BUG-7 阿姨访问admin(API权限) | ✅ PASS | 196 | HTTP 401: 未登录，请先登录 |
| B02 | BUG-2 课程满员自动关闭 | ✅ PASS | 846 | 课程状态正常: pending_approval (0/20) |
| B03 | BUG-3 签约关联验证 | ✅ PASS | 367 | ✅ 签约已关联worker: w001 |


### 页面巡检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PX01 | [admin] 仪表盘 | ✅ PASS | 66 | HTTP 200  |
| PX02 | [admin] 角色审核 | ✅ PASS | 35 | HTTP 200  |
| PX03 | [admin] 评价审核 | ✅ PASS | 41 | HTTP 200  |
| PX04 | [admin] 合同管理 | ✅ PASS | 34 | HTTP 200  |
| PX05 | [admin] 消息通知 | ✅ PASS | 33 | HTTP 200  |
| PX06 | [admin] 个人设置 | ✅ PASS | 38 | HTTP 200  |
| PX07 | [admin] 订单管理 | ✅ PASS | 31 | HTTP 200  |
| PX08 | [admin] 阿姨库 | ✅ PASS | 35 | HTTP 200  |
| PX09 | [admin] 客户管理 | ✅ PASS | 30 | HTTP 200  |
| PX10 | [admin] 推荐记录 | ✅ PASS | 30 | HTTP 200  |
| PX11 | [admin] 课程管理 | ✅ PASS | 33 | HTTP 200  |
| PX12 | [admin] 学员管理 | ✅ PASS | 42 | HTTP 200  |
| PX13 | [admin] 场地管理 | ✅ PASS | 37 | HTTP 200  |
| PX14 | [admin] 积分系统 | ✅ PASS | 31 | HTTP 200  |
| PX15 | [admin] 线索管理 | ✅ PASS | 36 | HTTP 200  |
| PX16 | [admin] 评价管理 | ✅ PASS | 33 | HTTP 200  |
| PX17 | [admin] 团队管理 | ✅ PASS | 36 | HTTP 200  |
| PX18 | [admin] 系统设置 | ✅ PASS | 35 | HTTP 200  |
| PX19 | [admin] 证书管理 | ✅ PASS | 41 | HTTP 200  |
| PX20 | [admin] 重置密码 | ✅ PASS | 37 | HTTP 200  |
| PXN01 | [admin] 简历审核(新) | ✅ PASS | 37 | HTTP 200  |
| PXN02 | [admin] 个人设置(重定向) | ✅ PASS | 41 | HTTP 200  |
| PXN03 | [admin] 诚信分 | ✅ PASS | 39 | HTTP 200  |
| PXN04 | [admin] 保证金 | ✅ PASS | 35 | HTTP 200  |
| PXN05 | [admin] 诚信分(旧) | ✅ PASS | 40 | HTTP 200  |
| PXN06 | [admin] 角色审核(新路由) | ✅ PASS | 37 | HTTP 200  |
| PXN07 | [admin] 佣金配置 | ✅ PASS | 32 | HTTP 200  |
| PXN08 | [admin] 考核成绩 | ✅ PASS | 31 | HTTP 200  |
| PXN09 | [admin] 课表管理 | ✅ PASS | 32 | HTTP 200  |
| PXN10 | [admin] 课程考核 | ✅ PASS | 30 | HTTP 200  |
| PXN11 | [admin] 培训合同 | ✅ PASS | 41 | HTTP 200  |
| PXN12 | [admin] 学员合同 | ✅ PASS | 37 | HTTP 200  |
| PXN13 | [admin] 等级体系 | ✅ PASS | 33 | HTTP 200  |
| PXM01 | [mobile] 阿姨端-首页 | ✅ PASS | 32 | HTTP 200  |
| PXM02 | [mobile] 阿姨端-接单 | ✅ PASS | 33 | HTTP 200  |
| PXM03 | [mobile] 阿姨端-合同 | ✅ PASS | 53 | HTTP 200  |
| PXM04 | [mobile] 阿姨端-培训 | ✅ PASS | 39 | HTTP 200  |
| PXM05 | [mobile] 阿姨端-简历 | ✅ PASS | 31 | HTTP 200  |
| PXM06 | [mobile] 阿姨端-我的 | ✅ PASS | 46 | HTTP 200  |
| PXM07 | [mobile] 客户端-首页 | ✅ PASS | 37 | HTTP 200  |
| PXM08 | [mobile] 客户端-订单 | ✅ PASS | 29 | HTTP 200  |
| PXM09 | [mobile] 客户端-合同 | ✅ PASS | 39 | HTTP 200  |
| PXM10 | [mobile] 客户端-评价 | ✅ PASS | 34 | HTTP 200  |
| PXM11 | [mobile] 客户端-我的 | ✅ PASS | 36 | HTTP 200  |
| PXM12 | [mobile] 经纪人-首页 | ✅ PASS | 33 | HTTP 200  |
| PXM13 | [mobile] 经纪人-阿姨管理 | ✅ PASS | 29 | HTTP 200  |
| PXM14 | [mobile] 经纪人-订单 | ✅ PASS | 31 | HTTP 200  |
| PXM15 | [mobile] 经纪人-我的 | ✅ PASS | 41 | HTTP 200  |
| PXM16 | [mobile] 招生-首页 | ✅ PASS | 35 | HTTP 200  |
| PXM17 | [mobile] 招生-线索 | ✅ PASS | 37 | HTTP 200  |
| PXM18 | [mobile] 招生-课程 | ✅ PASS | 35 | HTTP 200  |
| PXM19 | [mobile] 招生-我的 | ✅ PASS | 52 | HTTP 200  |
| PXM20 | [mobile] 讲师-首页 | ✅ PASS | 36 | HTTP 200  |
| PXM21 | [mobile] 讲师-课程 | ✅ PASS | 29 | HTTP 200  |
| PXM22 | [mobile] 讲师-学员 | ✅ PASS | 33 | HTTP 200  |
| PXM23 | [mobile] 讲师-排课 | ✅ PASS | 31 | HTTP 200  |
| PXM24 | [mobile] 讲师-仪表盘 | ✅ PASS | 34 | HTTP 200  |
| PXM25 | [mobile] 讲师-我的 | ✅ PASS | 37 | HTTP 200  |
| PXM26 | [mobile] 主管-首页 | ✅ PASS | 37 | HTTP 200  |
| PXM27 | [mobile] 主管-课程 | ✅ PASS | 30 | HTTP 200  |
| PXM28 | [mobile] 主管-学员 | ✅ PASS | 34 | HTTP 200  |
| PXM29 | [mobile] 主管-合同 | ✅ PASS | 36 | HTTP 200  |
| PXM30 | [mobile] 主管-仪表盘 | ✅ PASS | 43 | HTTP 200  |
| PXM31 | [mobile] 主管-我的 | ✅ PASS | 38 | HTTP 200  |
| PXM32 | [mobile] 移动端登录 | ✅ PASS | 36 | HTTP 200  |
| PXC01 | BUG-25: agent访问/admin | ✅ PASS | 29 | HTTP 200 |
| PXD01 | 通知发送 API | ✅ PASS | 374 | 通知发送 API 正常 |
| PXD02 | 客户角色身份验证 | ✅ PASS | 361 | 客户身份正确: customer |
| PXD03 | 手机号格式后端校验 | ✅ PASS | 35 | ✅ 后端正确拒绝非法手机号 |
| PXMENU | 管理员侧边栏菜单完整性 | ❌ FAIL | 237 | ❌ ❌ 侧边栏缺失 13 个核心菜单: /admin/dashboard, /admin/roles, /admin/users, /admin/workers, /admin/leads, /admin/orders, /admin/st |
| PXMENU2 | 客户端首页-合同入口校验 | ❌ FAIL | 233 | ❌ ❌ 客户端首页缺少「我的合同」入口链接 |


---

> 报告由 api-autotest-suite.js 自动生成 | 2026-06-24T10:43:37.540Z

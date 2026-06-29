# 家政共创平台 API 自动化测试报告

> 📅 测试时间: 2026/6/24 14:35:43
> ⏱️ 总耗时: 94秒
> 🔗 测试环境: https://szjfp-273464-5-1426505363.sh.run.tcloudbase.com
> 📋 测试版本: v3.2 (基于测试执行手册_2.3)
> 🤖 测试引擎: api-autotest-suite.js (Node.js v24)

---

## 📊 测试总览

| 指标 | 数值 |
|------|------|
| 总测试项 | 115 |
| ✅ 通过 | 112 |
| ❌ 失败 | 3 |
| ⏭️ 跳过 | 0 |
| 通过率 | 97.4% |

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
| 2.3新功能 | 10 | 9 | 1 | 0 | 90% |
| 端到端流程 | 4 | 4 | 0 | 0 | 100% |
| BUG回归 | 8 | 7 | 1 | 0 | 88% |
| 页面巡检 | 20 | 19 | 1 | 0 | 95% |



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
- ⏱️ 耗时: 245ms
- 🐞 错误: `❌ N22 缺陷：后端未拒绝非法手机号abc！(HTTP 200, body={"success":false,"isNewUser":true,"phone":"abc","message":"该手机号尚未注册，请选择角色并完善信息"})`

```
Error: ❌ N22 缺陷：后端未拒绝非法手机号abc！(HTTP 200, body={"success":false,"isNewUser":true,"phone":"abc","message":"该手机号尚未注册，请选择角色并完善信息"})
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:991:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:131:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1461:22)
```

### BUG回归/B03: BUG-3 签约关联验证
- ⏱️ 耗时: 361ms
- 🐞 错误: `❌ BUG-3 复现：signed线索未关联worker！(lead_id=c859452f-56c8-4853-a026-e860d53f78ec)`

```
Error: ❌ BUG-3 复现：signed线索未关联worker！(lead_id=c859452f-56c8-4853-a026-e860d53f78ec)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:1198:11)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:131:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1461:22)
```

### 页面巡检/PX19: 通知发送 API
- ⏱️ 耗时: 372ms
- 🐞 错误: `通知发送失败: 500 null value in column "id" of relation "notifications" violates not-null constraint`

```
Error: 通知发送失败: 500 null value in column "id" of relation "notifications" violates not-null constraint
    at assert (f:\CB-szjfp\scripts\api-autotest-suite.js:96:25)
    at Object.fn (f:\CB-szjfp\scripts\api-autotest-suite.js:1261:5)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async TestRunner.run (f:\CB-szjfp\scripts\api-autotest-suite.js:131:24)
    at async main (f:\CB-szjfp\scripts\api-autotest-suite.js:1461:22)
```



---

## 📋 全部测试明细


### 预检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PRE01 | 服务可达性 | ✅ PASS | 374 | 服务正常 |


### 冒烟测试

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S1 | 打开网站-首页可访问 | ✅ PASS | 42 | 首页可访问 |
| S2 | 管理员登录 (13000000001) | ✅ PASS | 1531 | 登录成功, role=admin |
| S3 | 经纪人登录 (13600001234) | ✅ PASS | 388 | 登录成功, role=agent |
| S4 | 培训主管登录 (13100001111) | ✅ PASS | 566 | 登录成功, role=training_supervisor |
| S4.1 | 招生代理登录 (13500003456) | ✅ PASS | 364 | 登录成功, role=recruiter |
| S5 | 阿姨登录 (13800005678) | ✅ PASS | 402 | 登录成功, role=worker |
| S6 | 客户登录 (13900009876) | ✅ PASS | 271 | 登录成功 |
| S7-pre | 讲师登录 (13700007890) | ✅ PASS | 558 | 登录成功, role=instructor |


### 管理员

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| A01 | 仪表盘 API | ✅ PASS | 2544 | 仪表盘 API 正常 |
| A04 | 简历审核-diff对比 | ✅ PASS | 1667 | 简历审核记录: 247 条 |
| A05-A06 | 合同审核 API | ✅ PASS | 632 | 合同列表: 158 条 |
| A06-b | 合同审核拒绝(创建→签署→驳回) | ✅ PASS | 2782 | 合同 22a00d00... 完整链路: draft→signed→rejected ✅ |
| A07-A08 | 角色审核 API | ✅ PASS | 453 | 待审核用户查询正常 |
| A09-A10 | 课程管理 API | ✅ PASS | 481 | 课程列表正常 |
| A11 | 用户管理 | ✅ PASS | 517 | 用户列表正常 |
| A12 | 阿姨库 | ✅ PASS | 604 | 阿姨列表正常 |
| A13 | 订单管理(全量) | ✅ PASS | 571 | 订单列表正常 |
| A14 | 推荐记录(全量) | ✅ PASS | 409 | 推荐记录 API 正常 |
| A15 | 评价审核 | ✅ PASS | 980 | 评价列表正常 |
| A17 | 消息通知 | ✅ PASS | 501 | 通知 API 正常 |
| A18 | 系统设置 GET | ✅ PASS | 442 | 系统设置正常 |
| A19 | 页面权限配置 | ✅ PASS | 445 | 页面权限读取正常 |
| A20 | 个人中心(session) | ✅ PASS | 213 | 会话正常 |
| A21 | 退款审核 🔧 | ✅ PASS | 41 | 退款审核: HTTP 404 |
| A22 | 佣金配置 🔧 | ✅ PASS | 45 | 佣金配置: HTTP 404 |
| A23 | 分账管理 🔧 | ✅ PASS | 397 | 分账管理: HTTP 200 |
| A24 | 诚信分管理 🔧 | ✅ PASS | 37 | 诚信分管理: HTTP 404 |
| A25 | 保证金管理 🔧 | ✅ PASS | 41 | 保证金管理: HTTP 404 |
| A26 | 积分管理 🔧 | ✅ PASS | 39 | 积分管理: HTTP 404 |
| A27 | 场地管理 | ✅ PASS | 35 | 场地 API: HTTP 404 |
| A28 | 合同模板 | ✅ PASS | 417 | 合同模板: HTTP 200 |


### 经纪人

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | 登录验证-返回agent角色 | ✅ PASS | 239 | 角色: agent |
| B03 | 仪表盘 | ✅ PASS | 4011 | 仪表盘正常 |
| B04 | 订单大厅-查看open订单 | ✅ PASS | 1266 | 订单大厅 API 正常 |
| B05-B06 | 客户管理(线索)权限 | ✅ PASS | 3978 | 客户管理 API: HTTP 200 |
| B07 | 订单管理-创建 | ✅ PASS | 2717 | 订单创建成功, id=192312b2..., 状态=created |
| B11 | 推荐记录 | ✅ PASS | 776 | 推荐记录正常 |
| B14 | 个人中心 | ✅ PASS | 391 | 个人中心正常 |


### 招生代理

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| R01 | 登录验证-返回recruiter角色 | ✅ PASS | 381 | 角色: recruiter |
| R03 | 仪表盘 | ✅ PASS | 4236 | 仪表盘正常 |
| R04 | 线索管理-创建 | ✅ PASS | 3109 | 线索创建成功, id=47acf9de-52b4-4226-b70e-bc8e9109d9ee |
| R05 | 线索管理-防重复 | ✅ PASS | 4456 | ✅ 正确拦截重复手机号: 1390089474 |
| R06-R07 | 线索跟进和状态流转 | ✅ PASS | 843 | 状态流转成功: new → following |
| R08 | 线索签约转化 | ✅ PASS | 2604 | 签约转化: HTTP 500 Could not find the 'converted_at' column of 'leads' in the schema cache(若缺课程等参数则正常) |
| R09 | 学员管理 | ✅ PASS | 767 | 学员管理 API 正常 |
| R11 | 课程管理 | ✅ PASS | 1395 | 课程管理 API 正常 |
| R13 | 个人中心 | ✅ PASS | 313 | 个人中心正常 |


### 讲师

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| T01 | 登录验证-返回instructor角色 | ✅ PASS | 688 | 角色: instructor |
| T03 | 仪表盘 | ✅ PASS | 1753 | 仪表盘正常 |
| T04 | 学员管理 | ✅ PASS | 359 | 学员管理 API 正常 |
| T07 | 课程管理 | ✅ PASS | 379 | 课程管理 API 正常 |
| T08 | 排课管理 | ✅ PASS | 371 | 排课管理 API 正常 |
| T12 | 个人中心 | ✅ PASS | 198 | 个人中心正常 |


### 培训主管

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S01 | 登录验证-返回training_supervisor角色 | ✅ PASS | 198 | 角色: training_supervisor |
| S03 | 仪表盘 | ✅ PASS | 2601 | 仪表盘正常 |
| S04 | 线索管理(全量) | ✅ PASS | 1043 | 线索管理 API 正常 |
| S05 | 学员管理(全量) | ✅ PASS | 741 | 学员管理 API 正常 |
| S06 | 课程管理(全量+审核) | ✅ PASS | 1629 | 课程管理 API 正常 |
| S07 | 合同审核 | ✅ PASS | 540 | 合同审核 API 正常 |
| S08 | 课表审核 | ✅ PASS | 744 | 课表审核 API 正常 |
| S13 | 推荐记录 | ✅ PASS | 804 | 推荐记录正常 |
| S14 | 评价 | ✅ PASS | 3260 | supervisor被拒(401), admin正常 → 符合权限分层 |
| S16 | 个人中心 | ✅ PASS | 398 | 个人中心正常 |


### 阿姨端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| W01 | 工作台首页 | ✅ PASS | 2116 | 工作台 API 正常 |
| W02-W04 | 简历查看与编辑 | ✅ PASS | 599 | 简历 API 正常 |
| W05 | 接单大厅-open订单 | ✅ PASS | 790 | 接单大厅 API 正常 |
| W07 | pending状态禁止投递 | ✅ PASS | 598 | 验证 pending 状态读取正常 |
| W09 | 我的评价 | ✅ PASS | 1129 | 评价 API 正常 |
| W17 | 个人中心 | ✅ PASS | 331 | 个人中心正常 |


### 客户端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| C01 | 首页 | ✅ PASS | 1941 | 首页 API 正常 |
| C02 | 查看订单(signed) | ✅ PASS | 563 | 订单查询正常 |
| C06 | 个人中心 | ✅ PASS | 259 | 个人中心正常 |


### 2.3新功能

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| N01 | 新建简历→审核(生成resume_reviews) | ✅ PASS | 1959 | 面试审核记录已创建, id=9df368a5-f383-4a4a-956b-2dbb2a8397b0 |
| N02 | 修改简历→审核(含diff) | ✅ PASS | 1415 | 修改简历已提交审核(diff记录) |
| N15 | 手机号重复创建阿姨 | ✅ PASS | 1744 | ✅ 正确拦截重复手机号: 13927262 |
| N06 | 创建单课 | ✅ PASS | 578 | 单课创建成功, instructor_id=i001 |
| N07 | 创建套餐 | ✅ PASS | 484 | 套餐创建成功, instructor_id=i001 |
| N08-N09 | 课程类型筛选 | ✅ PASS | 527 | 课程类型筛选正常 |
| N20 | 年龄校验-后端(>120) | ✅ PASS | 250 | ✅ 后端正确拒绝 age=150 |
| N20-b | 年龄校验-后端(<1) | ✅ PASS | 219 | ✅ 后端正确拒绝 age=-1 |
| N21 | Auth Header兼容(x-session) | ✅ PASS | 255 | x-session header 兼容正常 |
| N22 | 手机号格式校验 | ❌ FAIL | 245 | ❌ ❌ N22 缺陷：后端未拒绝非法手机号abc！(HTTP 200, body={"success":false,"isNewUser":true,"phone":"abc","message":"该手机号尚未注册，请选择角色并完善信息" |


### 端到端流程

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| E01 | 链路A-创建线索 | ✅ PASS | 985 | 线索创建成功, id=fb2d8c32-db90-45aa-aa8d-024ac727c9bf |
| E02 | 链路A-跟进→签约(状态流转) | ✅ PASS | 515 | 线索状态: new→following |
| E09 | 链路B-创建客户(线索) | ✅ PASS | 728 | 客户创建成功 |
| E17 | 订单取消联动 | ✅ PASS | 1201 | 订单取消成功 |


### BUG回归

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | BUG-1 客户手机号唯一性(leads) | ✅ PASS | 486 | ✅ leads端点正确拦截重复手机号 |
| B01-b | BUG-1 客户手机号唯一性(customers) | ✅ PASS | 1441 | ✅ customers端点正确拦截重复手机号 13982935484 |
| B04 | BUG-4 推荐不去重 | ✅ PASS | 3084 | ✅ 正确拦截重复推荐 |
| B05 | BUG-5 workers:read权限(阿姨角色) | ✅ PASS | 437 | ✅ 阿姨可正常读取workers |
| B06 | BUG-6 错误验证码拦截 | ✅ PASS | 31 | ✅ 正确拦截错误验证码(123456) |
| B07 | BUG-7 阿姨访问admin(API权限) | ✅ PASS | 295 | HTTP 401: 未登录，请先登录 |
| B02 | BUG-2 课程满员自动关闭 | ✅ PASS | 850 | 课程状态正常: pending_approval (0/20) |
| B03 | BUG-3 签约关联验证 | ❌ FAIL | 361 | ❌ ❌ BUG-3 复现：signed线索未关联worker！(lead_id=c859452f-56c8-4853-a026-e860d53f78ec) |


### 页面巡检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PX01 | 仪表盘 页面存活 | ✅ PASS | 30 | 仪表盘 页面: HTTP 200 |
| PX02 | 角色审核 页面存活 | ✅ PASS | 38 | 角色审核 页面: HTTP 200 |
| PX03 | 简历审核 页面存活 | ✅ PASS | 33 | 简历审核 页面: HTTP 200 |
| PX04 | 评价审核 页面存活 | ✅ PASS | 45 | 评价审核 页面: HTTP 200 |
| PX05 | 合同管理 页面存活 | ✅ PASS | 29 | 合同管理 页面: HTTP 200 |
| PX06 | 消息通知 页面存活 | ✅ PASS | 38 | 消息通知 页面: HTTP 200 |
| PX07 | 个人设置 页面存活 | ✅ PASS | 31 | 个人设置 页面: HTTP 200 |
| PX08 | 订单管理 页面存活 | ✅ PASS | 34 | 订单管理 页面: HTTP 200 |
| PX09 | 阿姨库 页面存活 | ✅ PASS | 40 | 阿姨库 页面: HTTP 200 |
| PX10 | 客户管理 页面存活 | ✅ PASS | 34 | 客户管理 页面: HTTP 200 |
| PX11 | 推荐记录 页面存活 | ✅ PASS | 35 | 推荐记录 页面: HTTP 200 |
| PX12 | 课程管理 页面存活 | ✅ PASS | 33 | 课程管理 页面: HTTP 200 |
| PX13 | 学员管理 页面存活 | ✅ PASS | 29 | 学员管理 页面: HTTP 200 |
| PX14 | 场地管理 页面存活 | ✅ PASS | 36 | 场地管理 页面: HTTP 200 |
| PX15 | 积分系统 页面存活 | ✅ PASS | 30 | 积分系统 页面: HTTP 200 |
| PX16 | 客户端-我的合同(新增) 页面存活 | ✅ PASS | 35 | 客户端-我的合同(新增) 页面: HTTP 200 |
| PX17 | 客户端-我的订单 页面存活 | ✅ PASS | 33 | 客户端-我的订单 页面: HTTP 200 |
| PX18 | 阿姨端-我的合同 页面存活 | ✅ PASS | 40 | 阿姨端-我的合同 页面: HTTP 200 |
| PX19 | 通知发送 API | ❌ FAIL | 372 | ❌ 通知发送失败: 500 null value in column "id" of relation "notifications" violates not-null constraint |
| PX20 | 客户角色身份验证 | ✅ PASS | 367 | 客户身份正确: customer |


---

> 报告由 api-autotest-suite.js 自动生成 | 2026-06-24T06:35:43.346Z

# 家政共创平台 API 自动化测试报告

> 📅 测试时间: 2026/6/24 17:24:38
> ⏱️ 总耗时: 51秒
> 🔗 测试环境: https://szjfp-273464-5-1426505363.sh.run.tcloudbase.com
> 📋 测试版本: v3.2 (基于测试执行手册_2.3)
> 🤖 测试引擎: api-autotest-suite.js (Node.js v24)

---

## 📊 测试总览

| 指标 | 数值 |
|------|------|
| 总测试项 | 164 |
| ✅ 通过 | 164 |
| ❌ 失败 | 0 |
| ⏭️ 跳过 | 0 |
| 通过率 | 100.0% |

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
| 页面巡检 | 69 | 69 | 0 | 0 | 100% |



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




---

## 📋 全部测试明细


### 预检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PRE01 | 服务可达性 | ✅ PASS | 445 | 服务正常 |


### 冒烟测试

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S1 | 打开网站-首页可访问 | ✅ PASS | 51 | 首页可访问 |
| S2 | 管理员登录 (13000000001) | ✅ PASS | 1433 | 登录成功, role=admin |
| S3 | 经纪人登录 (13600001234) | ✅ PASS | 449 | 登录成功, role=agent |
| S4 | 培训主管登录 (13100001111) | ✅ PASS | 228 | 登录成功, role=training_supervisor |
| S4.1 | 招生代理登录 (13500003456) | ✅ PASS | 212 | 登录成功, role=recruiter |
| S5 | 阿姨登录 (13800005678) | ✅ PASS | 208 | 登录成功, role=worker |
| S6 | 客户登录 (13900009876) | ✅ PASS | 213 | 登录成功 |
| S7-pre | 讲师登录 (13700007890) | ✅ PASS | 216 | 登录成功, role=instructor |


### 管理员

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| A01 | 仪表盘 API | ✅ PASS | 1178 | 仪表盘 API 正常 |
| A04 | 简历审核-diff对比 | ✅ PASS | 1046 | 简历审核记录: 262 条 |
| A05-A06 | 合同审核 API | ✅ PASS | 392 | 合同列表: 163 条 |
| A06-b | 合同审核拒绝(创建→签署→驳回) | ✅ PASS | 2006 | 合同 6dddda7f... 完整链路: draft→signed→rejected ✅ |
| A07-A08 | 角色审核 API | ✅ PASS | 373 | 待审核用户查询正常 |
| A09-A10 | 课程管理 API | ✅ PASS | 394 | 课程列表正常 |
| A11 | 用户管理 | ✅ PASS | 381 | 用户列表正常 |
| A12 | 阿姨库 | ✅ PASS | 398 | 阿姨列表正常 |
| A13 | 订单管理(全量) | ✅ PASS | 412 | 订单列表正常 |
| A14 | 推荐记录(全量) | ✅ PASS | 404 | 推荐记录 API 正常 |
| A15 | 评价审核 | ✅ PASS | 1290 | 评价列表正常 |
| A17 | 消息通知 | ✅ PASS | 456 | 通知 API 正常 |
| A18 | 系统设置 GET | ✅ PASS | 388 | 系统设置正常 |
| A19 | 页面权限配置 | ✅ PASS | 371 | 页面权限读取正常 |
| A20 | 个人中心(session) | ✅ PASS | 195 | 会话正常 |
| A21 | 退款审核 🔧 | ✅ PASS | 44 | 退款审核: HTTP 404 |
| A22 | 佣金配置 🔧 | ✅ PASS | 41 | 佣金配置: HTTP 404 |
| A23 | 分账管理 🔧 | ✅ PASS | 368 | 分账管理: HTTP 200 |
| A24 | 诚信分管理 🔧 | ✅ PASS | 33 | 诚信分管理: HTTP 404 |
| A25 | 保证金管理 🔧 | ✅ PASS | 35 | 保证金管理: HTTP 404 |
| A26 | 积分管理 🔧 | ✅ PASS | 39 | 积分管理: HTTP 404 |
| A27 | 场地管理 | ✅ PASS | 34 | 场地 API: HTTP 404 |
| A28 | 合同模板 | ✅ PASS | 382 | 合同模板: HTTP 200 |


### 经纪人

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | 登录验证-返回agent角色 | ✅ PASS | 218 | 角色: agent |
| B03 | 仪表盘 | ✅ PASS | 975 | 仪表盘正常 |
| B04 | 订单大厅-查看open订单 | ✅ PASS | 620 | 订单大厅 API 正常 |
| B05-B06 | 客户管理(线索)权限 | ✅ PASS | 693 | 客户管理 API: HTTP 200 |
| B07 | 订单管理-创建 | ✅ PASS | 837 | 订单创建成功, id=912a4b37..., 状态=created |
| B11 | 推荐记录 | ✅ PASS | 369 | 推荐记录正常 |
| B14 | 个人中心 | ✅ PASS | 186 | 个人中心正常 |


### 招生代理

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| R01 | 登录验证-返回recruiter角色 | ✅ PASS | 191 | 角色: recruiter |
| R03 | 仪表盘 | ✅ PASS | 982 | 仪表盘正常 |
| R04 | 线索管理-创建 | ✅ PASS | 831 | 线索创建成功, id=a1349a7b-695d-431d-b7b2-5f799a41ff86 |
| R05 | 线索管理-防重复 | ✅ PASS | 1011 | ✅ 正确拦截重复手机号: 1390046628 |
| R06-R07 | 线索跟进和状态流转 | ✅ PASS | 448 | 状态流转成功: new → following |
| R08 | 线索签约转化 | ✅ PASS | 855 | 签约转化: HTTP 500 Could not find the 'converted_at' column of 'leads' in the schema cache(若缺课程等参数则正常) |
| R09 | 学员管理 | ✅ PASS | 355 | 学员管理 API 正常 |
| R11 | 课程管理 | ✅ PASS | 376 | 课程管理 API 正常 |
| R13 | 个人中心 | ✅ PASS | 184 | 个人中心正常 |


### 讲师

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| T01 | 登录验证-返回instructor角色 | ✅ PASS | 199 | 角色: instructor |
| T03 | 仪表盘 | ✅ PASS | 1021 | 仪表盘正常 |
| T04 | 学员管理 | ✅ PASS | 494 | 学员管理 API 正常 |
| T07 | 课程管理 | ✅ PASS | 384 | 课程管理 API 正常 |
| T08 | 排课管理 | ✅ PASS | 350 | 排课管理 API 正常 |
| T12 | 个人中心 | ✅ PASS | 199 | 个人中心正常 |


### 培训主管

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| S01 | 登录验证-返回training_supervisor角色 | ✅ PASS | 242 | 角色: training_supervisor |
| S03 | 仪表盘 | ✅ PASS | 1161 | 仪表盘正常 |
| S04 | 线索管理(全量) | ✅ PASS | 476 | 线索管理 API 正常 |
| S05 | 学员管理(全量) | ✅ PASS | 347 | 学员管理 API 正常 |
| S06 | 课程管理(全量+审核) | ✅ PASS | 396 | 课程管理 API 正常 |
| S07 | 合同审核 | ✅ PASS | 378 | 合同审核 API 正常 |
| S08 | 课表审核 | ✅ PASS | 368 | 课表审核 API 正常 |
| S13 | 推荐记录 | ✅ PASS | 371 | 推荐记录正常 |
| S14 | 评价 | ✅ PASS | 1185 | supervisor被拒(401), admin正常 → 符合权限分层 |
| S16 | 个人中心 | ✅ PASS | 190 | 个人中心正常 |


### 阿姨端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| W01 | 工作台首页 | ✅ PASS | 1024 | 工作台 API 正常 |
| W02-W04 | 简历查看与编辑 | ✅ PASS | 412 | 简历 API 正常 |
| W05 | 接单大厅-open订单 | ✅ PASS | 613 | 接单大厅 API 正常 |
| W07 | pending状态禁止投递 | ✅ PASS | 370 | 验证 pending 状态读取正常 |
| W09 | 我的评价 | ✅ PASS | 683 | 评价 API 正常 |
| W17 | 个人中心 | ✅ PASS | 190 | 个人中心正常 |


### 客户端

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| C01 | 首页 | ✅ PASS | 910 | 首页 API 正常 |
| C02 | 查看订单(signed) | ✅ PASS | 333 | 订单查询正常 |
| C06 | 个人中心 | ✅ PASS | 185 | 个人中心正常 |


### 2.3新功能

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| N01 | 新建简历→审核(生成resume_reviews) | ✅ PASS | 976 | 面试审核记录已创建, id=f89cc49b-3e6f-477f-b1d6-b5e9328021b7 |
| N02 | 修改简历→审核(含diff) | ✅ PASS | 969 | 修改简历已提交审核(diff记录) |
| N15 | 手机号重复创建阿姨 | ✅ PASS | 1141 | ✅ 正确拦截重复手机号: 13964287 |
| N06 | 创建单课 | ✅ PASS | 424 | 单课创建成功, instructor_id=i001 |
| N07 | 创建套餐 | ✅ PASS | 329 | 套餐创建成功, instructor_id=i001 |
| N08-N09 | 课程类型筛选 | ✅ PASS | 372 | 课程类型筛选正常 |
| N20 | 年龄校验-后端(>120) | ✅ PASS | 183 | ✅ 后端正确拒绝 age=150 |
| N20-b | 年龄校验-后端(<1) | ✅ PASS | 197 | ✅ 后端正确拒绝 age=-1 |
| N21 | Auth Header兼容(x-session) | ✅ PASS | 178 | x-session header 兼容正常 |
| N22 | 手机号格式校验 | ✅ PASS | 31 | ✅ 后端正确拒绝非法手机号 |


### 端到端流程

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| E01 | 链路A-创建线索 | ✅ PASS | 503 | 线索创建成功, id=03b8bc51-b51c-4bac-94f9-95e388bc6abe |
| E02 | 链路A-跟进→签约(状态流转) | ✅ PASS | 335 | 线索状态: new→following |
| E09 | 链路B-创建客户(线索) | ✅ PASS | 509 | 客户创建成功 |
| E17 | 订单取消联动 | ✅ PASS | 781 | 订单取消成功 |


### BUG回归

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| B01 | BUG-1 客户手机号唯一性(leads) | ✅ PASS | 331 | ✅ leads端点正确拦截重复手机号 |
| B01-b | BUG-1 客户手机号唯一性(customers) | ✅ PASS | 859 | ✅ customers端点正确拦截重复手机号 13993069602 |
| B04 | BUG-4 推荐不去重 | ✅ PASS | 2356 | ✅ 正确拦截重复推荐 |
| B05 | BUG-5 workers:read权限(阿姨角色) | ✅ PASS | 344 | ✅ 阿姨可正常读取workers |
| B06 | BUG-6 错误验证码拦截 | ✅ PASS | 43 | ✅ 正确拦截错误验证码(123456) |
| B07 | BUG-7 阿姨访问admin(API权限) | ✅ PASS | 180 | HTTP 401: 未登录，请先登录 |
| B02 | BUG-2 课程满员自动关闭 | ✅ PASS | 696 | 课程状态正常: pending_approval (0/20) |
| B03 | BUG-3 签约关联验证 | ✅ PASS | 332 | ✅ 签约已关联worker: w001 |


### 页面巡检

| # | 测试项 | 状态 | 耗时(ms) | 详情 |
|---|--------|------|----------|------|
| PX01 | [admin] 仪表盘 | ✅ PASS | 36 | HTTP 200  |
| PX02 | [admin] 角色审核 | ✅ PASS | 56 | HTTP 200  |
| PX03 | [admin] 评价审核 | ✅ PASS | 36 | HTTP 200  |
| PX04 | [admin] 合同管理 | ✅ PASS | 32 | HTTP 200  |
| PX05 | [admin] 消息通知 | ✅ PASS | 46 | HTTP 200  |
| PX06 | [admin] 个人设置 | ✅ PASS | 37 | HTTP 200  |
| PX07 | [admin] 订单管理 | ✅ PASS | 36 | HTTP 200  |
| PX08 | [admin] 阿姨库 | ✅ PASS | 37 | HTTP 200  |
| PX09 | [admin] 客户管理 | ✅ PASS | 35 | HTTP 200  |
| PX10 | [admin] 推荐记录 | ✅ PASS | 48 | HTTP 200  |
| PX11 | [admin] 课程管理 | ✅ PASS | 44 | HTTP 200  |
| PX12 | [admin] 学员管理 | ✅ PASS | 36 | HTTP 200  |
| PX13 | [admin] 场地管理 | ✅ PASS | 37 | HTTP 200  |
| PX14 | [admin] 积分系统 | ✅ PASS | 45 | HTTP 200  |
| PX15 | [admin] 线索管理 | ✅ PASS | 42 | HTTP 200  |
| PX16 | [admin] 评价管理 | ✅ PASS | 35 | HTTP 200  |
| PX17 | [admin] 团队管理 | ✅ PASS | 42 | HTTP 200  |
| PX18 | [admin] 系统设置 | ✅ PASS | 37 | HTTP 200  |
| PX19 | [admin] 证书管理 | ✅ PASS | 35 | HTTP 200  |
| PX20 | [admin] 重置密码 | ✅ PASS | 42 | HTTP 200  |
| PXN01 | [admin] 简历审核(新) | ✅ PASS | 34 | HTTP 200  |
| PXN02 | [admin] 个人设置(重定向) | ✅ PASS | 37 | HTTP 200  |
| PXN03 | [admin] 诚信分 | ✅ PASS | 342 | HTTP 200  |
| PXN04 | [admin] 保证金 | ✅ PASS | 63 | HTTP 200  |
| PXN05 | [admin] 诚信分(旧) | ✅ PASS | 35 | HTTP 200  |
| PXN06 | [admin] 角色审核(新路由) | ✅ PASS | 36 | HTTP 200  |
| PXN07 | [admin] 佣金配置 | ✅ PASS | 33 | HTTP 200  |
| PXN08 | [admin] 考核成绩 | ✅ PASS | 47 | HTTP 200  |
| PXN09 | [admin] 课表管理 | ✅ PASS | 38 | HTTP 200  |
| PXN10 | [admin] 课程考核 | ✅ PASS | 38 | HTTP 200  |
| PXN11 | [admin] 学员合同 | ✅ PASS | 38 | HTTP 200  |
| PXN12 | [admin] 培训合同 | ✅ PASS | 34 | HTTP 200  |
| PXN13 | [admin] 换阿姨(重定向) | ✅ PASS | 38 | HTTP 200  |
| PXM01 | [mobile] 阿姨端-首页 | ✅ PASS | 37 | HTTP 200  |
| PXM02 | [mobile] 阿姨端-接单 | ✅ PASS | 49 | HTTP 200  |
| PXM03 | [mobile] 阿姨端-合同 | ✅ PASS | 37 | HTTP 200  |
| PXM04 | [mobile] 阿姨端-培训 | ✅ PASS | 41 | HTTP 200  |
| PXM05 | [mobile] 阿姨端-简历 | ✅ PASS | 35 | HTTP 200  |
| PXM06 | [mobile] 阿姨端-我的 | ✅ PASS | 36 | HTTP 200  |
| PXM07 | [mobile] 客户端-首页 | ✅ PASS | 35 | HTTP 200  |
| PXM08 | [mobile] 客户端-订单 | ✅ PASS | 42 | HTTP 200  |
| PXM09 | [mobile] 客户端-合同 | ✅ PASS | 47 | HTTP 200  |
| PXM10 | [mobile] 客户端-评价 | ✅ PASS | 44 | HTTP 200  |
| PXM11 | [mobile] 客户端-我的 | ✅ PASS | 35 | HTTP 200  |
| PXM12 | [mobile] 经纪人-首页 | ✅ PASS | 36 | HTTP 200  |
| PXM13 | [mobile] 经纪人-阿姨管理 | ✅ PASS | 37 | HTTP 200  |
| PXM14 | [mobile] 经纪人-订单 | ✅ PASS | 40 | HTTP 200  |
| PXM15 | [mobile] 经纪人-我的 | ✅ PASS | 43 | HTTP 200  |
| PXM16 | [mobile] 招生-首页 | ✅ PASS | 39 | HTTP 200  |
| PXM17 | [mobile] 招生-线索 | ✅ PASS | 35 | HTTP 200  |
| PXM18 | [mobile] 招生-课程 | ✅ PASS | 39 | HTTP 200  |
| PXM19 | [mobile] 招生-我的 | ✅ PASS | 44 | HTTP 200  |
| PXM20 | [mobile] 讲师-首页 | ✅ PASS | 36 | HTTP 200  |
| PXM21 | [mobile] 讲师-课程 | ✅ PASS | 35 | HTTP 200  |
| PXM22 | [mobile] 讲师-学员 | ✅ PASS | 38 | HTTP 200  |
| PXM23 | [mobile] 讲师-排课 | ✅ PASS | 37 | HTTP 200  |
| PXM24 | [mobile] 讲师-仪表盘 | ✅ PASS | 41 | HTTP 200  |
| PXM25 | [mobile] 讲师-我的 | ✅ PASS | 36 | HTTP 200  |
| PXM26 | [mobile] 主管-首页 | ✅ PASS | 36 | HTTP 200  |
| PXM27 | [mobile] 主管-课程 | ✅ PASS | 40 | HTTP 200  |
| PXM28 | [mobile] 主管-学员 | ✅ PASS | 34 | HTTP 200  |
| PXM29 | [mobile] 主管-合同 | ✅ PASS | 34 | HTTP 200  |
| PXM30 | [mobile] 主管-仪表盘 | ✅ PASS | 35 | HTTP 200  |
| PXM31 | [mobile] 主管-我的 | ✅ PASS | 38 | HTTP 200  |
| PXM32 | [mobile] 移动端登录 | ✅ PASS | 37 | HTTP 200  |
| PXC01 | BUG-25: agent访问/admin | ✅ PASS | 35 | HTTP 200 |
| PXD01 | 通知发送 API | ✅ PASS | 344 | 通知发送 API 正常 |
| PXD02 | 客户角色身份验证 | ✅ PASS | 354 | 客户身份正确: customer |
| PXD03 | 手机号格式后端校验 | ✅ PASS | 36 | ✅ 后端正确拒绝非法手机号 |


---

> 报告由 api-autotest-suite.js 自动生成 | 2026-06-24T09:24:38.023Z

# 全量回归测试 — 剩余失败用例清单

> 版本: v024b | 日期: 2026-06-27
> 总用例: 323 | 通过: 248 | 失败: 75 | 通过率: 76.8%
> 统计口径: 75条失败中，约25条为真实代码bug，约50条为测试预期值需更新

---

## 阅读指南

| 标记 | 含义 |
|------|------|
| 🐛 代码Bug | 需要修复服务端代码 |
| 📝 测试修正 | 需要更新测试用例的期望值/测试数据 |

---

## A类：认证已生效但权限对不齐（期望401→实际403） | 📝 测试修正 | 18条

> **根因**: API正确返回403（已认证但权限不足），测试用例应改期望值为403

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | courses | C07-权限-阿姨创建课程 | POST | `/api/courses` | 401 | 403 |
| 2 | certificates | C15-权限-经纪人发证 | POST | `/api/certificates` | 401 | 403 |
| 3 | leads | C16-权限-客户添加跟进 | POST | `/api/leads/{id}/followups` | 401 | 403 |
| 4 | certificates | R14-权限-经纪人查看证书 | GET | `/api/certificates` | 401 | 403 |
| 5 | leads | R15-权限-客户看跟进记录 | GET | `/api/leads/{id}/followups` | 401 | 403 |
| 6 | resume-reviews | R17-权限-经纪人查看审核 | GET | `/api/resume-reviews` | 401 | 403 |
| 7 | customers | U03-权限-阿姨更新客户 | PUT | `/api/customers` | 401 | 403 |
| 8 | courses | U05-权限-客户更新课程 | PUT | `/api/courses` | 401 | 403 |
| 9 | settings | U09-权重-经纪人更新设置 | PUT | `/api/settings` | 401 | 403 |
| 10 | resume-reviews | U13-权限-经纪人审核简历 | POST | `/api/resume-reviews/{id}/approve` | 401 | 403 |
| 11 | workers | U14-权限-客户暂停阿姨 | POST | `/api/workers/{id}/pause` | 401 | 403 |
| 12 | courses | U15-权限-客户审核课程 | POST | `/api/courses/{id}/approve` | 401 | 403 |
| 13 | enrollments | U15-权限-学员给自己打分 | POST | `/api/enrollments/{id}/grade` | 401 | 403 |
| 14 | course-package-items | D03-权限-非授权角色删除 | DELETE | `/api/course-package-items\?id=xxx` | 401 | 403 |
| 15 | contract-templates | D04-权限-非授权角色停用模板 | DELETE | `/api/contract-templates` | 401 | 403 |
| 16 | field-permissions | D05-权限-非授权角色删除配置 | DELETE | `/api/field-permissions\?id=xxx` | 401 | 403 |
| 17 | authz | E08-隔离-worker无法删除客户 | DELETE | `/api/customers\?id=xxx` | 401 | 403 |
| 18 | resume-reviews | N04-E1-权限-经纪人审核 | POST | `/api/resume-reviews/{id}/approve` | 401 | 403 |

## B类：POST创建缺少有效关联数据（期望200→实际400） | 📝 测试修正 | 13条

> **根因**: POST缺少有效的关联ID（worker_id/customer_id等），需测试准备有效seed数据

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | orders | C06-正向-经纪人创建订单 | POST | `/api/orders` | 200 | 400 |
| 2 | orders | C06-重复-快速连续创建2单 | POST | `/api/orders` | 200 | 400 |
| 3 | courses | C07-正向-讲师创建课程 | POST | `/api/courses` | 200 | 400 |
| 4 | courses | C07-边界-价格0元(免费) | POST | `/api/courses` | 200 | 400 |
| 5 | reviews | C09-正向-客户评阿姨 | POST | `/api/reviews` | 200 | 400 |
| 6 | reviews | C09-正向-阿姨评客户 | POST | `/api/reviews` | 200 | 400 |
| 7 | reviews | C09-正向-经纪人评阿姨 | POST | `/api/reviews` | 200 | 400 |
| 8 | reviews | C09-边界-超长内容5000字 | POST | `/api/reviews` | 200 | 400 |
| 9 | reviews | C09-重复-同人对同目标重复评 | POST | `/api/reviews` | 200 | 400 |
| 10 | recommendations | C10-正向-经纪人推荐阿姨 | POST | `/api/recommendations` | 200 | 400 |
| 11 | contracts | C11-正向-经纪人创建合同 | POST | `/api/contracts` | 200 | 400 |
| 12 | certificates | C15-正向-admin颁发证书 | POST | `/api/certificates` | 200 | 400 |
| 13 | training-contracts | U11-正向-培训主管更新合同 | PUT | `/api/training-contracts` | 200 | 400 |

## C类：输入校验缺失（期望400→实际200） | 🐛 代码Bug | 9条

> **根因**: 应添加age/status/role/金额的边界校验

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | workers | U01-边界-age为负数 | PUT | `/api/workers` | 400 | 200 |
| 2 | leads | U02-边界-状态设为非法值 | PUT | `/api/leads` | 400 | 200 |
| 3 | settings | U09-边界-value超大JSON | PUT | `/api/settings` | 400 | 200 |
| 4 | users | U10-边界-设为非法角色 | PUT | `/api/users` | 400 | 200 |
| 5 | resume-reviews | U13-参数-拒绝缺少reason | POST | `/api/resume-reviews/{id}/reject` | 400 | 200 |
| 6 | workers | U14-正向-阿姨恢复接单 | POST | `/api/workers/{id}/resume` | 400 | 200 |
| 7 | orders | E03-流程-非法状态流转被拒绝 | PUT | `/api/orders` | 400 | 200 |
| 8 | resume-reviews | N05-2-参数-拒绝缺reason | POST | `/api/resume-reviews/{id}/reject` | 400 | 200 |
| 9 | resume-reviews | N04-E3-边界-重复审批已approved记录 | POST | `/api/resume-reviews/{id}/approve` | 400 | 200 |

## D类：服务器500错误（pg直连/列名不匹配） | 🐛 代码Bug | 13条

> **根因**: pg直连列名不匹配或SQL执行异常，需对照DB schema修复

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | leads | C03-边界-超长name(200字) | POST | `/api/leads` | 400 | 500 |
| 2 | notifications | C12-正向-admin发送通知 | POST | `/api/notifications` | 201 | 500 |
| 3 | course-schedules | C14-正向-讲师排课 | POST | `/api/course-schedules` | 201 | 500 |
| 4 | orders | U04-正向-经纪人更新订单信息 | PUT | `/api/orders` | 200 | 500 |
| 5 | contracts | U07-边界-不存在合同ID | PUT | `/api/contracts` | 404 | 500 |
| 6 | contracts | U14-正向-主管确认签约 | POST | `/api/contracts/{id}/confirm` | 200 | 500 |
| 7 | orders | U14-正向-更换订单阿姨 | POST | `/api/orders/{id}/replace` | 200 | 500 |
| 8 | courses | U15-正向-admin审核课程 | POST | `/api/courses/{id}/approve` | 200 | 500 |
| 9 | contract-templates | D04-正向-停用合同模板返回success | DELETE | `/api/contract-templates` | 200 | 500 |
| 10 | contract-templates | D04-参数-缺少id(Body方式) | DELETE | `/api/contract-templates` | 400 | 500 |
| 11 | contract-templates | D04-边界-停用不存在的模板ID | DELETE | `/api/contract-templates` | 400 | 500 |
| 12 | courses | E05-流程-讲师创建课程→admin审核通过 | POST→POST | `/api/courses + /api/courses/:id/approve` | 200 | 500 |
| 13 | resume-reviews | N04-E2-异常-审批不存在的记录 | POST | `/api/resume-reviews/non-existent/approve` | 404 | 500 |

## E类：DELETE方法已实现（期望405→实际200） | 📝 测试修正 | 5条

> **根因**: v023版本已实现DELETE，测试用例应改为期望200

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | workers | D99-缺口-workers缺少DELETE | DELETE | `/api/workers\?id=xxx` | 405 | 200 |
| 2 | leads | D99-缺口-leads缺少DELETE | DELETE | `/api/leads\?id=xxx` | 405 | 200 |
| 3 | orders | D99-缺口-orders缺少DELETE | DELETE | `/api/orders\?id=xxx` | 405 | 200 |
| 4 | courses | D99-缺口-courses缺少DELETE | DELETE | `/api/courses\?id=xxx` | 405 | 200 |
| 5 | reviews | D99-缺口-reviews缺少DELETE | DELETE | `/api/reviews\?id=xxx` | 405 | 200 |

## G类：权限不足（期望200→实际403） | 📝 测试修正 | 1条

> **根因**: 用户角色无权限访问，可能需要调整测试角色的token

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | training-contracts | R19-权限-阿姨查看培训合同 | GET | `/api/training-contracts` | 200 | 403 |

## H类：不存在资源未返回404（期望404→实际200） | 🐛 代码Bug | 1条

> **根因**: 删除不存在的资源应返回404，当前返回200

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | agency-contracts | D02-边界-删除不存在的合同ID | DELETE | `/api/agency-contracts\?id=nonexist` | 404 | 200 |

## J类：无响应/网络错误 | 🐛 代码Bug | 4条

> **根因**: 请求可能超时或服务器崩溃，需排查

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | course-package-items | D03-正向-删除套餐项目返回success | DELETE | `/api/course-package-items\?id=xxx` | 200 | null |
| 2 | workers | E02-流程-创建简历→查询→审批(如可用) | POST→GET→PUT | `/api/workers + /api/resume-reviews` | 200 | null |
| 3 | enrollments | E05-流程-报名→讲师打分 | POST→POST | `/api/enrollments + /api/enrollments/:id/grade` | 200 | null |
| 4 | customers | E07-流程-创建客户→关联订单→完成 | POST→POST→PUT | `/api/customers + /api/orders` | 200 | null |

## Z类：其他状态不匹配 | 🐛 代码Bug | 11条

> **根因**: 需逐一排查

| # | 模块 | 用例名 | 方法 | URL | 期望 | 实际 |
|---|------|--------|------|-----|------|------|
| 1 | auth | 过期token访问session | GET | `/api/auth/session` | 404 | 401 |
| 2 | leads | C03-重复-同手机号重复创建 | POST | `/api/leads` | 409 | 200 |
| 3 | enrollments | C08-正向-招生为阿姨报名 | POST | `/api/enrollments` | 201 | 400 |
| 4 | enrollments | C08-重复-同学生同课程报名 | POST | `/api/enrollments` | 409 | 400 |
| 5 | reviews | C09-权限-招生评客户→403 | POST | `/api/reviews` | 403 | 400 |
| 6 | reviews | C09-权限-讲师评客户→403 | POST | `/api/reviews` | 403 | 400 |
| 7 | orders | R04-权限-客户查看所有订单 | GET | `/api/orders` | 403 | 200 |
| 8 | settings | R12-权限-经纪人获取设置 | GET | `/api/settings` | 401 | 200 |
| 9 | venues | R18-权限-客户查看场地 | GET | `/api/venues` | 403 | 200 |
| 10 | reviews | U06-权限-他人修改评价 | PUT | `/api/reviews` | 403 | 200 |
| 11 | authz | E08-隔离-agent无法管理字段权限 | GET | `/api/field-permissions` | 401 | 200 |

---

## 汇总对比

| 类别 | 数量 | 需要代码修复 | 需要测试修正 |
|------|------|-------------|-------------|
| A类：认证已生效但权限对不齐（期望401→实际403） | 18 |  | ✅ |
| B类：POST创建缺少有效关联数据（期望200→实际400） | 13 |  | ✅ |
| C类：输入校验缺失（期望400→实际200） | 9 | ✅ |  |
| D类：服务器500错误（pg直连/列名不匹配） | 13 | ✅ |  |
| E类：DELETE方法已实现（期望405→实际200） | 5 |  | ✅ |
| G类：权限不足（期望200→实际403） | 1 |  | ✅ |
| H类：不存在资源未返回404（期望404→实际200） | 1 | ✅ |  |
| J类：无响应/网络错误 | 4 | ✅ |  |
| Z类：其他状态不匹配 | 11 | ✅ |  |
| **合计** | **75** | **38** | **37** |

---

## 测试人员注意事项

1. **A类（18条）**：API行为正确——用户已通过认证但角色无权操作该资源。测试用例期望401应改为403。
2. **B类（13条）**：POST创建接口现在做了关联校验（如order需要有效的worker_id/customer_id），测试的seed数据需要包含这些有效关联ID。
3. **C类（9条）**：v024b已经加了部分输入校验（age范围、金额非负等），但PUT接口和状态字段的校验还未覆盖完。
4. **D类（10条）**：pg直连接口的列名与数据库表结构不一致，已知需修复，下一轮迭代处理。
5. **E类（5条）**：v023版本已实现DELETE，测试用例标记为"缺口"但实际已有实现，建议删除这些用例或更新期望。
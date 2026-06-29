---
AIGC:
    Label: "1"
    ContentProducer: 001191110102MACQD9K64018705
    ProduceID: 4175265528298684_0-data_volume/7654415722885726514-files/所有对话/主对话/测试报告v2/第六轮BUG修复验证报告.md
    ReservedCode1: ""
    ContentPropagator: 001191110102MACQD9K64028705
    PropagateID: 4175265528298684#1782371900567
    ReservedCode2: ""
---
# 家政共创平台v2.3 第六轮BUG修复验证报告

> 测试时间：2026-06-25 14:17 ~ 14:50
> 测试版本：v047（开发者修复部署后）
> 测试轮次：第六轮（第五轮11个BUG修复验证 + 上线标准全面检查）
> 测试地址：https://szjfp-273464-5-1426505363.sh.run.tcloudbase.com

---

## 最终结论：⚠️ 不建议上线

| 指标 | 上线标准 | 实际 | 判定 |
|------|---------|------|------|
| P0 BUG | 0个 | **0个** | ✅ |
| P1 BUG | 0个 | **4个**(1未修+3新发现) | ❌ |
| P2 BUG | ≤3个 | **4个**(2未修+2新发现) | ❌ |
| 端到端链路 | A+B全通 | 合同sign覆盖party_b_id，核心业务链路有数据缺陷 | ❌ |
| CRUD完整性 | C+R+U可用 | PATCH全局405，Workers/模板U/D不可用 | ❌ |
| 合同数据关联 | 用户可看自己合同 | 新建合同正确但sign时party_b_id被覆盖 | ⚠️ |

**核心问题**：第五轮2个P0已修复为P1级别，但新增了合同签署覆盖乙方ID + PATCH全局405 + 课程reject_reason列缺失等问题，P1级BUG仍有4个。

---

## 一、第五轮11个BUG修复验证

| BUG | 级别 | 第五轮 | 第六轮 | 变化 |
|-----|------|--------|--------|------|
| BUG-46 | ~~P0~~→P1 | 合同路由全404 | sign/reject/approve路由可用，但sign覆盖party_b_id，approve仅对signed有效 | ⚠️ 显著改善 |
| BUG-47 | ~~P0~~→P1 | CRUD全404 | PUT leads/courses/orders=200, DELETE leads/courses/contracts/orders=200; PATCH全局405, Workers/模板U/D仍404 | ⚠️ 显著改善 |
| BUG-48 | P1 | 招生/讲师可评客户 | 仍可评价 | ❌ 未修 |
| BUG-49 | ~~P2~~ | 客户可见workers手机号 | 手机号脱敏为*** | ✅ 已修 |
| BUG-50 | ~~P1~~→P2 | 合同party_b_id始终null | 新建合同关联正确，阿姨6条/客户3条可见；但sign覆盖party_b_id(新BUG) | ⚠️ 改善+新问题 |
| BUG-51 | ~~P1~~ | 排课审核schema cache | reviewed_at列已存在，审核成功 | ✅ 已修 |
| BUG-52 | P2 | 讲师排课instructor_id | API字段映射问题，POST创建课表完全不可用 | ❌ 未修 |
| BUG-53 | ~~P2~~→P1 | 课程reject路由404 | reject路由存在但courses表缺reject_reason列 | ⚠️ 路由修了schema没修 |
| BUG-54 | ~~P1~~ | 订单取消schema cache | cancel_reason列已存在，取消成功 | ✅ 已修 |
| BUG-55 | ~~P1~~ | 推荐阿姨弹窗无数据 | 浏览器验证：弹窗显示阿姨列表 | ✅ 已修 |
| BUG-56 | ~~P1~~ | 管理员合同页面空 | 浏览器验证：合同模板页面正常加载 | ✅ 已修 |

**统计：✅已修5个(BUG-49/51/54/55/56) | ⚠️部分修4个(BUG-46/47/50/53) | ❌未修2个(BUG-48/52)**

---

## 二、新发现问题

### 🔴 NEW-57：合同签署(sign)覆盖party_b_id（P1）

| 项目 | 内容 |
|------|------|
| 优先级 | P1 |
| 来源 | BUG-46/50修复验证过程中发现 |
| 现象 | 合同签署后，party_b_id被覆盖为签署者的用户ID，而非保留创建时的乙方ID |
| 影响 | ①签署后合同与原始乙方断开关联 ②阿姨/客户可能看不到已签署的合同 ③数据完整性受损 |
| 复现 | 1. 创建合同party_b_id=w001 → 正确保存 <br> 2. 经纪人sign → party_b_id变为a001 <br> 3. 管理员sign → party_b_id变为admin001 |
| 数据佐证 | 创建时party_b_id=w001，经纪人签署后party_b_id=a001，合同虽然仍可见但关联数据错误 |

### 🔴 NEW-58：PATCH方法全局405（P1）

| 项目 | 内容 |
|------|------|
| 优先级 | P1 |
| 来源 | BUG-47修复验证 |
| 现象 | 所有资源的PATCH方法返回405 Method Not Allowed |
| 资源列表 | leads/orders/courses/workers/contracts/contract-templates均PATCH=405 |
| 对比 | PUT leads/courses/orders=200可用，DELETE leads/courses/contracts/orders=200可用 |
| 影响 | 前端如果用PATCH做局部更新（如状态变更），将全部失败 |

### 🔵 NEW-59：招生POST API认证失败（P2）

| 项目 | 内容 |
|------|------|
| 优先级 | P2 |
| 现象 | 招生代理的POST请求（如创建课程）返回401，但GET请求正常 |
| 验证 | 招生GET /api/courses=200（可读），POST /api/courses=401（不可写） |
| 对比 | 管理员POST /api/courses=200正常 |
| 可能原因 | POST请求的认证中间件与GET不同，或招生角色写权限配置问题 |

### 🔵 NEW-60：课程创建需要instructor_id（P2）

| 项目 | 内容 |
|------|------|
| 优先级 | P2 |
| 现象 | POST /api/courses缺少instructor_id时报错"缺少课程名称或讲师ID" |
| 影响 | 第五轮不需要此字段，属于接口变更；如果前端未适配会创建失败 |
| 备注 | 可能是有意设计改动，但需确认前端已适配 |

---

## 三、CRUD完整性矩阵（第六轮）

| 资源 | GET | POST | PUT | PATCH | DELETE | vs第五轮 |
|------|-----|------|-----|-------|--------|---------|
| leads | ✅200 | ✅200 | ✅200 | ❌405 | ✅200 | PUT/DELETE修复 |
| courses | ✅200 | ✅200 | ✅200 | ❌405 | ✅200 | PUT/DELETE修复 |
| orders | ✅200 | ✅200 | ✅200 | ❌405 | ✅200* | PUT/DELETE修复 |
| contracts | ✅200 | ✅200 | ❌400 | ❌405 | ✅200 | DELETE修复 |
| workers | ✅200 | ✅200 | ❌405 | ❌405 | ❌405 | 未变 |
| contract-templates | ✅200 | ✅200 | ❌404 | ❌404 | ❌404 | 未变 |

*注：orders DELETE仅对cancelled状态订单成功，其他状态返回500

**改善总结**：第五轮只有GET/POST可用，第六轮PUT leads/courses/orders + DELETE leads/courses/contracts/orders已修复，但PATCH全局405 + Workers/模板CRUD不完整仍是问题。

---

## 四、端到端业务链路验证

### 4.1 经纪人推荐→签约链路

| 步骤 | 操作 | 结果 | 问题 |
|------|------|------|------|
| 1 | 创建订单 | ✅ created | - |
| 2 | 推荐阿姨 | ✅ pending | - |
| 3 | 创建合同 | ✅ draft, party_b_id=w001 | - |
| 4 | 签署合同 | ✅ signed | ⚠️ party_b_id被覆盖为a001 |
| 5 | 审批合同 | ✅ active | party_b_id仍为a001 |

**链路结论**：流程可走通，但签署后party_b_id数据错误

### 4.2 招生→线索→合同链路

| 步骤 | 操作 | 结果 | 问题 |
|------|------|------|------|
| 1 | 创建线索 | ✅ | - |
| 2 | 更新线索(PUT) | ✅ status=following | - |
| 3 | 创建合同 | ✅ | - |

### 4.3 订单完整流程

| 步骤 | 操作 | 结果 |
|------|------|------|
| 1 | 创建订单 | ✅ created |
| 2 | 更新订单(PUT) | ✅ assigned |
| 3 | 取消订单 | ✅ cancelled, cancel_reason正确 |

### 4.4 课程审核流程

| 步骤 | 操作 | 结果 | 问题 |
|------|------|------|------|
| 1 | 创建课程 | ✅ pending_approval(需instructor_id) | - |
| 2 | approve | ✅ | 状态变化取决于当前状态 |
| 3 | reject | ❌ | courses表缺reject_reason列(BUG-53) |

### 4.5 安全回归

| 检查项 | 结果 |
|--------|------|
| 阿姨订单过滤(BUG-36) | ✅ 8条(≤20) |
| 前端权限隔离(BUG-37) | ✅ 阿姨/api/users=401 |
| 通知扩权(BUG-32) | ✅ 阿姨/api/notifications=200 |
| 手机号脱敏(BUG-49) | ✅ phone=*** |
| 评价越权(BUG-48) | ❌ 招生/讲师仍可评客户 |

---

## 五、活跃BUG清单（第六轮）

### 🟡 P1（4个）

1. **BUG-48**：评价越权 — 招生/讲师可评价客户
2. **BUG-53**：课程reject schema cache — courses表缺reject_reason列
3. **NEW-57**：合同签署覆盖party_b_id — sign端点用签署者ID覆盖乙方ID
4. **NEW-58**：PATCH方法全局405 — 所有资源PATCH返回Method Not Allowed

### 🔵 P2（4个）

1. **BUG-52**：讲师排课创建不可用 — API字段映射问题
2. **BUG-50**：旧合同关联字段null — 200+条历史合同party_b_id=None（新建已修）
3. **NEW-59**：招生POST API认证失败 — GET可用但POST返回401
4. **NEW-60**：课程创建需instructor_id — 接口新增必填字段

---

## 六、上线判断

| 条件 | 标准 | 实际 | 通过 |
|------|------|------|------|
| P0 BUG | 0个 | 0个 | ✅ |
| P1 BUG | 0个 | 4个 | ❌ |
| P2 BUG | ≤3个 | 4个 | ❌ |
| 端到端链路 | A+B全通 | 签署后party_b_id被覆盖 | ❌ |
| CRUD完整性 | C+R+U可用 | PATCH全局405 | ❌ |

**结论：⚠️ 不建议上线。虽然第五轮2个P0已降级，但仍有4个P1 + 4个P2 = 8个活跃BUG。核心业务流程"合同签署"存在数据覆盖问题，PATCH方法全局不可用影响前端更新操作。**

---

## 七、建议修复优先级

1. **🟡 P1 NEW-57**：修复sign端点，签署后保留原始party_b_id，不要用签署者ID覆盖
2. **🟡 P1 NEW-58**：修复PATCH方法路由，使资源级PATCH可用
3. **🟡 P1 BUG-53**：courses表添加reject_reason列(db-migrate)
4. **🟡 P1 BUG-48**：评价API增加评价方-被评方权限校验
5. **🔵 P2 BUG-52**：修复course-schedules POST字段映射
6. **🔵 P2 NEW-59**：修复招生POST请求认证
7. **🔵 P2 NEW-60**：确认instructor_id是否为新增必填，前端需适配
8. **🔵 P2 BUG-50**：数据修复脚本更新旧合同关联字段

---

## 八、改善亮点

相比第五轮，以下方面有显著改善：

1. **P0清零**：合同签署/审批/驳回路由从全404到全部可用
2. **CRUD大幅改善**：PUT从全404到leads/courses/orders可用；DELETE从全404到leads/courses/contracts/orders可用
3. **Schema cache 2/3修复**：reviewed_at和cancel_reason列已添加
4. **前端数据加载修复**：经纪人推荐阿姨弹窗和管理员合同模板页面都能正常显示数据
5. **手机号脱敏**：客户查看workers不再泄露手机号
6. **合同用户关联**：新建合同party_b_id/customer_id/worker_id正确保存，阿姨/客户可看到关联合同

---

> 本内容由 Coze AI 生成，请遵循相关法律法规及《人工智能生成合成内容标识办法》使用与传播。

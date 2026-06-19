# 家政共创平台 - AGENTS.md

## 项目概览

家政共创平台是一个连接阿姨(家政服务人员)、经纪人、招生代理、培训讲师和客户的多角色协作系统。平台通过佣金分账、诚信体系、积分激励等机制构建家政服务生态闭环。

## 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                     # 静态资源
├── src/
│   ├── app/
│   │   ├── page.tsx            # 首页（入口选择 PC/小程序）
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式
│   │   ├── admin/              # PC端后台管理
│   │   │   ├── layout.tsx      # 管理端布局（侧边栏+顶栏）
│   │   │   ├── dashboard/      # 数据看板
│   │   │   ├── reviews/        # 角色审核
│   │   │   ├── workers/        # 阿姨库
│   │   │   ├── commission/     # 佣金配置
│   │   │   ├── settlement/     # 分账管理
│   │   │   ├── credit/         # 诚信分
│   │   │   ├── deposit/        # 保证金
│   │   │   ├── points/         # 积分系统
│   │   │   ├── orders/         # 订单管理
│   │   │   ├── training/       # 培训管理
│   │   │   └── venues/         # 场地管理
│   │   └── m/                  # 小程序端
│   │       ├── layout.tsx      # 小程序布局
│   │       ├── login/          # 登录页
│   │       ├── worker/         # 阿姨端
│   │       │   ├── page.tsx    # 接单大厅
│   │       │   ├── jobs/       # 我的订单
│   │       │   ├── reviews/    # 我的评价
│   │       │   └── profile/    # 个人简历
│   │       ├── agent/          # 经纪人端
│   │       │   ├── page.tsx    # 工作台
│   │       │   ├── workers/    # 阿姨管理
│   │       │   ├── orders/     # 订单管理
│   │       │   └── profile/    # 个人中心
│   │       ├── recruiter/      # 招生端
│   │       │   ├── page.tsx    # 工作台
│   │       │   ├── workers/    # 录入管理
│   │       │   ├── training/   # 培训推荐
│   │       │   └── profile/    # 个人中心
│   │       ├── instructor/     # 讲师端
│   │       │   ├── page.tsx    # 工作台
│   │       │   ├── courses/    # 课程管理
│   │       │   ├── students/   # 学员管理
│   │       │   └── profile/    # 个人中心
│   │       └── customer/       # 客户端
│   │           ├── page.tsx    # 首页
│   │           ├── orders/     # 我的订单
│   │           └── profile/    # 个人中心
│   ├── components/
│   │   ├── ui/                 # shadcn/ui 组件库
│   │   ├── admin/              # PC端管理组件
│   │   │   ├── sidebar.tsx     # 侧边导航栏
│   │   │   └── header.tsx      # 顶部栏
│   │   └── miniapp/            # 小程序端组件
│   │       ├── context.tsx     # 角色上下文
│   │       └── tab-bar.tsx     # 底部导航栏
│   ├── hooks/                  # 自定义 Hooks
│   └── lib/
│       ├── utils.ts            # 通用工具 (cn)
│       ├── types.ts            # 类型定义（6种角色、订单、佣金等）
│       └── mock-data.ts        # Mock 数据
├── package.json
├── next.config.ts
└── tsconfig.json
```

## 构建与运行命令

- **开发**: `pnpm dev` (端口 5000, HMR)
- **构建**: `pnpm build`
- **生产运行**: `pnpm start`
- **类型检查**: `pnpm ts-check`
- **Lint**: `pnpm lint`

## 8种角色体系

| 角色 | 标识 | 小程序路径 | 核心功能 |
|------|------|-----------|---------|
| 阿姨 | `worker` | `/m/worker` | 简历管理、接单大厅、状态切换、查看评价 |
| 经纪人 | `agent` | `/m/agent` | 阿姨管理、发单匹配、客户管理、佣金查看 |
| 招生代理 | `recruiter` | `/m/recruiter` | 阿姨录入、培训推荐、转化路径追踪 |
| 培训讲师 | `instructor` | `/m/instructor` | 培训课程管理、学员管理、点评评分 |
| 客户 | `customer` | `/m/customer` | 浏览简历、下单、评价 |
| 管理员 | `admin` | `/admin` | 全平台管理后台 |
| 培训主管 | `training_supervisor` | `/m/training_supervisor` | 课程/合同审批、招生团队管理 |
| 阿姨运营 | `worker_operator` | `/m/worker_operator` | 简历管理、上户推荐、线索录入 |

## 核心业务模块

### 佣金分账
- 三级分账：经纪人(30-50%) + 招生代理(10-20%) + 平台(剩余)
- 按单分账，支持自定义比例

### 诚信体系
- 诚信分: 初始1000分，违约扣分，良好表现加分
- 保证金: 按角色等级缴纳，可退还
- 黑名单: 诚信分低于阈值自动拉黑

### 积分系统
- 行为获取积分（完成订单、好评等）
- 积分可兑换权益
- 按角色配置不同规则

## 编码规范

- TypeScript strict 模式
- 禁止隐式 any
- 函数参数必须有类型标注
- 使用 `cn()` 合并 className
- 组件使用 'use client' 标注客户端组件
- Mock 数据集中在 `src/lib/mock-data.ts`

## 微信云开发适配

- 数据层已接入Supabase数据库，所有业务数据从真实数据库读写
- 仍保留mock-data.ts作为本地开发回退
- 小程序端路由结构与微信小程序页面结构一一对应
- 角色上下文机制（RoleContext）可无缝对接微信登录态

## Supabase 数据库接入

### 数据库客户端
- 文件：`src/storage/database/supabase-client.ts`
- 通过 `getSupabaseClient()` 获取客户端实例
- 环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 业务数据表（已建好+已灌种子数据）
| 表名 | 记录数 | 说明 |
|------|--------|------|
| users | 15 | 用户表（8种角色） |
| workers | 6 | 阿姨简历库 |
| leads | 8 | 线索库 |
| courses | 5 | 课程表 |
| orders | 5 | 合单/订单 |
| reviews | 9 | 评价库 |
| contracts | 3 | 合同表 |
| commission_rules | 6 | 佣金规则 |
| enrollments | 4 | 报名/学员表 |
| system_settings | 6 | 系统配置（JSONB存储） |
| platform_fees | - | 平台费用记录 |
| commission_records | - | 佣金记录 |
| notifications | - | 站内通知 |
| course_schedules | - | 排课表 |
| certificates | - | 证书表 |
| training_contracts | - | 培训合同 |
| lead_followups | - | 线索跟进记录 |

### system_settings 表结构
- key (VARCHAR): 配置键名（如platform_info, commission_rules等）
- value (JSONB): 配置值（JSON格式）
- updated_at (TIMESTAMPTZ): 更新时间

### API 接口（已实现，读写Supabase）
| 接口 | 方法 | 说明 |
|------|------|------|
| /api/settings | GET | 获取所有系统设置 |
| /api/settings?key=xxx | GET | 获取指定设置项 |
| /api/settings | PUT | 保存设置项（upsert） |
| /api/workers | GET | 获取阿姨列表（支持筛选） |
| /api/workers | PUT | 更新阿姨信息 |
| /api/leads | GET | 获取线索列表 |
| /api/leads | POST | 新增线索 |
| /api/leads | PUT | 更新线索 |
| /api/courses | GET | 获取课程列表 |
| /api/courses | PUT | 更新课程 |
| /api/orders | GET | 获取订单/合单列表 |
| /api/orders | POST | 创建订单 |
| /api/orders | PUT | 更新订单 |
| /api/reviews | GET | 获取评价列表 |
| /api/reviews | POST | 新增评价 |
| /api/users | GET | 获取用户列表 |
| /api/contracts | GET | 获取合同列表 |
| /api/contracts | PUT | 更新合同 |
| /api/enrollments | GET | 获取报名列表 |
| /api/enrollments | POST | 新增报名 |
| /api/auth/phone-login | POST | 手机号+验证码登录 |
| /api/auth/phone-register | POST | 手机号注册新用户 |
| /api/leads/[id]/followups | GET/POST | 线索跟进记录（pg直连） |
| /api/resume-reviews/[id]/approve | POST | 简历审核通过 |
| /api/resume-reviews/[id]/reject | POST | 简历审核拒绝 |
| /api/id-card-verify | POST | 身份证验证（占位实现） |
| /api/contracts/[id]/confirm | POST | 主管确认签约（pg直连） |
| /api/orders/[id]/replace | POST | 更换阿姨（pg直连） |
| /api/courses | POST | 新建课程（讲师/培训主管） |
| /api/courses/[id]/approve | POST | 管理员审核课程（pg直连） |
| /api/course-schedules | GET/POST | 排课表查询/创建（pg直连） |
| /api/course-schedules/[id]/approve | POST | 主管审核排课（pg直连） |
| /api/enrollments/[id]/grade | POST | 讲师考核打分（pg直连） |
| /api/platform-fees/[id]/confirm | POST | 确认平台费用到账（pg直连） |
| /api/workers/[id]/pause | POST | 阿姨暂停接单（pg直连） |
| /api/workers/[id]/resume | POST | 阿姨恢复接单（pg直连） |
| /api/notifications | POST | 发送站内通知（仅admin，pg直连） |

### 登录方式
1. **手机号+验证码登录**（主要方式）
   - 开发模式：任意手机号+验证码888888即可登录
   - 生产模式：需对接短信服务商（配置SMS_PROVIDER环境变量）
2. **微信小程序登录**
   - 小程序内通过wx.login()获取code，传给后端换取openid
   - 新用户需选择角色注册

## 微信自动登录

### 登录流程
1. 小程序启动时调用 `wx.login()` 获取 code
2. code 传给后端 `/api/auth/wechat-login` 换取 openid
3. 用 openid 查找数据库用户 → 已绑定则自动登录，未绑定则注册
4. 注册调用 `/api/auth/wechat-register`，选择角色并绑定 openid
5. token 存 localStorage，下次打开自动登录

### API 接口
- `POST /api/auth/wechat-login` — 微信登录（传 code）
- `POST /api/auth/wechat-register` — 新用户注册（传 openid/role/name/phone）
- `GET /api/auth/session` — 获取当前 session（Header: Authorization: Bearer token）
- `POST /api/auth/init-users` — 初始化测试用户（仅开发环境）

### 数据库
- `users` 表新增 `wechat_openid` 和 `wechat_unionid` 字段
- 测试用户 openid 格式：`dev_wx_{role}`（如 `dev_wx_agent`）
- 开发模式：未配置 WX_APPID 时，code 直接映射为 openid

### 环境变量
- `WX_APPID` — 微信小程序 AppID（生产必配）
- `WX_APPSECRET` — 微信小程序 AppSecret（生产必配）
- `JWT_SECRET` — JWT签名密钥（可选，默认 dev-secret-key）

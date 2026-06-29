# 家政共创平台 (szjfp)

家校共创平台 — 连接阿姨、经纪人、招生代理、培训讲师和客户的多角色协作 SaaS 系统。

**技术栈**: Next.js 16 (App Router) + TypeScript 5 + shadcn/ui + Tailwind CSS 4

## 快速开始

```bash
pnpm install          # 安装依赖（仅支持 pnpm）
pnpm dev              # 启动开发服务器 → http://localhost:3000
pnpm build            # 生产构建
pnpm start            # 生产模式 → http://localhost:3000
pnpm validate         # 部署前预检（tsc + eslint）
```

## 部署

线上地址：[szjfp-274552-8-1444411996.sh.run.tcloudbase.com](https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com)

部署平台：腾讯云 CloudBase CloudRun（容器型）

详细部署指南参见 **[DEPLOY.md](./DEPLOY.md)**

一键部署：
```bash
tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f cloudrun deploy --force --serviceName szjfp --source . --port 5000
```

## 项目结构

```
├── src/
│   ├── app/
│   │   ├── admin/              # PC 后台管理
│   │   ├── m/                  # 小程序端（worker/agent/recruiter/instructor/customer）
│   │   └── api/                # API 路由
│   ├── components/
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── admin/              # 管理端组件
│   │   └── miniapp/            # 小程序组件
│   ├── hooks/                  # 自定义 Hooks
│   └── lib/                    # 工具函数、类型、Mock 数据
├── public/                     # 静态资源
├── tests/                      # 测试脚本
├── docs/                       # 文档
├── DEPLOY.md                   # 部署指南
├── Dockerfile                  # CloudRun 容器构建
├── cloudbaserc.json            # CloudBase 配置
└── AGENTS.md                   # AI 开发指南
```

## 8 种角色

| 角色 | 小程序路径 | 核心功能 |
|------|-----------|---------|
| 阿姨 worker | /m/worker | 简历管理、接单大厅 |
| 经纪人 agent | /m/agent | 阿姨管理、发单匹配 |
| 招生代理 recruiter | /m/recruiter | 阿姨录入、培训推荐 |
| 培训讲师 instructor | /m/instructor | 课程管理、学员管理 |
| 客户 customer | /m/customer | 浏览简历、下单评价 |
| 管理员 admin | /admin | 后台管理 |
| 培训主管 training_supervisor | /m/training_supervisor | 审批管理 |
| 阿姨运营 worker_operator | /m/worker_operator | 简历管理、上户推荐 |

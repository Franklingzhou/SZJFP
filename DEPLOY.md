# 部署指南 — 家政共创平台 (szjfp)

## 环境信息

| 项目 | 值 |
|------|-----|
| 云开发环境 ID | `szjfp-d4gr6n07s2b4ae60-dbd56040f` |
| CloudRun 服务名 | `szjfp` |
| 服务类型 | 容器型 (Dockerfile) |
| 线上地址 | `https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com` |
| 容器端口 | `5000` |
| CPU / 内存 | 1 核 / 2 GB |
| 实例数 | Min=1, Max=3 |
| 访问类型 | PUBLIC |

## 前置条件

1. **Node.js 20+** + **pnpm 9+**
2. **CloudBase CLI 3.5.8+** — 安装：`npm i -g @cloudbase/cli`
3. 已登录 CLI：`tcb login`
4. 确认环境 ID：`cloudbaserc.json` 中的 `envId`

## 本地开发

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器 → http://localhost:3000
pnpm build            # 生产构建
pnpm start            # 运行生产版本 → http://localhost:3000
```

### 代码质量检查

```bash
pnpm ts-check         # TypeScript 类型检查
pnpm lint             # ESLint 检查
pnpm validate         # 部署前预检（ts-check + lint）
```

## 部署流程

### ⚠️ 第 0 步：部署前必做预检

CloudBase 构建会跑完整的 `next build`（含严格类型检查），遇到第一个错误就失败。反复部署浪费时间和资源。

```bash
pnpm validate    # 必须先通过！一次性暴露所有 TypeScript/ESLint 错误
```

### 部署方法（唯一推荐：Windows .bat 批处理）

**千万别在 PowerShell 里用 `start "" /b` 跑 .bat**，会报 CLIXML 错误。直接用 CMD 跑批处理文件：

```cmd
:: 在 CMD 中（不是 PowerShell！）
f:\CB-szjfp\deploy_v0XX.bat
```

或通过 `cmd /c`：

```cmd
cmd /c f:\CB-szjfp\deploy_v0XX.bat
```

**每次部署步骤：**

1. 复制上一个 `deploy_v0XX.bat` 改版本号（如 `deploy_v031.bat`）
2. （可选）修改 `Dockerfile` 中 `ARG BUST_CACHE=v031-20260628-1` 强制重建
3. 打开 CMD（Win+R → `cmd`），运行：
   ```
   f:\CB-szjfp\deploy_v031.bat
   ```
4. 等 3~5 分钟构建完成，查看 `deploy_output_v031.txt` 确认结果

**批处理模板（`deploy_v0XX.bat`）：**

```batch
@echo off
cd /d f:\CB-szjfp
echo Deploy v0XX at %date% %time% > deploy_output_v0XX.txt
tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f cloudrun deploy --force --serviceName szjfp --source f:\CB-szjfp --port 5000 >> deploy_output_v0XX.txt 2>&1
echo EXIT=%ERRORLEVEL% >> deploy_output_v0XX.txt
echo DONE at %date% %time% >> deploy_output_v0XX.txt
```

**CLI 常用命令速查：**

```bash
# 部署
tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f cloudrun deploy --force --serviceName szjfp --source f:\CB-szjfp --port 5000

# 查看服务状态
tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f cloudrun list

# 查看已部署版本
tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f cloudrun list --serviceName szjfp
```

**参数说明：**
- `-e <envId>` — 环境 ID（必填）
- `cloudrun deploy` — CLI 3.5.8 语法（旧版 `run deploy` 已废弃）
- `--force` — 跳过确认
- `--serviceName` — 服务名
- `--source` — 本地代码根目录**绝对路径**
- `--port` — 容器端口，**必须 5000**（与 Dockerfile EXPOSE 一致）

### Dockerfile 构建缓存

如需强制重建所有层，修改 `Dockerfile` 中的 `BUST_CACHE` ARG 值：

```dockerfile
ARG BUST_CACHE=v029-20260628-1   # 改值即强制重建
```

## 部署后验证

### 1. 检查服务状态

```bash
tcb -e szjfp-d4gr6n07s2b4ae60-dbd56040f cloudrun list
```

或通过 MCP 工具 `queryCloudRun` → action=`detail`, detailServerName=`szjfp`

确认 `latestDeploy.Status` = `normal`, `FlowRatio` = `100`

### 2. 快速 API 测试

```bash
# 首页
curl -sI https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com/ | findstr HTTP

# 重复注册应返回 409
curl -X POST https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com/api/auth/phone-register \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"13800001001\",\"code\":\"888888\",\"role\":\"worker\",\"name\":\"test\"}"
# 期望: HTTP 409 + {"code":"DUPLICATE_PHONE"}
```

### 3. 本地自检脚本

```bash
# 本地测试（需 pnpm dev 运行中，端口 5000）
node tests/api-test/_postfix_selfcheck.js

# 远程部署后测试（指定线上地址）
set API_BASE_URL=https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com
node tests/api-test/_postfix_selfcheck.js

# 指定 N 系列套件
node tests/api-test/_postfix_selfcheck.js --suite=n_series

# 指定 BUG 编号
node tests/api-test/_postfix_selfcheck.js --bugs=N04,N05
```

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `请使用 -e 或 --envId 指定环境 ID` | CLI 3.5.8 语法变化 | 使用 `tcb -e <envId> cloudrun deploy` |
| `next build` 构建失败 | TypeScript 类型错误 | 先跑 `pnpm validate` 修完错误再部署 |
| 部署后页面 404 | `'use client'` 组件内写了 `export const dynamic` | 改为在 `layout.tsx` 中导出 |
| CLI 部署命令不生效 | 旧版 `tcb run deploy` 已废弃 | 改用 `tcb cloudrun deploy` |
| 自检脚本连 localhost:3000 | 默认端口 | 环境变量 `API_BASE_URL` 或已改为 5000 |

## 版本记录

| 版本 | 日期 | 说明 |
|------|------|------|
| szjfp-033 | 2026-06-28 | BUG-E12: order_signings 表补列 + BUG-W16: worker_applications 建表，SQL 迁移上线 |\n| szjfp-032 | 2026-06-28 | /admin/logs → 308 重定向到 /admin/operation-logs（next.config.ts redirects，绕过 Turbopack logs 目录误判为 Client Component 的 bug） |
| szjfp-031 | 2026-06-28 | /admin/logs 恢复单文件 'use client' 结构（对齐 dashboard 模式） — 无效 |
| szjfp-030 | 2026-06-28 | 修复 /admin/logs 404 + 自检脚本端口修正 |
| szjfp-029 | 2026-06-28 | 新增 Dockerfile + .dockerignore（修复 JZ-projects 打包），409 重复注册拦截 |
| szjfp-042 | 2026-06-29 | 🚀 v042上线：4个代码bug修复 + 4个DB补建 + 483用例481通过 |
| szjfp-041 | 2026-06-28 | 常规部署 |
| szjfp-040 | 2026-06-28 | 常规部署 |
| szjfp-039 | 2026-06-28 | 常规部署 |
| szjfp-038 | 2026-06-28 | 常规部署 |
| szjfp-037 | 2026-06-28 | 常规部署 |
| szjfp-036 | 2026-06-28 | 常规部署 |
| szjfp-035 | 2026-06-28 | 常规部署 |
| szjfp-034 | 2026-06-28 | 常规部署 |
| szjfp-033 | 2026-06-28 | BUG-E12 + BUG-W16 SQL迁移 |
| szjfp-032 | 2026-06-28 | /admin/logs 308重定向 |
| szjfp-031 | 2026-06-28 | 无效果 |
| szjfp-030 | 2026-06-28 | 修复 /admin/logs 404 |
| szjfp-029 | 2026-06-28 | Dockerfile + 409 重复注册拦截 |
| szjfp-028 | 2026-06-27 | 常规部署 |
| szjfp-027 | 2026-06-26 | 常规部署 |

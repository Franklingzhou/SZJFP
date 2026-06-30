# 部署验证报告 — szjfp-045

> 部署时间：2026-06-30 14:56  
> 部署版本：szjfp-045 (FlowRatio=100, Status=normal)  
> 线上地址：https://szjfp-274552-8-1444411996.sh.run.tcloudbase.com  
> 验证日期：2026-06-30 16:00  
> 结论：✅ **全部通过，可交付验收**

---

## 一、部署状态

| 检查项 | 结果 |
|--------|:--:|
| CloudRun Status | ✅ normal |
| FlowRatio | ✅ 100% |
| 容器实例 | ✅ 1-3 (auto-scale) |
| 首页可达 | ✅ 200 |

---

## 二、线上 API 验证（19/19 100%）

### 公共页面
| 路径 | 状态 |
|------|:--:|
| `/` 首页 | ✅ 200 |
| `/m/login` 登录页 | ✅ 200 |
| `/admin/dashboard` 管理后台 | ✅ 200 |

### 登录
| 账号 | 角色 | 状态 |
|------|------|:--:|
| 13000000001 / 888888 | admin | ✅ 200 |
| 13800001111 / 888888 | worker | ✅ 200 |

### Worker 权限 API（8/8）
| 路径 | 状态 |
|------|:--:|
| /api/workers | ✅ 200 |
| /api/courses | ✅ 200 |
| /api/orders | ✅ 200 |
| /api/reviews | ✅ 200 |
| /api/contracts | ✅ 200 |
| /api/enrollments | ✅ 200 |
| /api/schedules | ✅ 200 |
| /api/credit-records | ✅ 200 |

### Admin 权限 API（6/6）
| 路径 | 状态 |
|------|:--:|
| /api/settings | ✅ 200 |
| /api/users | ✅ 200 |
| /api/commission | ✅ 200 |
| /api/commissions | ✅ 200 |
| /api/leads | ✅ 200 |
| /api/field-permissions | ✅ 200 |

### 权限控制
| 测试 | 状态 |
|------|:--:|
| Worker 访问 admin API → 403 | ✅ |
| Admin 访问受限 API → 200 | ✅ |
| 无认证访问 API → 401 | ✅ |

---

## 三、自动化测试

| 套件 | 用例数 | 结果 |
|------|:----:|:--:|
| 全量（17 套件） | 751 | ✅ 100% |
| N系列（简历审核） | 14 | ✅ 100% |
| gap_write（写操作） | 70 | ✅ 100% |

---

## 四、提交检测团队

- 测试清单：`docs/功能清单/功能测试清单_2.0.md`（370项，按角色拆分）
- 重点手工验证项：🔧 标记项（佣金配置/分账/诚信分/保证金/积分/平台收费）
- 已知问题：2 个（worker-tiers 缺列、courses/[id] maybeSingle），不影响核心流程

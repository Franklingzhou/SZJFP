// 权限管理工具函数

// 默认权限配置
const defaultPermissions = {
  admin: [
    "dashboard", "workers", "orders", "order_hall", "customers", "leads",
    "recommendations", "courses", "students", "contracts", "reviews",
    "role_permissions", "settings"
  ],
  agent: ["dashboard", "workers", "orders", "order_hall", "customers", "leads", "recommendations"],
  worker: ["dashboard", "orders", "order_hall", "reviews"],
  customer: ["dashboard", "orders", "order_hall", "reviews"],
  recruiter: ["dashboard", "workers", "leads", "recommendations"],
  instructor: ["dashboard", "courses", "students"],
  training_supervisor: ["dashboard", "courses", "students", "settings"],
  worker_operator: ["dashboard", "workers", "orders"],
};

// 获取角色权限
export function getRolePermissions(role: string): string[] {
  // 优先从 localStorage 读取自定义权限
  const savedPermissions = localStorage.getItem('role_permissions');
  if (savedPermissions) {
    try {
      const permissions = JSON.parse(savedPermissions);
      if (permissions[role]) {
        return permissions[role];
      }
    } catch (error) {
      console.error('解析权限配置失败:', error);
    }
  }

  // 返回默认权限
  return defaultPermissions[role as keyof typeof defaultPermissions] || [];
}

// 检查角色是否有访问某个页面的权限
export function hasPageAccess(role: string, pageId: string): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(pageId);
}

// 获取当前角色
export function getCurrentRole(): string {
  if (typeof window === 'undefined') return 'admin';
  return localStorage.getItem('test_role') || 'admin';
}
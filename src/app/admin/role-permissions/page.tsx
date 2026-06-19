"use client";

import { useState } from "react";
import { Shield, Save, RefreshCw } from "lucide-react";

const roles = [
  { id: "admin", name: "超级管理员", color: "bg-red-500" },
  { id: "agent", name: "经纪人", color: "bg-green-500" },
  { id: "worker", name: "阿姨", color: "bg-blue-500" },
  { id: "customer", name: "客户", color: "bg-purple-500" },
  { id: "recruiter", name: "招聘者", color: "bg-yellow-500" },
  { id: "instructor", name: "培训师", color: "bg-pink-500" },
  { id: "training_supervisor", name: "培训主管", color: "bg-indigo-500" },
  { id: "worker_operator", name: "阿姨操作员", color: "bg-orange-500" },
];

const pages = [
  { id: "dashboard", name: "仪表盘", category: "基础功能" },
  { id: "workers", name: "阿姨库", category: "基础功能" },
  { id: "orders", name: "订单管理", category: "业务管理" },
  { id: "order_hall", name: "订单大厅", category: "业务管理" },
  { id: "customers", name: "客户管理", category: "业务管理" },
  { id: "leads", name: "线索管理", category: "业务管理" },
  { id: "recommendations", name: "推荐记录", category: "业务管理" },
  { id: "courses", name: "培训管理", category: "培训管理" },
  { id: "students", name: "学员管理", category: "培训管理" },
  { id: "contracts", name: "合同管理", category: "业务管理" },
  { id: "reviews", name: "评价管理", category: "业务管理" },
  { id: "settings", name: "系统设置", category: "系统管理" },
];

// 默认权限配置
const defaultPermissions = {
  admin: pages.map(p => p.id),
  agent: ["dashboard", "workers", "orders", "order_hall", "customers", "leads", "recommendations"],
  worker: ["dashboard", "orders", "order_hall", "reviews"],
  customer: ["dashboard", "orders", "order_hall", "reviews"],
  recruiter: ["dashboard", "workers", "leads", "recommendations"],
  instructor: ["dashboard", "courses", "students"],
  training_supervisor: ["dashboard", "courses", "students", "settings"],
  worker_operator: ["dashboard", "workers", "orders"],
};

export default function RolePermissionsPage() {
  const [selectedRole, setSelectedRole] = useState("admin");
  const [permissions, setPermissions] = useState<Record<string, string[]>>(defaultPermissions);
  const [saved, setSaved] = useState(false);

  const currentRole = roles.find(r => r.id === selectedRole);
  const rolePermissions = permissions[selectedRole] || [];

  const togglePermission = (pageId: string) => {
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: prev[selectedRole].includes(pageId)
        ? prev[selectedRole].filter(id => id !== pageId)
        : [...prev[selectedRole], pageId]
    }));
    setSaved(false);
  };

  const toggleCategory = (category: string) => {
    const categoryPages = pages.filter(p => p.category === category).map(p => p.id);
    const allSelected = categoryPages.every(id => rolePermissions.includes(id));

    setPermissions(prev => ({
      ...prev,
      [selectedRole]: allSelected
        ? prev[selectedRole].filter(id => !categoryPages.includes(id))
        : [...new Set([...prev[selectedRole], ...categoryPages])]
    }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem('role_permissions', JSON.stringify(permissions));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPermissions(defaultPermissions);
    setSaved(false);
  };

  const groupedPages = pages.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = [];
    }
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, typeof pages>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">角色权限管理</h1>
          <p className="text-gray-500 mt-1">配置各角色可访问的页面权限</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saved ? "已保存" : "保存配置"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 角色选择 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            选择角色
          </h2>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  selectedRole === role.id
                    ? "bg-blue-50 border-2 border-blue-500"
                    : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${role.color}`}></div>
                <span className="font-medium text-gray-700">{role.name}</span>
                {selectedRole === role.id && (
                  <span className="ml-auto text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 权限配置 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentRole?.name} - 页面权限
            </h2>
            <span className="text-sm text-gray-500">
              已选择 {rolePermissions.length} / {pages.length} 个页面
            </span>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedPages).map(([category, categoryPages]) => {
              const allSelected = categoryPages.every(p => rolePermissions.includes(p.id));
              const someSelected = categoryPages.some(p => rolePermissions.includes(p.id));

              return (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-700">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {categoryPages.filter(p => rolePermissions.includes(p.id)).length}/{categoryPages.length}
                      </span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        allSelected ? "bg-blue-500 border-blue-500" :
                        someSelected ? "bg-blue-100 border-blue-500" :
                        "border-gray-300"
                      }`}>
                        {allSelected && <span className="text-white text-xs">✓</span>}
                        {someSelected && !allSelected && <span className="text-blue-500 text-xs">-</span>}
                      </div>
                    </div>
                  </button>
                  <div className="divide-y">
                    {categoryPages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => togglePermission(page.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-gray-700">{page.name}</span>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          rolePermissions.includes(page.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                        }`}>
                          {rolePermissions.includes(page.id) && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
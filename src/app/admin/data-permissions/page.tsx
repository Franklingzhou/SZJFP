"use client";

import { useState, useEffect } from "react";
import { Database, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const roles = [
  { id: "admin", name: "超级管理员", color: "bg-red-500" },
  { id: "agent", name: "经纪人", color: "bg-green-500" },
  { id: "worker", name: "阿姨", color: "bg-blue-500" },
  { id: "customer", name: "客户", color: "bg-purple-500" },
  { id: "recruiter", name: "招生代理", color: "bg-yellow-500" },
  { id: "instructor", name: "培训讲师", color: "bg-pink-500" },
  { id: "training_supervisor", name: "培训主管", color: "bg-indigo-500" },
  { id: "worker_operator", name: "阿姨运营", color: "bg-orange-500" },
];

// 数据模块定义
const dataModules = [
  { id: "workers", name: "阿姨简历库", category: "核心数据", description: "阿姨简历列表可见性" },
  { id: "orders", name: "订单管理", category: "核心数据", description: "订单列表可见性" },
  { id: "hall", name: "订单大厅", category: "核心数据", description: "订单大厅可见性" },
  { id: "customers", name: "客户管理", category: "核心数据", description: "客户列表可见性" },
  { id: "leads", name: "线索管理", category: "核心数据", description: "线索列表可见性" },
  { id: "students", name: "学员管理", category: "培训数据", description: "学员列表可见性" },
  { id: "courses", name: "课程管理", category: "培训数据", description: "课程列表可见性" },
  { id: "contracts", name: "合同管理", category: "业务数据", description: "合同列表可见性" },
  { id: "recommendations", name: "推荐记录", category: "业务数据", description: "推荐记录可见性" },
  { id: "reviews", name: "评价管理", category: "业务数据", description: "评价列表可见性" },
];

// 数据可见范围选项
const visibilityOptions = [
  { id: "all", name: "全部数据", description: "可以看到所有数据" },
  { id: "own", name: "仅自己的", description: "只能看到自己创建/负责的数据" },
  { id: "team", name: "本团队", description: "可以看到本团队的数据" },
  { id: "hidden", name: "隐藏", description: "完全看不到该列表" },
];

// 默认数据权限配置
const defaultDataPermissions: Record<string, Record<string, string>> = {
  admin: {
    workers: "all",
    orders: "all",
    hall: "all",
    customers: "all",
    leads: "all",
    students: "all",
    courses: "all",
    contracts: "all",
    recommendations: "all",
    reviews: "all",
  },
  agent: {
    workers: "own",
    orders: "own",
    hall: "all",
    customers: "own",
    leads: "hidden",
    students: "hidden",
    courses: "hidden",
    contracts: "own",
    recommendations: "all",
    reviews: "own",
  },
  worker: {
    workers: "hidden",
    orders: "own",
    hall: "all",
    customers: "hidden",
    leads: "hidden",
    students: "own",
    courses: "all",
    contracts: "own",
    recommendations: "own",
    reviews: "own",
  },
  customer: {
    workers: "hidden",
    orders: "own",
    hall: "hidden",
    customers: "hidden",
    leads: "hidden",
    students: "hidden",
    courses: "hidden",
    contracts: "own",
    recommendations: "hidden",
    reviews: "own",
  },
  recruiter: {
    workers: "own",
    orders: "hidden",
    hall: "all",
    customers: "hidden",
    leads: "own",
    students: "own",
    courses: "all",
    contracts: "own",
    recommendations: "own",
    reviews: "own",
  },
  instructor: {
    workers: "own",
    orders: "hidden",
    hall: "all",
    customers: "hidden",
    leads: "hidden",
    students: "own",
    courses: "own",
    contracts: "hidden",
    recommendations: "own",
    reviews: "own",
  },
  training_supervisor: {
    workers: "all",
    orders: "all",
    hall: "all",
    customers: "hidden",
    leads: "all",
    students: "all",
    courses: "all",
    contracts: "all",
    recommendations: "all",
    reviews: "all",
  },
  worker_operator: {
    workers: "own",
    orders: "all",
    hall: "all",
    customers: "hidden",
    leads: "own",
    students: "hidden",
    courses: "hidden",
    contracts: "hidden",
    recommendations: "all",
    reviews: "own",
  },
};

export default function DataPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState("admin");
  const [permissions, setPermissions] = useState<Record<string, Record<string, string>>>(defaultDataPermissions);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // 从API加载配置
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/settings?key=data_permissions', {
      headers: { 'x-session': token }
    })
      .then(res => res.json())
      .then(data => {
        if (data?.ok && data?.data?.value && typeof data.data.value === 'object') {
          setPermissions(data.data.value as Record<string, Record<string, string>>);
        }
      })
      .catch(() => { /* 使用默认值 */ })
      .finally(() => setLoading(false));
  }, []);

  const currentRole = roles.find(r => r.id === selectedRole);
  const rolePermissions = permissions[selectedRole] || {};

  const setVisibility = (moduleId: string, visibility: string) => {
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        [moduleId]: visibility,
      },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    if (!token) {
      alert('请先登录');
      return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token,
        },
        body: JSON.stringify({
          key: 'data_permissions',
          value: permissions,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('保存失败: ' + (data.error || '未知错误'));
      }
    } catch {
      alert('保存失败，请检查网络');
    }
  };

  const handleReset = () => {
    setPermissions(defaultDataPermissions);
    setSaved(false);
  };

  const groupedModules = dataModules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, typeof dataModules>);

  const getVisibilityLabel = (visibility: string) => {
    return visibilityOptions.find(o => o.id === visibility)?.name || visibility;
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "all": return "bg-green-100 text-green-700 border-green-300";
      case "own": return "bg-blue-100 text-blue-700 border-blue-300";
      case "team": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "hidden": return "bg-red-100 text-red-700 border-red-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">数据权限配置</h1>
          <p className="text-gray-500 mt-1">配置各角色在各页面的数据可见范围</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            重置默认
          </Button>
          <Button
            onClick={handleSave}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600"
          >
            <Save className="w-4 h-4" />
            {saved ? "已保存" : "保存配置"}
          </Button>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">数据可见范围说明</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {visibilityOptions.map(opt => (
            <div key={opt.id} className="flex items-start gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getVisibilityColor(opt.id)}`}>
                {opt.name}
              </span>
              <span className="text-blue-600">{opt.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 角色选择 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            选择角色
          </h2>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  selectedRole === role.id
                    ? "bg-amber-50 border-2 border-amber-500"
                    : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${role.color}`}></div>
                <span className="font-medium text-gray-700">{role.name}</span>
                {selectedRole === role.id && (
                  <span className="ml-auto text-amber-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 数据权限配置 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentRole?.name} - 数据可见范围
            </h2>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedModules).map(([category, modules]) => (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 font-medium text-gray-700">
                  {category}
                </div>
                <div className="divide-y">
                  {modules.map((module) => {
                    const currentVisibility = rolePermissions[module.id] || "hidden";
                    return (
                      <div key={module.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{module.name}</div>
                          <div className="text-sm text-gray-500">{module.description}</div>
                        </div>
                        <div className="flex gap-2">
                          {visibilityOptions.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setVisibility(module.id, opt.id)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                currentVisibility === opt.id
                                  ? getVisibilityColor(opt.id) + " border-2"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}
                              title={opt.description}
                            >
                              {opt.id === "hidden" ? <EyeOff className="w-4 h-4" /> :
                               opt.id === "all" ? <Eye className="w-4 h-4" /> :
                               opt.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
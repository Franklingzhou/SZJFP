"use client";

import { useState, useEffect } from "react";

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

export default function RoleSwitcher() {
  const [currentRole, setCurrentRole] = useState("admin");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 组件挂载时从 localStorage 读取角色
  useEffect(() => {
    setMounted(true);
    const savedRole = localStorage.getItem('test_role');
    if (savedRole) {
      setCurrentRole(savedRole);
    }
  }, []);

  const currentRoleData = roles.find(r => r.id === currentRole);

  const handleRoleChange = (roleId: string) => {
    console.log('切换角色到:', roleId);
    setCurrentRole(roleId);
    setIsOpen(false);
    localStorage.setItem('test_role', roleId);
    console.log('角色已保存到 localStorage');
    // 延迟刷新，确保状态更新
    setTimeout(() => {
      console.log('正在刷新页面...');
      window.location.reload();
    }, 100);
  };

  if (!mounted) {
    return null; // 防止服务端渲染不匹配
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
        >
          <div className={`w-3 h-3 rounded-full ${currentRoleData?.color}`}></div>
          <span className="text-sm font-medium text-gray-700">{currentRoleData?.name}</span>
          <span className="text-gray-400">▼</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500">切换角色</span>
            </div>
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleChange(role.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full ${role.color}`}></div>
                <span className="text-sm text-gray-700">{role.name}</span>
                {currentRole === role.id && (
                  <span className="ml-auto text-green-500">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { Search, Plus, MoreVertical, Phone, MessageSquare } from "lucide-react";

const mockCustomers = [
  { id: "1", name: "张女士", phone: "138****1234", gender: "女", level: "VIP", source: "转介绍", address: "朝阳区建国路88号", status: "active", ordersCount: 5 },
  { id: "2", name: "李先生", phone: "139****5678", gender: "男", level: "普通", source: "线上", address: "海淀区中关村12号", status: "active", ordersCount: 2 },
  { id: "3", name: "王女士", phone: "137****9012", gender: "女", level: "普通", source: "地推", address: "东城区王府井1号", status: "inactive", ordersCount: 0 },
  { id: "4", name: "赵女士", phone: "136****3456", gender: "女", level: "VIP", source: "转介绍", address: "西城区西单北大街120号", status: "active", ordersCount: 8 },
];

const levelMap: Record<string, { label: string; color: string }> = {
  VIP: { label: "VIP", color: "bg-purple-100 text-purple-700" },
  普通: { label: "普通", color: "bg-gray-100 text-gray-700" },
};

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: "活跃", color: "bg-green-100 text-green-700" },
  inactive: { label: "不活跃", color: "bg-gray-100 text-gray-500" },
  blacklisted: { label: "黑名单", color: "bg-red-100 text-red-700" },
};

export default function CustomersPage() {
  const [customers] = useState(mockCustomers);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.includes(searchKeyword) ||
      customer.phone.includes(searchKeyword) ||
      customer.address.includes(searchKeyword);
    const matchesLevel = levelFilter === "all" || customer.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-5 h-5 mr-2" />
          新增客户
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索姓名、手机号、地址..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="all">全部等级</option>
          <option value="VIP">VIP</option>
          <option value="普通">普通</option>
        </select>
      </div>

      {/* 客户列表 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户信息</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">等级</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">来源</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                    <p className="text-sm text-gray-400">{customer.address}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${levelMap[customer.level].color}`}>
                    {levelMap[customer.level].label}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">{customer.source}</td>
                <td className="px-6 py-4 text-gray-700">{customer.ordersCount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${statusMap[customer.status].color}`}>
                    {statusMap[customer.status].label}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600">
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            暂无数据
          </div>
        )}
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between">
        <p className="text-gray-500">共 {filteredCustomers.length} 条</p>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50" disabled>
            上一页
          </button>
          <button className="px-3 py-1 border rounded bg-blue-50 text-blue-600">1</button>
          <button className="px-3 py-1 border rounded hover:bg-gray-50">
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}

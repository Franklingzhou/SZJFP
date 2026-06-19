"use client";

import { useState } from "react";
import Link from "next/link";

const serviceTypes = [
  { id: "1", name: "日常保洁", icon: "🧹", color: "#3B82F6" },
  { id: "2", name: "做饭阿姨", icon: "🍳", color: "#10B981" },
  { id: "3", name: "育儿嫂", icon: "👶", color: "#F59E0B" },
  { id: "4", name: "月嫂", icon: "🤱", color: "#EC4899" },
  { id: "5", name: "老人护理", icon: "👴", color: "#8B5CF6" },
  { id: "6", name: "深度清洁", icon: "✨", color: "#06B6D4" },
];

const quickActions = [
  { id: "1", name: "找阿姨", icon: "🔍", href: "/m/worker" },
  { id: "2", name: "预约服务", icon: "📅", href: "/m/orders" },
  { id: "3", name: "我的订单", icon: "📋", href: "/m/orders" },
  { id: "4", name: "帮助中心", icon: "❓", href: "/m/profile" },
];

const workers = [
  { id: 1, name: "李阿姨", experience: 5, type: "育儿嫂", rating: 4.9 },
  { id: 2, name: "王阿姨", experience: 8, type: "月嫂", rating: 4.8 },
  { id: 3, name: "张阿姨", experience: 3, type: "日常保洁", rating: 4.7 },
  { id: 4, name: "刘阿姨", experience: 6, type: "做饭阿姨", rating: 4.9 },
];

export default function MiniAppHomePage() {
  const [searchText, setSearchText] = useState("");

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-blue-500 px-5 pt-16 pb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-white text-xl font-bold">您好，欢迎回来</h1>
            <p className="text-blue-100 text-sm mt-1">找到满意的家政服务</p>
          </div>
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl">
            🔔
          </button>
        </div>
        <div className="bg-white rounded-xl px-4 py-3 shadow-lg">
          <input
            type="text"
            placeholder="搜索阿姨、服务..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full text-sm text-gray-600 placeholder-gray-400 outline-none"
          />
        </div>
      </div>

      <div className="px-5 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">热门服务</h2>
        <div className="grid grid-cols-3 gap-3">
          {serviceTypes.map((service) => (
            <Link
              key={service.id}
              href={`/m/worker?type=${service.id}`}
              className="bg-white rounded-xl p-4 flex flex-col items-center border border-gray-100 hover:border-blue-300 transition-colors"
            >
              <span className="text-3xl mb-2">{service.icon}</span>
              <span className="text-sm font-medium text-gray-700">{service.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">快捷入口</h2>
        <div className="flex gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="flex-1 bg-white rounded-xl p-4 flex flex-col items-center"
            >
              <span className="text-2xl mb-2">{action.icon}</span>
              <span className="text-xs text-gray-600">{action.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">金牌阿姨</h2>
          <Link href="/m/worker" className="text-blue-500 text-sm">
            查看更多 →
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="flex-shrink-0 w-28 bg-white rounded-xl p-3 flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold mb-2">
                {worker.name.charAt(0)}
              </div>
              <span className="text-sm font-bold text-gray-800">{worker.name}</span>
              <span className="text-xs text-gray-500 mt-1">
                {worker.experience}年经验 · {worker.type}
              </span>
              <div className="flex items-center mt-2">
                <span className="text-xs">⭐</span>
                <span className="text-xs text-yellow-500 font-bold ml-1">
                  {worker.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

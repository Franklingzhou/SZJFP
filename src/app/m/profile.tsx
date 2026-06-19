"use client";

import Link from "next/link";

const menuItems = [
  { id: "1", name: "我的订单", icon: "📋", href: "/m/orders" },
  { id: "2", name: "我的评价", icon: "⭐", href: "/m/reviews" },
  { id: "3", name: "收藏阿姨", icon: "❤️", href: "/m/favorites" },
  { id: "4", name: "地址管理", icon: "📍", href: "/m/addresses" },
  { id: "5", name: "优惠券", icon: "🎫", href: "/m/coupons" },
  { id: "6", name: "帮助中心", icon: "❓", href: "/m/help" },
  { id: "7", name: "联系客服", icon: "📞", href: "/m/service" },
  { id: "8", name: "设置", icon: "⚙️", href: "/m/settings" },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-blue-500 px-5 pt-16 pb-8">
        <div className="flex items-center">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <span className="text-blue-500 text-3xl font-bold">用</span>
          </div>
          <div className="flex-1 ml-4">
            <h1 className="text-white text-xl font-bold">用户名称</h1>
            <span className="text-blue-100 text-sm mt-1 block">138****1234</span>
          </div>
          <button className="px-4 py-2 bg-white rounded-full text-blue-500 text-sm font-medium">
            编辑
          </button>
        </div>
      </div>

      <div className="bg-white mx-5 -mt-4 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-lg font-bold text-gray-800">家政会员</span>
          <span className="text-xs text-gray-500 block">开通会员享更多优惠</span>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-full text-white text-sm font-medium">
          立即开通
        </button>
      </div>

      <div className="bg-white mx-5 mt-6 rounded-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">我的订单</h2>
          <span className="text-gray-400 text-sm">全部订单 →</span>
        </div>
        <div className="flex justify-around">
          {[
            { icon: "💰", name: "待付款" },
            { icon: "🔧", name: "服务中" },
            { icon: "✅", name: "已完成" },
            { icon: "📝", name: "待评价" },
          ].map((item, idx) => (
            <button key={idx} className="flex flex-col items-center">
              <span className="text-2xl mb-2">{item.icon}</span>
              <span className="text-xs text-gray-600">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white mx-5 mt-6 rounded-xl overflow-hidden">
        {menuItems.map((item, index) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${
              index !== menuItems.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <div className="flex items-center">
              <span className="text-xl mr-3">{item.icon}</span>
              <span className="text-sm text-gray-800">{item.name}</span>
            </div>
            <span className="text-gray-300">›</span>
          </Link>
        ))}
      </div>

      <button className="w-full mx-5 mt-6 py-4 bg-white rounded-xl text-red-500 text-sm">
        退出登录
      </button>
    </div>
  );
}

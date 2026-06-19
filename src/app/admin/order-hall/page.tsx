"use client";

import { useState } from "react";
import { Search, Filter, MapPin, Clock, DollarSign, Star, ArrowRight } from "lucide-react";

const mockOrders = [
  {
    id: "DD20240617001",
    customer: "张女士",
    phone: "138****1234",
    serviceType: "日常保洁",
    address: "北京市朝阳区望京街道",
    expectedDate: "2026-06-18",
    expectedTime: "09:00-12:00",
    duration: 4,
    budget: 200,
    requirements: "需要深度清洁，包括厨房和卫生间",
    status: "pending",
    createdAt: "2026-06-17 10:30",
  },
  {
    id: "DD20240617002",
    customer: "李先生",
    phone: "139****5678",
    serviceType: "做饭阿姨",
    address: "北京市海淀区中关村",
    expectedDate: "2026-06-19",
    expectedTime: "11:00-13:00",
    duration: 3,
    budget: 150,
    requirements: "家常菜，清淡口味，3人份",
    status: "pending",
    createdAt: "2026-06-17 09:15",
  },
  {
    id: "DD20240617003",
    customer: "王女士",
    phone: "137****9012",
    serviceType: "育儿嫂",
    address: "北京市东城区王府井",
    expectedDate: "2026-06-20",
    expectedTime: "08:00-18:00",
    duration: 10,
    budget: 500,
    requirements: "照顾2岁宝宝，需要有育儿经验",
    status: "pending",
    createdAt: "2026-06-17 08:45",
  },
  {
    id: "DD20240617004",
    customer: "赵女士",
    phone: "136****3456",
    serviceType: "月嫂",
    address: "北京市西城区金融街",
    expectedDate: "2026-07-01",
    expectedTime: "全天",
    duration: 30,
    budget: 15000,
    requirements: "需要持证月嫂，有新生儿护理经验",
    status: "pending",
    createdAt: "2026-06-17 08:00",
  },
];

const serviceTypes = [
  { id: "all", name: "全部" },
  { id: "cleaning", name: "日常保洁" },
  { id: "cooking", name: "做饭阿姨" },
  { id: "nanny", name: "育儿嫂" },
  { id: "confinement", name: "月嫂" },
  { id: "elderly", name: "老人护理" },
];

export default function OrderHallPage() {
  const [searchText, setSearchText] = useState("");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null);

  const filteredOrders = mockOrders.filter(order => {
    const matchSearch = order.customer.includes(searchText) ||
                       order.address.includes(searchText) ||
                       order.id.includes(searchText);
    const matchService = selectedService === "all" ||
                        order.serviceType === serviceTypes.find(s => s.id === selectedService)?.name;
    return matchSearch && matchService;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">订单大厅</h1>
          <p className="text-gray-500 mt-1">查看和分配待处理订单</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
            待处理: {mockOrders.length}
          </span>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户姓名、地址、订单号..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {serviceTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all hover:shadow-md ${
                selectedOrder?.id === order.id ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {order.serviceType}
                    </span>
                    <span className="text-sm text-gray-500">{order.id}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{order.customer}</h3>
                  <p className="text-sm text-gray-500">{order.phone}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <DollarSign className="w-4 h-4" />
                    <span>¥{order.budget}</span>
                  </div>
                  <span className="text-xs text-gray-500">{order.duration}小时</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{order.address}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{order.expectedDate} {order.expectedTime}</span>
                </div>
                <p className="text-gray-700 mt-2 line-clamp-2">{order.requirements}</p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs text-gray-500">发布于 {order.createdAt}</span>
                <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                  查看详情 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 订单详情 */}
        {selectedOrder && (
          <div className="bg-white rounded-xl shadow-sm p-6 h-fit sticky top-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">订单详情</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">基本信息</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">订单编号</span>
                    <span className="font-medium">{selectedOrder.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">服务类型</span>
                    <span className="font-medium">{selectedOrder.serviceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">客户姓名</span>
                    <span className="font-medium">{selectedOrder.customer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">联系电话</span>
                    <span className="font-medium">{selectedOrder.phone}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">服务信息</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">服务地址</span>
                    <span className="font-medium text-right flex-1 ml-4">{selectedOrder.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">期望日期</span>
                    <span className="font-medium">{selectedOrder.expectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">期望时间</span>
                    <span className="font-medium">{selectedOrder.expectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">服务时长</span>
                    <span className="font-medium">{selectedOrder.duration}小时</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">预算金额</span>
                    <span className="font-medium text-green-600">¥{selectedOrder.budget}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">服务要求</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {selectedOrder.requirements}
                </p>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  分配阿姨
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  联系客户
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
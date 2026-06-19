"use client";

const mockData = {
  todayOrders: 3,
  monthIncome: 12800,
  rating: 4.9,
  availableOrders: 5,
};

const availableOrders = [
  { id: "1", service: "日常保洁", address: "朝阳区建国路88号", time: "今天 14:00", price: 200, distance: "1.2km" },
  { id: "2", service: "做饭阿姨", address: "海淀区中关村12号", time: "明天 10:00", price: 280, distance: "2.5km" },
  { id: "3", service: "深度清洁", address: "东城区王府井1号", time: "后天 09:00", price: 350, distance: "3.1km" },
];

export default function WorkerPage() {
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-blue-500 px-5 pt-16 pb-8">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
            <span className="text-blue-500 text-2xl font-bold">李</span>
          </div>
          <div className="flex-1 ml-4">
            <h1 className="text-white text-xl font-bold">李阿姨</h1>
            <span className="text-white text-sm mt-1 block">🟢 可接单</span>
          </div>
          <button className="px-4 py-2 bg-white rounded-full text-blue-500 text-sm font-medium">
            编辑
          </button>
        </div>
      </div>

      <div className="bg-white mx-5 -mt-4 rounded-xl p-4 shadow-lg">
        <div className="flex justify-around">
          <div className="text-center">
            <span className="text-xl font-bold text-gray-800">{mockData.todayOrders}</span>
            <span className="text-xs text-gray-500 block mt-1">今日订单</span>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <span className="text-xl font-bold text-gray-800">¥{mockData.monthIncome.toLocaleString()}</span>
            <span className="text-xs text-gray-500 block mt-1">本月收入</span>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="text-center">
            <span className="text-xl font-bold text-gray-800">⭐{mockData.rating}</span>
            <span className="text-xs text-gray-500 block mt-1">信用评分</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">可接订单</h2>
          <span className="text-blue-500 text-sm">{mockData.availableOrders}个新订单</span>
        </div>

        {availableOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl p-4 mb-3">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-gray-800">{order.service}</span>
              <span className="text-lg font-bold text-red-500">¥{order.price}</span>
            </div>
            <div className="mb-3">
              <p className="text-sm text-gray-500">📍 {order.address}</p>
              <p className="text-sm text-gray-500 mt-1">🕐 {order.time}</p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-400">距离 {order.distance}</span>
              <button className="px-5 py-2 bg-blue-500 rounded-full text-white text-sm font-medium">
                立即接单
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

const mockData = {
  workersCount: 28,
  ordersCount: 156,
  monthIncome: 35600,
  pendingOrders: 5,
};

const recentWorkers = [
  { id: "1", name: "李阿姨", status: "服务中", service: "育儿嫂" },
  { id: "2", name: "王阿姨", status: "可接单", service: "日常保洁" },
  { id: "3", name: "张阿姨", status: "暂停", service: "老人护理" },
];

export default function AgentPage() {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "可接单":
        return "bg-green-100 text-green-600";
      case "服务中":
        return "bg-blue-100 text-blue-600";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-green-500 px-5 pt-16 pb-8">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
            <span className="text-green-500 text-2xl font-bold">经</span>
          </div>
          <div className="ml-4">
            <h1 className="text-white text-xl font-bold">经纪人工作台</h1>
            <span className="text-green-100 text-sm mt-1 block">家政经纪人</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 text-center">
            <span className="text-2xl font-bold text-gray-800">{mockData.workersCount}</span>
            <span className="text-xs text-gray-500 block mt-1">管理阿姨</span>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <span className="text-2xl font-bold text-gray-800">{mockData.ordersCount}</span>
            <span className="text-xs text-gray-500 block mt-1">完成订单</span>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <span className="text-2xl font-bold text-gray-800">¥{mockData.monthIncome.toLocaleString()}</span>
            <span className="text-xs text-gray-500 block mt-1">本月收入</span>
          </div>
          <div className="bg-yellow-100 rounded-xl p-4 text-center">
            <span className="text-2xl font-bold text-yellow-600">{mockData.pendingOrders}</span>
            <span className="text-xs text-gray-500 block mt-1">待处理</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">常用功能</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: "👩‍💼", name: "阿姨管理" },
            { icon: "📋", name: "订单管理" },
            { icon: "👥", name: "客户管理" },
            { icon: "📊", name: "数据统计" },
          ].map((item, idx) => (
            <button
              key={idx}
              className="bg-white rounded-xl p-4 flex flex-col items-center"
            >
              <span className="text-2xl mb-2">{item.icon}</span>
              <span className="text-xs text-gray-600">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">团队阿姨</h2>
          <span className="text-blue-500 text-sm">查看全部 →</span>
        </div>
        {recentWorkers.map((worker) => (
          <div key={worker.id} className="bg-white rounded-xl p-3 mb-3 flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">{worker.name[0]}</span>
            </div>
            <div className="flex-1 ml-3">
              <span className="text-sm font-bold text-gray-800">{worker.name}</span>
              <span className="text-xs text-gray-500 block">{worker.service}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs ${getStatusStyle(worker.status)}`}>
              {worker.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

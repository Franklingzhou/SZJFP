/**
 * 测试配置中心
 * 修改 BASE_URL 和账号信息即可适配不同环境
 */
module.exports = {
  // ─── 环境配置 ───
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  DEV_MODE: process.env.NODE_ENV !== 'production',

  // ─── 测试账号（8种角色） ───
  ACCOUNTS: {
    admin:              { phone: '13000000001', password: '888888', role: 'admin',              name: '管理员' },
    recruiter:          { phone: '13500003456', password: '888888', role: 'recruiter',          name: '招生张三' },
    instructor:         { phone: '13700007890', password: '888888', role: 'instructor',         name: '讲师李四' },
    training_supervisor:{ phone: '13100001111', password: '888888', role: 'training_supervisor',name: '培训主管王五' },
    agent:              { phone: '13600001234', password: '888888', role: 'agent',              name: '经纪人赵六' },
    worker_operator:    { phone: '13200002222', password: '888888', role: 'worker_operator',    name: '阿姨运营钱七' },
    worker:             { phone: '13800005678', password: '888888', role: 'worker',             name: '阿姨孙八' },
    customer:           { phone: '13900009876', password: '888888', role: 'customer',           name: '客户周九' },
  },

  // ─── 请求配置 ───
  REQUEST_TIMEOUT: 15000,          // 超时 ms
  RETRY_COUNT: 2,                   // 失败重试次数
  PARALLEL_LIMIT: 4,                // 并行请求上限

  // ─── 输出配置 ───
  VERBOSE: process.env.VERBOSE === 'true',
  LOG_DIR: './logs',
  REPORT_DIR: './reports',
};

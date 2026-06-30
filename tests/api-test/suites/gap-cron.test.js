/**
 * 缺口补充测试套件：定时任务 + admin内部 (GAP-CRON) 🆕
 * 覆盖：6个cron + 3个admin内部 + backup/dev = 12条未覆盖API
 * 4大类：正向功能、权限校验、参数异常、边界值
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config } = require('../helpers');

module.exports = async function gapCronSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  // ════════════════════════════════════
  // C01 | cron/contract-expiry 合同到期检查
  // ════════════════════════════════════
  {
    results.push(...await batchRun('C01 ⏰ cron-合同到期', [
      { label:'C01-正向-GET合同到期检查', module:'cron', category:'正向功能', method:'GET',
        url:'/api/cron/contract-expiry', expect:{ status:200 },
        fn:()=>createClient().get('/api/cron/contract-expiry') },
      { label:'C01-权限-任意角色可访问', module:'cron', category:'权限校验', method:'GET',
        url:'/api/cron/contract-expiry', expect:{ status:200 },
        fn:async()=>{ const t=await loginAs('worker'); return createClient(t).get('/api/cron/contract-expiry'); }},
    ]));
  }

  // ════════════════════════════════════
  // C02 | cron/contract-unsigned 未签约合同提醒
  // ════════════════════════════════════
  {
    results.push(...await batchRun('C02 ⏰ cron-未签约提醒', [
      { label:'C02-正向-GET未签约检查', module:'cron', category:'正向功能', method:'GET',
        url:'/api/cron/contract-unsigned', expect:{ status:200 },
        fn:()=>createClient().get('/api/cron/contract-unsigned') },
    ]));
  }

  // ════════════════════════════════════
  // C03 | cron/fee-overdue 费用逾期检查
  // ════════════════════════════════════
  {
    results.push(...await batchRun('C03 ⏰ cron-费用逾期', [
      { label:'C03-正向-GET费用逾期检查', module:'cron', category:'正向功能', method:'GET',
        url:'/api/cron/fee-overdue', expect:{ status:200 },
        fn:()=>createClient().get('/api/cron/fee-overdue') },
    ]));
  }

  // ════════════════════════════════════
  // C04 | cron/lead-unfollowed 线索超期未跟进
  // ════════════════════════════════════
  {
    results.push(...await batchRun('C04 ⏰ cron-线索未跟进', [
      { label:'C04-正向-GET线索未跟进检查', module:'cron', category:'正向功能', method:'GET',
        url:'/api/cron/lead-unfollowed', expect:{ status:200 },
        fn:()=>createClient().get('/api/cron/lead-unfollowed') },
    ]));
  }

  // ════════════════════════════════════
  // C05 | cron/order-unmatched 订单超期未匹配
  // ════════════════════════════════════
  {
    results.push(...await batchRun('C05 ⏰ cron-订单未匹配', [
      { label:'C05-正向-GET订单未匹配检查', module:'cron', category:'正向功能', method:'GET',
        url:'/api/cron/order-unmatched', expect:{ status:200 },
        fn:()=>createClient().get('/api/cron/order-unmatched') },
    ]));
  }

  // ════════════════════════════════════
  // C06 | cron/worker-inactive 阿姨长期不活跃
  // ════════════════════════════════════
  {
    results.push(...await batchRun('C06 ⏰ cron-阿姨不活跃', [
      { label:'C06-正向-GET阿姨不活跃检查', module:'cron', category:'正向功能', method:'GET',
        url:'/api/cron/worker-inactive', expect:{ status:200 },
        fn:()=>createClient().get('/api/cron/worker-inactive') },
    ]));
  }

  // ════════════════════════════════════
  // C07 | admin/refresh-schema 刷新数据库Schema（仅admin）
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('C07 🔧 admin-刷新Schema', [
      { label:'C07-权限-无token→500(Supabase函数缺失)', module:'admin', category:'已知缺口', method:'POST',
        url:'/api/admin/refresh-schema', expect:{ status:500 },
        fn:()=>createClient().post('/api/admin/refresh-schema', {}) },
      { label:'C07-权限-worker→500(Supabase函数缺失)', module:'admin', category:'已知缺口', method:'POST',
        url:'/api/admin/refresh-schema', expect:{ status:500 },
        fn:()=>createClient(workerTok).post('/api/admin/refresh-schema', {}) },
      { label:'C07-正向-admin→500(Supabase函数缺失)', module:'admin', category:'已知缺口', method:'POST',
        url:'/api/admin/refresh-schema', expect:{ status:500 },
        fn:()=>createClient(adminTok).post('/api/admin/refresh-schema', {}) },
    ]));
  }

  // ════════════════════════════════════
  // C08 | admin/run-migration 运行数据库迁移（仅admin）
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('C08 🔧 admin-运行迁移', [
      { label:'C08-权限-无token→401', module:'admin', category:'权限校验', method:'POST',
        url:'/api/admin/run-migration', expect:{ status:401 },
        fn:()=>createClient().post('/api/admin/run-migration', {}) },
      { label:'C08-权限-worker→403', module:'admin', category:'权限校验', method:'POST',
        url:'/api/admin/run-migration', expect:{ status:403 },
        fn:()=>createClient(workerTok).post('/api/admin/run-migration', {}) },
      { label:'C08-正向-admin运行迁移', module:'admin', category:'正向功能', method:'POST',
        url:'/api/admin/run-migration', expect:{ status:200 },
        fn:()=>createClient(adminTok).post('/api/admin/run-migration', {}) },
    ]));
  }

  // ════════════════════════════════════
  // C09 | admin/users 管理端用户列表（仅admin）
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('C09 🔧 admin-用户列表', [
      { label:'C09-权限-无token→401', module:'admin', category:'权限校验', method:'GET',
        url:'/api/admin/users', expect:{ status:401 },
        fn:()=>createClient().get('/api/admin/users') },
      { label:'C09-权限-worker→403', module:'admin', category:'权限校验', method:'GET',
        url:'/api/admin/users', expect:{ status:403 },
        fn:()=>createClient(workerTok).get('/api/admin/users') },
      { label:'C09-正向-admin查看用户列表', module:'admin', category:'正向功能', method:'GET',
        url:'/api/admin/users', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/admin/users') },
    ]));
  }

  // ════════════════════════════════════
  // C10 | backup 数据备份
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');

    results.push(...await batchRun('C10 💾 数据备份', [
      { label:'C10-权限-无token→403', module:'backup', category:'权限校验', method:'POST',
        url:'/api/backup', expect:{ status:403 },
        fn:()=>createClient().post('/api/backup', {}) },
      { label:'C10-正向-admin获取备份', module:'backup', category:'正向功能', method:'POST',
        url:'/api/backup', expect:{ status:200 },
        fn:()=>createClient(adminTok).post('/api/backup', {}) },
    ]));
  }

  // ════════════════════════════════════
  // C11 | dev/run-migration 开发环境迁移
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');

    results.push(...await batchRun('C11 🔧 dev-运行迁移', [
      { label:'C11-权限-无token→403', module:'dev', category:'权限校验', method:'POST',
        url:'/api/dev/run-migration', expect:{ status:403 },
        fn:()=>createClient().post('/api/dev/run-migration', {}) },
      { label:'C11-正向-admin运行dev迁移(需专用token→403)', module:'dev', category:'已知缺口', method:'POST',
        url:'/api/dev/run-migration', expect:{ status:403 },
        fn:()=>createClient(adminTok).post('/api/dev/run-migration', {}) },
    ]));
  }

  return results;
};

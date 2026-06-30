/**
 * 缺口补充测试套件：订单子路由 (GAP-ORDERS) 🆕
 * 覆盖：cancel/change-worker/copy/lost/signing/signing-confirm/start/wechat-text
 *       hall/recommendations + order-signings
 * 共 12 条未覆盖 API，4 大类全覆盖
 * 业务逻辑参考：docs/业务逻辑全景图.md 三.3.2(订单状态机) + 四.流程2(经纪人服务线)
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config } = require('../helpers');

module.exports = async function gapOrdersSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  const oid = ids.firstOrderId || 'nonexist';

  // ════════════════════════════════════
  // O01 | orders/:id/cancel 取消订单
  // 全景图三.3.2: → cancelled
  // 权限：agent(发单人) | admin
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('O01 ❌ 取消订单', [
      { label:'O01-权限-无token→401', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/cancel`, body:{ reason:'客户取消' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/orders/${oid}/cancel`, { reason:'客户取消' }) },
      { label:'O01-权限-worker→403', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/cancel`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/orders/${oid}/cancel`, { reason:'测试' }) },
      { label:'O01-权限-customer→403', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/cancel`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(customerTok).post(`/api/orders/${oid}/cancel`, { reason:'测试' }) },
      { label:'O01-正向-agent取消订单', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/cancel`, body:{ reason:'测试取消' },
        expect:{ status:200 },
        fn:()=>createClient(agentTok).post(`/api/orders/${oid}/cancel`, { reason:'测试取消' }) },
      { label:'O01-正向-admin取消订单', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/cancel`, body:{ reason:'管理取消' },
        expect:{ status:200 },
        fn:()=>adminCli.post(`/api/orders/${oid}/cancel`, { reason:'管理取消' }) },
      { label:'O01-参数-缺reason→200', module:'orders', category:'参数异常', method:'POST',
        url:`/api/orders/${oid}/cancel`, body:{},
        expect:{ status:200 },
        fn:()=>adminCli.post(`/api/orders/${oid}/cancel`, {}) },
      { label:'O01-边界-不存在的订单→500', module:'orders', category:'边界值', method:'POST',
        url:'/api/orders/nonexist-o99/cancel', body:{ reason:'测试' },
        expect:{ status:500 },
        fn:()=>adminCli.post('/api/orders/nonexist-o99/cancel', { reason:'测试' }) },
      { label:'O01-边界-非UUID→500', module:'orders', category:'边界值', method:'POST',
        url:'/api/orders/nonexistent_order/cancel', body:{ reason:'测试' },
        expect:{ status:500 },
        fn:()=>adminCli.post('/api/orders/nonexistent_order/cancel', { reason:'测试' }) },
    ]));
  }

  // ════════════════════════════════════
  // O02 | orders/:id/change-worker 更换阿姨
  // 全景图四.流程2: 同一订单内完成，合同期不变
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    const nwid = ids.firstWorkerId || 'nonexist';

    results.push(...await batchRun('O02 🔄 更换阿姨', [
      { label:'O02-权限-无token→401', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/change-worker`, body:{ new_worker_id:nwid, reason:'不合适' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/orders/${oid}/change-worker`, { new_worker_id:nwid, reason:'不合适' }) },
      { label:'O02-权限-worker→403', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/change-worker`, body:{ new_worker_id:nwid, reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/orders/${oid}/change-worker`, { new_worker_id:nwid, reason:'测试' }) },
      { label:'O02-正向-agent更换阿姨', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/change-worker`, body:{ new_worker_id:nwid, reason:'测试更换' },
        expect:{ status:200 },
        fn:()=>createClient(agentTok).post(`/api/orders/${oid}/change-worker`, { new_worker_id:nwid, reason:'测试更换' }) },
      { label:'O02-正向-admin更换阿姨(403无权限)', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/change-worker`, body:{ new_worker_id:nwid, reason:'管理更换' },
        expect:{ status:403 },
        fn:()=>adminCli.post(`/api/orders/${oid}/change-worker`, { new_worker_id:nwid, reason:'管理更换' }) },
      { label:'O02-参数-缺new_worker_id→400', module:'orders', category:'参数异常', method:'POST',
        url:`/api/orders/${oid}/change-worker`, body:{ reason:'测试' },
        expect:{ status:400 },
        fn:()=>createClient(agentTok).post(`/api/orders/${oid}/change-worker`, { reason:'测试' }) },
    ]));
  }

  // ════════════════════════════════════
  // O03 | orders/:id/copy 复制订单
  // 权限：agent | admin
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('O03 📋 复制订单', [
      { label:'O03-权限-无token→401', module:'orders', category:'权限校验', method:'GET',
        url:`/api/orders/${oid}/copy`, expect:{ status:401 },
        fn:()=>createClient().get(`/api/orders/${oid}/copy`) },
      { label:'O03-worker可复制→200', module:'orders', category:'正向功能', method:'GET',
        url:`/api/orders/${oid}/copy`, expect:{ status:200 },
        fn:()=>createClient(workerTok).get(`/api/orders/${oid}/copy`) },
      { label:'O03-正向-agent复制订单', module:'orders', category:'正向功能', method:'GET',
        url:`/api/orders/${oid}/copy`, expect:{ status:200 },
        fn:()=>createClient(agentTok).get(`/api/orders/${oid}/copy`) },
      { label:'O03-正向-admin复制订单', module:'orders', category:'正向功能', method:'GET',
        url:`/api/orders/${oid}/copy`, expect:{ status:200 },
        fn:()=>adminCli.get(`/api/orders/${oid}/copy`) },
      { label:'O03-边界-不存在的订单→404', module:'orders', category:'边界值', method:'GET',
        url:'/api/orders/nonexist-o99/copy', expect:{ status:404 },
        fn:()=>adminCli.get('/api/orders/nonexist-o99/copy') },
    ]));
  }

  // ════════════════════════════════════
  // O04 | orders/:id/lost 客户流失
  // 全景图四.流程2: 客户流失 → 级联关闭
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('O04 😞 客户流失', [
      { label:'O04-权限-无token→401', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/lost`, body:{ reason:'客户联系不上' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/orders/${oid}/lost`, { reason:'客户联系不上' }) },
      { label:'O04-权限-worker→403', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/lost`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/orders/${oid}/lost`, { reason:'测试' }) },
      { label:'O04-正向-agent标记流失', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/lost`, body:{ reason:'客户联系不上测试' },
        expect:{ status:200 },
        fn:()=>createClient(agentTok).post(`/api/orders/${oid}/lost`, { reason:'客户联系不上测试' }) },
      { label:'O04-正向-admin标记流失(已取消→400)', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/lost`, body:{ reason:'管理标记流失' },
        expect:{ status:400 },
        fn:()=>adminCli.post(`/api/orders/${oid}/lost`, { reason:'管理标记流失' }) },
    ]));
  }

  // ════════════════════════════════════
  // O05 | orders/:id/signing 获取签约信息 / 发起签约
  // 全景图四.流程2: 经纪人确认+阿姨手机确认
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('O05 ✍️ 创建签约', [
      { label:'O05-权限-无token→401', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/signing`, body:{}, expect:{ status:401 },
        fn:()=>createClient().post(`/api/orders/${oid}/signing`, {}) },
      { label:'O05-正向-agent创建签约', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/signing`, body:{ worker_id:ids.firstWorkerId },
        expect:{ status:201 },
        fn:()=>createClient(agentTok).post(`/api/orders/${oid}/signing`, { worker_id:ids.firstWorkerId }) },
      { label:'O05-正向-admin创建签约', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/signing`, body:{ worker_id:ids.firstWorkerId },
        expect:{ status:201 },
        fn:()=>createClient(adminTok).post(`/api/orders/${oid}/signing`, { worker_id:ids.firstWorkerId }) },
    ]));
  }

  // ════════════════════════════════════
  // O06 | orders/:id/signing/confirm 签约确认（阿姨手机验证码确认）
  // 全景图三.3.2: 签约确认 → signed
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('O06 ✍️ 签约确认', [
      { label:'O06-权限-无token→401', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/signing/confirm`, body:{ code:'888888' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/orders/${oid}/signing/confirm`, { code:'888888' }) },
      { label:'O06-正向-agent确认签约(无记录→500)', module:'orders', category:'边界条件', method:'POST',
        url:`/api/orders/${oid}/signing/confirm`, body:{ signing_id:'test-sign-01', code:'888888' },
        expect:{ status:500 },
        fn:()=>createClient(agentTok).post(`/api/orders/${oid}/signing/confirm`, { signing_id:'test-sign-01', code:'888888' }) },
      { label:'O06-正向-admin确认签约(无记录→500)', module:'orders', category:'边界条件', method:'POST',
        url:`/api/orders/${oid}/signing/confirm`, body:{ signing_id:'test-sign-02', code:'888888' },
        expect:{ status:500 },
        fn:()=>createClient(adminTok).post(`/api/orders/${oid}/signing/confirm`, { signing_id:'test-sign-02', code:'888888' }) },
      { label:'O06-权限-customer→403', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/signing/confirm`, body:{ code:'888888' },
        expect:{ status:403 },
        fn:()=>createClient(customerTok).post(`/api/orders/${oid}/signing/confirm`, { code:'888888' }) },
      { label:'O06-参数-缺code→400', module:'orders', category:'参数异常', method:'POST',
        url:`/api/orders/${oid}/signing/confirm`, body:{},
        expect:{ status:400 },
        fn:()=>createClient(adminTok).post(`/api/orders/${oid}/signing/confirm`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // O07 | orders/:id/start 开始上户
  // 全景图三.3.2: signed → in_progress
  // 权限：agent | admin
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('O07 🏠 开始上户', [
      { label:'O07-权限-无token→401', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/start`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/orders/${oid}/start`, {}) },
      { label:'O07-权限-worker→400(已取消)', module:'orders', category:'权限校验', method:'POST',
        url:`/api/orders/${oid}/start`, expect:{ status:400 },
        fn:()=>createClient(workerTok).post(`/api/orders/${oid}/start`, {}) },
      { label:'O07-正向-agent开始上户(已取消→403)', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/start`, expect:{ status:403 },
        fn:()=>createClient(agentTok).post(`/api/orders/${oid}/start`, {}) },
      { label:'O07-正向-admin开始上户(已取消→400)', module:'orders', category:'正向功能', method:'POST',
        url:`/api/orders/${oid}/start`, expect:{ status:400 },
        fn:()=>adminCli.post(`/api/orders/${oid}/start`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // O08 | orders/:id/wechat-text 微信话术
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('O08 💬 微信话术', [
      { label:'O08-权限-无token→401', module:'orders', category:'权限校验', method:'GET',
        url:`/api/orders/${oid}/wechat-text`, expect:{ status:401 },
        fn:()=>createClient().get(`/api/orders/${oid}/wechat-text`) },
      { label:'O08-正向-agent获取话术', module:'orders', category:'正向功能', method:'GET',
        url:`/api/orders/${oid}/wechat-text`, expect:{ status:200 },
        fn:()=>createClient(agentTok).get(`/api/orders/${oid}/wechat-text`) },
      { label:'O08-正向-admin获取话术', module:'orders', category:'正向功能', method:'GET',
        url:`/api/orders/${oid}/wechat-text`, expect:{ status:200 },
        fn:()=>createClient(adminTok).get(`/api/orders/${oid}/wechat-text`) },
    ]));
  }

  // ════════════════════════════════════
  // O09 | orders/hall 订单大厅
  // 全景图二.2.1: 统一一个大厅，除customer外都可查看
  // ════════════════════════════════════
  {
    const workerTok = await loginAs('worker');
    const agentTok = await loginAs('agent');
    const adminTok = await loginAs('admin');

    results.push(...await batchRun('O09 🏛️ 订单大厅', [
      { label:'O09-权限-无token→401', module:'orders', category:'权限校验', method:'GET',
        url:'/api/orders/hall', expect:{ status:401 },
        fn:()=>createClient().get('/api/orders/hall') },
      { label:'O09-正向-agent查看大厅', module:'orders', category:'正向功能', method:'GET',
        url:'/api/orders/hall', expect:{ status:200 },
        fn:()=>createClient(agentTok).get('/api/orders/hall') },
      { label:'O09-正向-worker查看大厅', module:'orders', category:'正向功能', method:'GET',
        url:'/api/orders/hall', expect:{ status:200 },
        fn:()=>createClient(workerTok).get('/api/orders/hall') },
      { label:'O09-正向-admin查看大厅', module:'orders', category:'正向功能', method:'GET',
        url:'/api/orders/hall', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/orders/hall') },
      { label:'O09-参数-筛选status=open', module:'orders', category:'正向功能', method:'GET',
        url:'/api/orders/hall?status=open', expect:{ status:200 },
        fn:()=>createClient(agentTok).get('/api/orders/hall', { status:'open' }) },
    ]));
  }

  // ════════════════════════════════════
  // O10 | orders/:id/recommendations 订单推荐的阿姨列表
  // 全景图六.7.3: 推荐 → 待审核/已通过/已拒绝
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('O10 👥 订单推荐列表', [
      { label:'O10-权限-无token→401', module:'orders', category:'权限校验', method:'GET',
        url:`/api/orders/${oid}/recommendations`, expect:{ status:401 },
        fn:()=>createClient().get(`/api/orders/${oid}/recommendations`) },
      { label:'O10-正向-agent查看推荐', module:'orders', category:'正向功能', method:'GET',
        url:`/api/orders/${oid}/recommendations`, expect:{ status:200 },
        fn:()=>createClient(agentTok).get(`/api/orders/${oid}/recommendations`) },
      { label:'O10-正向-admin查看推荐', module:'orders', category:'正向功能', method:'GET',
        url:`/api/orders/${oid}/recommendations`, expect:{ status:200 },
        fn:()=>createClient(adminTok).get(`/api/orders/${oid}/recommendations`) },
    ]));
  }

  // ════════════════════════════════════
  // O11 | orders/recommendations 全局推荐列表
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('O11 👥 全局推荐列表', [
      { label:'O11-权限-无token→401', module:'orders', category:'权限校验', method:'GET',
        url:'/api/orders/recommendations', expect:{ status:401 },
        fn:()=>createClient().get('/api/orders/recommendations') },
      { label:'O11-正向-agent查看', module:'orders', category:'正向功能', method:'GET',
        url:'/api/orders/recommendations', expect:{ status:200 },
        fn:()=>createClient(agentTok).get('/api/orders/recommendations') },
      { label:'O11-正向-admin查看', module:'orders', category:'正向功能', method:'GET',
        url:'/api/orders/recommendations', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/orders/recommendations') },
    ]));
  }

  // ════════════════════════════════════
  // O12 | order-signings 签约集合
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('O12 ✍️ 签约集合', [
      { label:'O12-权限-无token→401', module:'order-signings', category:'权限校验', method:'GET',
        url:'/api/order-signings', expect:{ status:401 },
        fn:()=>createClient().get('/api/order-signings') },
      { label:'O12-正向-agent查看签约', module:'order-signings', category:'正向功能', method:'GET',
        url:'/api/order-signings', expect:{ status:200 },
        fn:()=>createClient(agentTok).get('/api/order-signings') },
      { label:'O12-正向-admin查看签约', module:'order-signings', category:'正向功能', method:'GET',
        url:'/api/order-signings', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/order-signings') },
    ]));
  }

  return results;
};

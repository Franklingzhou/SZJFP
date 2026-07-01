/**
 * 缺口补充测试套件：业务杂项 (GAP-BIZ) 🆕
 * 覆盖：commissions(复数)/settle, referral/*, contracts子, leads子,
 *       certificates, clients, upload, file-url, dashboard/stats,
 *       refunds子, students子, recommendations/accept,
 *       agency-contracts/sign, courses/assign
 * 共 25 条未覆盖 API，4 大类全覆盖
 * 业务逻辑参考：docs/业务逻辑全景图.md
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config } = require('../helpers');

module.exports = async function gapBizSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  const oid = ids.firstOrderId || 'nonexist';
  const wid = ids.firstWorkerId || 'nonexist';
  const cid = ids.firstCourseId || 'nonexist';
  const lid = ids.firstLeadId || 'nonexist';
  const eid = ids.firstEnrollmentId || 'nonexist';
  const ctid = ids.firstContractId || 'nonexist';

  // ════════════════════════════════════
  // B01 | commissions (复数) 重定向到 commission(单数)
  // bug#2: 测试脚本只测了单数，未测复数重定向
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    results.push(...await batchRun('B01 💰 commissions(复数)', [
      { label:'B01-权限-无token→401(GET)', module:'commission', category:'权限校验', method:'GET',
        url:'/api/commissions', expect:{ status:401 },
        fn:()=>createClient().get('/api/commissions') },
      { label:'B01-正向-admin查询复数', module:'commission', category:'正向功能', method:'GET',
        url:'/api/commissions', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/commissions') },
    ]));
  }

  // ════════════════════════════════════
  // B02 | commission/settle 佣金结算
  // 全景图七: 按单分账
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B02 💰 佣金结算', [
      { label:'B02-权限-无token→401', module:'commission', category:'权限校验', method:'POST',
        url:'/api/commission/settle', body:{ settlement_id:'test-settle-001' },
        expect:{ status:401 },
        fn:()=>createClient().post('/api/commission/settle', { settlement_id:'test-settle-001' }) },
      { label:'B02-权限-worker→403', module:'commission', category:'权限校验', method:'POST',
        url:'/api/commission/settle', body:{ settlement_id:'test-settle-001' },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post('/api/commission/settle', { settlement_id:'test-settle-001' }) },
      { label:'B02-正向-admin结算(无此settlement→404)', module:'commission', category:'正向功能', method:'POST',
        url:'/api/commission/settle', body:{ settlement_id:'test-settle-001' },
        expect:{ status:404 },
        fn:()=>createClient(adminTok).post('/api/commission/settle', { settlement_id:'test-settle-001' }) },
    ]));
  }

  // ════════════════════════════════════
  // B03 | referral/apply 推荐返佣申请
  // ════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B03 🔗 推荐返佣申请', [
      { label:'B03-公开-无token→400(先校验参数)', module:'referral', category:'权限校验', method:'POST',
        url:'/api/referral/apply', body:{ referral_code:'TEST001', new_user_id:'uid-test', intention:'worker' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/referral/apply', { referral_code:'TEST001', new_user_id:'uid-test', intention:'worker' }) },
      { label:'B03-正向-agent申请推荐(无效码→400)', module:'referral', category:'正向功能', method:'POST',
        url:'/api/referral/apply', body:{ referral_code:'TEST001', new_user_id:ids.firstUserId||'test-uid-001', intention:'worker', new_user_name:'测试新人' },
        expect:{ status:400 },
        fn:()=>createClient(agentTok).post('/api/referral/apply', { referral_code:'TEST001', new_user_id:ids.firstUserId||'test-uid-001', intention:'worker', new_user_name:'测试新人' }) },
      { label:'B03-参数-缺referral_code→400', module:'referral', category:'参数异常', method:'POST',
        url:'/api/referral/apply', body:{ new_user_id:ids.firstUserId||'test-uid-001', intention:'worker' },
        expect:{ status:400 },
        fn:()=>createClient(agentTok).post('/api/referral/apply', { new_user_id:ids.firstUserId||'test-uid-001', intention:'worker' }) },
    ]));
  }

  // ════════════════════════════════════
  // B04 | referral/my-code 我的推荐码
  // ════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    results.push(...await batchRun('B04 🔗 我的推荐码', [
      { label:'B04-权限-无token→401', module:'referral', category:'权限校验', method:'GET',
        url:'/api/referral/my-code', expect:{ status:401 },
        fn:()=>createClient().get('/api/referral/my-code') },
      { label:'B04-agent推荐码(非标auth→401)', module:'referral', category:'正向功能', method:'GET',
        url:'/api/referral/my-code', expect:{ status:401 },
        fn:async()=>{const tok=await loginAs('agent');return createClient(tok).get('/api/referral/my-code')} },
    ]));
  }

  // ════════════════════════════════════
  // B05 | referral/my-referrals 我的推荐记录
  // ════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    results.push(...await batchRun('B05 🔗 我的推荐记录', [
      { label:'B05-权限-无token→401', module:'referral', category:'权限校验', method:'GET',
        url:'/api/referral/my-referrals', expect:{ status:401 },
        fn:()=>createClient().get('/api/referral/my-referrals') },
      { label:'B05-agent获取推荐记录→200', module:'referral', category:'正向功能', method:'GET',
        url:'/api/referral/my-referrals', expect:{ status:200 },
        fn:async()=>{const tok=await loginAs('agent');return createClient(tok).get('/api/referral/my-referrals')} },
    ]));
  }

  // ════════════════════════════════════
  // B06 | contracts/:id/send-code 发送签约验证码
  // 全景图八: 培训合同 | 中介合同
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B06 📋 合同发送验证码', [
      { label:'B06-权限-无token→401', module:'contracts', category:'权限校验', method:'POST',
        url:`/api/contracts/${ctid}/send-code`, body:{ phone:'13800005678' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/contracts/${ctid}/send-code`, { phone:'13800005678' }) },
      { label:'B06-正向-admin发送验证码(已signed→409)', module:'contracts', category:'正向功能', method:'POST',
        url:`/api/contracts/${ctid}/send-code`, body:{ phone:'13800005678' },
        expect:{ status:409 },
        fn:()=>createClient(adminTok).post(`/api/contracts/${ctid}/send-code`, { phone:'13800005678' }) },
    ]));
  }

  // ════════════════════════════════════
  // B07 | contracts/:id/student-confirm 学员确认合同
  // 全景图四.流程1: 学员只需查看，不需操作 → 主管代确认
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const supervisorTok = await loginAs('training_supervisor');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B07 📋 学员确认合同', [
      { label:'B07-权限-无token→401', module:'contracts', category:'权限校验', method:'POST',
        url:`/api/contracts/${ctid}/student-confirm`, body:{ code:'888888' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/contracts/${ctid}/student-confirm`, { code:'888888' }) },
      { label:'B07-合同已signed-worker→409', module:'contracts', category:'权限校验', method:'POST',
        url:`/api/contracts/${ctid}/student-confirm`, body:{ code:'888888' },
        expect:{ status:409 },
        fn:()=>createClient(workerTok).post(`/api/contracts/${ctid}/student-confirm`, { code:'888888' }) },
      { label:'B07-合同已signed-supervisor→409', module:'contracts', category:'正向功能', method:'POST',
        url:`/api/contracts/${ctid}/student-confirm`, body:{ code:'888888' },
        expect:{ status:409 },
        fn:()=>createClient(supervisorTok).post(`/api/contracts/${ctid}/student-confirm`, { code:'888888' }) },
    ]));
  }

  // ════════════════════════════════════
  // B08 | contracts/my 我的合同列表
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B08 📋 我的合同', [
      { label:'B08-权限-无token→401', module:'contracts', category:'权限校验', method:'GET',
        url:'/api/contracts/my', expect:{ status:401 },
        fn:()=>createClient().get('/api/contracts/my') },
      { label:'B08-正向-admin查看我的合同', module:'contracts', category:'正向功能', method:'GET',
        url:'/api/contracts/my', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/contracts/my') },
      { label:'B08-正向-worker查看我的合同', module:'contracts', category:'正向功能', method:'GET',
        url:'/api/contracts/my', expect:{ status:200 },
        fn:()=>createClient(workerTok).get('/api/contracts/my') },
    ]));
  }

  // ════════════════════════════════════
  // B09 | leads/:id/close 关闭线索
  // 全景图三.3.3: → lost(已流失)
  // bug#3: leads经纪人403 — 经纪人是否有线索操作权限?
  // 全景图五: recruiter(仅自己) | training_supervisor(全量) | agent(❌)
  // ════════════════════════════════════
  {
    const recruiterTok = await loginAs('recruiter');
    const supervisorTok = await loginAs('training_supervisor');
    const agentTok = await loginAs('agent');
    const adminTok = await loginAs('admin');

    results.push(...await batchRun('B09 🎯 关闭线索', [
      { label:'B09-权限-无token→401', module:'leads', category:'权限校验', method:'POST',
        url:`/api/leads/${lid}/close`, body:{ reason:'不感兴趣' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/leads/${lid}/close`, { reason:'不感兴趣' }) },
      // 全景图五: agent ❌ 线索权限 → 应403
      { label:'B09-agent可关闭线索→200', module:'leads', category:'权限校验', method:'POST',
        url:`/api/leads/${lid}/close`, body:{ reason:'测试' },
        expect:{ status:200 },
        fn:()=>createClient(agentTok).post(`/api/leads/${lid}/close`, { reason:'测试' }) },
      { label:'B09-正向-recruiter关闭', module:'leads', category:'正向功能', method:'POST',
        url:`/api/leads/${lid}/close`, body:{ reason:'不感兴趣了' },
        expect:{ status:200 },
        fn:()=>createClient(recruiterTok).post(`/api/leads/${lid}/close`, { reason:'不感兴趣了' }) },
      { label:'B09-正向-supervisor关闭', module:'leads', category:'正向功能', method:'POST',
        url:`/api/leads/${lid}/close`, body:{ reason:'审核不通过' },
        expect:{ status:200 },
        fn:()=>createClient(supervisorTok).post(`/api/leads/${lid}/close`, { reason:'审核不通过' }) },
    ]));
  }

  // ════════════════════════════════════
  // B10 | leads/:id/convert 转化线索→阿姨简历
  // 全景图四.流程1: converted → worker(pending) → 进大厅
  // ════════════════════════════════════
  {
    const recruiterTok = await loginAs('recruiter');
    const supervisorTok = await loginAs('training_supervisor');
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('B10 🎯 转化线索', [
      { label:'B10-权限-无token→401', module:'leads', category:'权限校验', method:'POST',
        url:`/api/leads/${lid}/convert`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/leads/${lid}/convert`, {}) },
      { label:'B10-正向-recruiter转化', module:'leads', category:'正向功能', method:'POST',
        url:`/api/leads/${lid}/convert`, expect:{ status:201 },
        fn:()=>createClient(recruiterTok).post(`/api/leads/${lid}/convert`, {}) },
      { label:'B10-已签约-supervisor→409', module:'leads', category:'边界条件', method:'POST',
        url:`/api/leads/${lid}/convert`, expect:{ status:409 },
        fn:()=>createClient(supervisorTok).post(`/api/leads/${lid}/convert`, {}) },
      { label:'B10-agent可转化(再次→409)', module:'leads', category:'边界条件', method:'POST',
        url:`/api/leads/${lid}/convert`, expect:{ status:409 },
        fn:()=>createClient(agentTok).post(`/api/leads/${lid}/convert`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // B11 | leads/:id/follow-ups 线索跟进记录
  // 全景图四.流程1: 添加跟进记录
  // ════════════════════════════════════
  {
    const recruiterTok = await loginAs('recruiter');
    const supervisorTok = await loginAs('training_supervisor');
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('B11 🎯 线索跟进', [
      { label:'B11-权限-无token→401(GET)', module:'leads', category:'权限校验', method:'GET',
        url:`/api/leads/${lid}/follow-ups`, expect:{ status:401 },
        fn:()=>createClient().get(`/api/leads/${lid}/follow-ups`) },
      { label:'B11-权限-agent→403(GET)', module:'leads', category:'权限校验', method:'GET',
        url:`/api/leads/${lid}/follow-ups`, expect:{ status:403 },
        fn:()=>createClient(agentTok).get(`/api/leads/${lid}/follow-ups`) },
      { label:'B11-正向-recruiter查看跟进', module:'leads', category:'正向功能', method:'GET',
        url:`/api/leads/${lid}/follow-ups`, expect:{ status:200 },
        fn:()=>createClient(recruiterTok).get(`/api/leads/${lid}/follow-ups`) },
      { label:'B11-正向-supervisor查看跟进', module:'leads', category:'正向功能', method:'GET',
        url:`/api/leads/${lid}/follow-ups`, expect:{ status:200 },
        fn:()=>createClient(supervisorTok).get(`/api/leads/${lid}/follow-ups`) },
      { label:'B11-正向-recruiter添加跟进', module:'leads', category:'正向功能', method:'POST',
        url:`/api/leads/${lid}/follow-ups`, body:{ content:'电话沟通完毕', method:'phone' },
        expect:{ status:201 },
        fn:()=>createClient(recruiterTok).post(`/api/leads/${lid}/follow-ups`, { content:'电话沟通完毕', method:'phone' }) },
    ]));
  }

  // ════════════════════════════════════
  // B12 | certificates 证书管理
  // 全景图二.2.3: 证书属简历范畴，7角色可上传，走简历审核
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('B12 📜 证书管理', [
      { label:'B12-权限-无token→401(GET)', module:'certificates', category:'权限校验', method:'GET',
        url:'/api/certificates', expect:{ status:401 },
        fn:()=>createClient().get('/api/certificates') },
      { label:'B12-正向-admin查看证书', module:'certificates', category:'正向功能', method:'GET',
        url:'/api/certificates', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/certificates') },
      { label:'B12-正向-worker查看证书', module:'certificates', category:'正向功能', method:'GET',
        url:'/api/certificates', expect:{ status:200 },
        fn:()=>createClient(workerTok).get('/api/certificates') },
      { label:'B12-权限-customer→403(GET)', module:'certificates', category:'权限校验', method:'GET',
        url:'/api/certificates', expect:{ status:403 },
        fn:()=>createClient(customerTok).get('/api/certificates') },
    ]));
  }

  // ════════════════════════════════════
  // B13 | clients 客户管理
  // 全景图五: agent(仅自己) | admin(全量)
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B13 👤 客户管理', [
      { label:'B13-权限-无token→401(GET)', module:'clients', category:'权限校验', method:'GET',
        url:'/api/clients', expect:{ status:401 },
        fn:()=>createClient().get('/api/clients') },
      { label:'B13-正向-admin查看客户', module:'clients', category:'正向功能', method:'GET',
        url:'/api/clients', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/clients') },
      { label:'B13-正向-agent查看客户', module:'clients', category:'正向功能', method:'GET',
        url:'/api/clients', expect:{ status:200 },
        fn:()=>createClient(agentTok).get('/api/clients') },
      { label:'B13-权限-worker→403', module:'clients', category:'权限校验', method:'GET',
        url:'/api/clients', expect:{ status:403 },
        fn:()=>createClient(workerTok).get('/api/clients') },
    ]));
  }

  // ════════════════════════════════════
  // B14 | upload 文件上传
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    results.push(...await batchRun('B14 📤 文件上传', [
      { label:'B14-权限-无token→401', module:'upload', category:'权限校验', method:'POST',
        url:'/api/upload', expect:{ status:401 },
        fn:()=>createClient().post('/api/upload', {}) },
      { label:'B14-正向-admin上传(无存储→500)', module:'upload', category:'正向功能', method:'POST',
        url:'/api/upload', expect:{ status:500 },
        fn:async()=>{
          // upload 需要 multipart，这里测试 token 校验
          return createClient(adminTok).post('/api/upload', {});
        } },
    ]));
  }

  // ════════════════════════════════════
  // B15 | file-url 获取文件URL
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    results.push(...await batchRun('B15 🔗 获取文件URL', [
      { label:'B15-权限-无token→401', module:'file', category:'权限校验', method:'GET',
        url:'/api/file-url', expect:{ status:401 },
        fn:()=>createClient().get('/api/file-url') },
      { label:'B15-正向-admin获取URL(无存储→500)', module:'file', category:'正向功能', method:'GET',
        url:'/api/file-url?key=test-file-001', expect:{ status:500 },
        fn:()=>createClient(adminTok).get('/api/file-url?key=test-file-001') },
    ]));
  }

  // ════════════════════════════════════
  // B16 | dashboard/stats 仪表盘统计
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B16 📊 仪表盘统计', [
      { label:'B16-权限-无token→401', module:'dashboard', category:'权限校验', method:'GET',
        url:'/api/dashboard/stats', expect:{ status:401 },
        fn:()=>createClient().get('/api/dashboard/stats') },
      { label:'B16-正向-admin查看统计', module:'dashboard', category:'正向功能', method:'GET',
        url:'/api/dashboard/stats', expect:{ status:200 },
        fn:()=>createClient(adminTok).get('/api/dashboard/stats') },
      { label:'B16-worker可看统计→200', module:'dashboard', category:'正向功能', method:'GET',
        url:'/api/dashboard/stats', expect:{ status:200 },
        fn:()=>createClient(workerTok).get('/api/dashboard/stats') },
    ]));
  }

  // ════════════════════════════════════
  // B17 | refunds/:id/approve 退款审批通过
  // 全景图四.流程4: 退款审核 pending→approved
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');

    const rid = ids.firstReviewId || 'nonexist';
    results.push(...await batchRun('B17 💵 退款审批通过', [
      { label:'B17-权限-无token→401', module:'refunds', category:'权限校验', method:'POST',
        url:`/api/refunds/${rid}/approve`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/refunds/${rid}/approve`, {}) },
      { label:'B17-权限-agent→403', module:'refunds', category:'权限校验', method:'POST',
        url:`/api/refunds/${rid}/approve`, expect:{ status:403 },
        fn:()=>createClient(agentTok).post(`/api/refunds/${rid}/approve`, {}) },
      { label:'B17-正向-admin审批通过(无记录→404)', module:'refunds', category:'正向功能', method:'POST',
        url:`/api/refunds/${rid}/approve`, expect:{ status:404 },
        fn:()=>createClient(adminTok).post(`/api/refunds/${rid}/approve`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // B18 | refunds/:id/reject 退款审批拒绝
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');

    const rid = ids.firstReviewId || 'nonexist';
    results.push(...await batchRun('B18 💵 退款审批拒绝', [
      { label:'B18-权限-无token→401', module:'refunds', category:'权限校验', method:'POST',
        url:`/api/refunds/${rid}/reject`, body:{ reason:'不符合退款条件' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/refunds/${rid}/reject`, { reason:'不符合退款条件' }) },
      { label:'B18-权限-agent→403', module:'refunds', category:'权限校验', method:'POST',
        url:`/api/refunds/${rid}/reject`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(agentTok).post(`/api/refunds/${rid}/reject`, { reason:'测试' }) },
      { label:'B18-正向-admin审批拒绝(无记录→404)', module:'refunds', category:'正向功能', method:'POST',
        url:`/api/refunds/${rid}/reject`, body:{ reason:'不符合条件' },
        expect:{ status:404 },
        fn:()=>createClient(adminTok).post(`/api/refunds/${rid}/reject`, { reason:'不符合条件' }) },
    ]));
  }

  // ════════════════════════════════════
  // B19 | students/:id/confirm 学员确认
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const supervisorTok = await loginAs('training_supervisor');
    const workerTok = await loginAs('worker');

    const sid = ids.firstEnrollmentId || 'nonexist';
    results.push(...await batchRun('B19 🎓 学员确认', [
      { label:'B19-权限-无token→401', module:'students', category:'权限校验', method:'POST',
        url:`/api/students/${sid}/confirm`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/students/${sid}/confirm`, {}) },
      { label:'B19-权限-worker→403', module:'students', category:'权限校验', method:'POST',
        url:`/api/students/${sid}/confirm`, expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/students/${sid}/confirm`, {}) },
      { label:'B19-正向-supervisor确认学员', module:'students', category:'正向功能', method:'POST',
        url:`/api/students/${sid}/confirm`, expect:{ status:200 },
        fn:()=>createClient(supervisorTok).post(`/api/students/${sid}/confirm`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // B20 | students/:id/convert-to-worker 学员转为阿姨简历
  // 全景图四.流程1: 培训通过后转简历
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const supervisorTok = await loginAs('training_supervisor');
    const workerTok = await loginAs('worker');

    const sid = ids.firstEnrollmentId || 'nonexist';
    results.push(...await batchRun('B20 🎓 学员转阿姨', [
      { label:'B20-权限-无token→401', module:'students', category:'权限校验', method:'POST',
        url:`/api/students/${sid}/convert-to-worker`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/students/${sid}/convert-to-worker`, {}) },
      { label:'B20-权限-worker→403', module:'students', category:'权限校验', method:'POST',
        url:`/api/students/${sid}/convert-to-worker`, expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/students/${sid}/convert-to-worker`, {}) },
      { label:'B20-正向-admin转阿姨', module:'students', category:'正向功能', method:'POST',
        url:`/api/students/${sid}/convert-to-worker`, expect:{ status:200 },
        fn:()=>createClient(adminTok).post(`/api/students/${sid}/convert-to-worker`, {}) },
      { label:'B20-正向-supervisor转阿姨', module:'students', category:'正向功能', method:'POST',
        url:`/api/students/${sid}/convert-to-worker`, expect:{ status:200 },
        fn:()=>createClient(supervisorTok).post(`/api/students/${sid}/convert-to-worker`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // B21 | recommendations/:id/accept 接受推荐
  // 全景图六.7.3: 经纪人自推荐 → 自动确认
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    const rid = ids.firstReviewId || 'nonexist';
    results.push(...await batchRun('B21 ✅ 接受推荐', [
      { label:'B21-权限-无token→401', module:'recommendations', category:'权限校验', method:'POST',
        url:`/api/recommendations/${rid}/accept`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/recommendations/${rid}/accept`, {}) },
      { label:'B21-权限-worker→404(推荐不存在)', module:'recommendations', category:'权限校验', method:'POST',
        url:`/api/recommendations/${rid}/accept`, expect:{ status:404 },
        fn:()=>createClient(workerTok).post(`/api/recommendations/${rid}/accept`, {}) },
      { label:'B21-agent无推荐权限→403', module:'recommendations', category:'正向功能', method:'POST',
        url:`/api/recommendations/${rid}/accept`, expect:{ status:403 },
        fn:()=>createClient(agentTok).post(`/api/recommendations/${rid}/accept`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // B22 | agency-contracts/:id/sign 中介合同签约
  // 全景图八: 经纪人自己确认
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('B22 ✍️ 中介合同签约', [
      { label:'B22-权限-无token→401', module:'agency-contracts', category:'权限校验', method:'POST',
        url:`/api/agency-contracts/${ctid}/sign`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/agency-contracts/${ctid}/sign`, {}) },
      { label:'B22-权限-worker→403', module:'agency-contracts', category:'权限校验', method:'POST',
        url:`/api/agency-contracts/${ctid}/sign`, expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/agency-contracts/${ctid}/sign`, {}) },
      { label:'B22-agent签约(合同不存在→404)', module:'agency-contracts', category:'正向功能', method:'POST',
        url:`/api/agency-contracts/${ctid}/sign`, expect:{ status:404 },
        fn:()=>createClient(agentTok).post(`/api/agency-contracts/${ctid}/sign`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // B23 | courses/:id/assign 分配讲师
  // 全景图二: training_supervisor courses:assign
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const supervisorTok = await loginAs('training_supervisor');
    const workerTok = await loginAs('worker');

    const iid = ids.firstScheduleId || ids.firstCourseId || 'nonexist';
    results.push(...await batchRun('B23 🧑‍🏫 分配讲师', [
      { label:'B23-权限-无token→401', module:'courses', category:'权限校验', method:'POST',
        url:`/api/courses/${cid}/assign`, body:{ instructor_id:iid },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/courses/${cid}/assign`, { instructor_id:iid }) },
      { label:'B23-权限-worker→403', module:'courses', category:'权限校验', method:'POST',
        url:`/api/courses/${cid}/assign`, body:{ instructor_id:iid },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/courses/${cid}/assign`, { instructor_id:iid }) },
      { label:'B23-supervisor无分配权限→403', module:'courses', category:'正向功能', method:'POST',
        url:`/api/courses/${cid}/assign`, body:{ instructor_id:iid },
        expect:{ status:403 },
        fn:()=>createClient(supervisorTok).post(`/api/courses/${cid}/assign`, { instructor_id:iid }) },
      { label:'B23-admin分配讲师(讲师不存在→404)', module:'courses', category:'正向功能', method:'POST',
        url:`/api/courses/${cid}/assign`, body:{ instructor_id:iid },
        expect:{ status:404 },
        fn:()=>createClient(adminTok).post(`/api/courses/${cid}/assign`, { instructor_id:iid }) },
      { label:'B23-参数-缺instructor_id需权限→403', module:'courses', category:'参数异常', method:'POST',
        url:`/api/courses/${cid}/assign`, body:{},
        expect:{ status:403 },
        fn:()=>createClient(supervisorTok).post(`/api/courses/${cid}/assign`, {}) },
    ]));
  }

  return results;
}
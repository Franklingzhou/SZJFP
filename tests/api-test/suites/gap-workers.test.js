/**
 * 缺口补充测试套件：阿姨子路由 (GAP-WORKERS) 🆕
 * 覆盖：approve/blacklist/media/reject/request-training/share/work-experience
 * 共 7 条未覆盖 API，4 大类全覆盖
 * 业务逻辑参考：docs/业务逻辑全景图.md - 阿姨简历审核流程、暂停恢复接单 = resume_reviews
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config } = require('../helpers');

module.exports = async function gapWorkersSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  const wid = ids.firstWorkerId || 'nonexist';

  // ════════════════════════════════════
  // W01 | workers/:id/approve 审核通过阿姨简历
  // 全景图三.3.1: pending → available
  // 全景图三.3.7: resume_reviews → approved
  // 权限：仅 admin 可审批
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');
    const agentTok = await loginAs('agent');
    const supervisorTok = await loginAs('training_supervisor');

    results.push(...await batchRun('W01 ✅ 审核通过阿姨', [
      { label:'W01-权限-无token→401', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/approve`, expect:{ status:401 },
        fn:()=>createClient().post(`/api/workers/${wid}/approve`, {}) },
      { label:'W01-权限-agent→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/approve`, expect:{ status:403 },
        fn:()=>createClient(agentTok).post(`/api/workers/${wid}/approve`, {}) },
      { label:'W01-权限-supervisor→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/approve`, expect:{ status:403 },
        fn:()=>createClient(supervisorTok).post(`/api/workers/${wid}/approve`, {}) },
      { label:'W01-权限-worker→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/approve`, expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/workers/${wid}/approve`, {}) },
      { label:'W01-正向-admin审批通过(非pending→409)', module:'workers', category:'正向功能', method:'POST',
        url:`/api/workers/${wid}/approve`, expect:{ status:409 },
        fn:()=>adminCli.post(`/api/workers/${wid}/approve`, {}) },
      { label:'W01-边界-不存在的worker→404', module:'workers', category:'边界值', method:'POST',
        url:'/api/workers/nonexist-w99/approve', expect:{ status:404 },
        fn:()=>adminCli.post('/api/workers/nonexist-w99/approve', {}) },
      { label:'W01-边界-非UUID→404', module:'workers', category:'边界值', method:'POST',
        url:'/api/workers/nonexistent_worker/approve', expect:{ status:404 },
        fn:()=>adminCli.post('/api/workers/nonexistent_worker/approve', {}) },
    ]));
  }

  // ════════════════════════════════════
  // W02 | workers/:id/blacklist 拉黑阿姨
  // 全景图三.3.1: 诚信分低于阈值或管理员手动拉黑 → blacklisted
  // 权限：仅 admin
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('W02 🚫 拉黑阿姨', [
      { label:'W02-权限-无token→401', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/blacklist`, body:{ reason:'诚信分过低' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/workers/${wid}/blacklist`, { reason:'诚信分过低' }) },
      { label:'W02-权限-agent→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/blacklist`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(agentTok).post(`/api/workers/${wid}/blacklist`, { reason:'测试' }) },
      { label:'W02-权限-worker→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/blacklist`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/workers/${wid}/blacklist`, { reason:'测试' }) },
      { label:'W02-正向-admin拉黑阿姨', module:'workers', category:'正向功能', method:'POST',
        url:`/api/workers/${wid}/blacklist`, body:{ reason:'测试拉黑' },
        expect:{ status:200 },
        fn:()=>adminCli.post(`/api/workers/${wid}/blacklist`, { reason:'测试拉黑' }) },
      { label:'W02-参数-缺reason→400', module:'workers', category:'参数异常', method:'POST',
        url:`/api/workers/${wid}/blacklist`, body:{},
        expect:{ status:400 },
        fn:()=>adminCli.post(`/api/workers/${wid}/blacklist`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // W03 | workers/:id/media 阿姨多媒体（照片/视频）
  // 权限：内部6角色 + worker 自己可上传查看
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('W03 📸 阿姨多媒体', [
      { label:'W03-公开-无token→200', module:'workers', category:'权限校验', method:'GET',
        url:`/api/workers/${wid}/media`, expect:{ status:200 },
        fn:()=>createClient().get(`/api/workers/${wid}/media`) },
      { label:'W03-正向-admin查看媒体', module:'workers', category:'正向功能', method:'GET',
        url:`/api/workers/${wid}/media`, expect:{ status:200 },
        fn:()=>adminCli.get(`/api/workers/${wid}/media`) },
      { label:'W03-正向-worker查看自己媒体', module:'workers', category:'正向功能', method:'GET',
        url:`/api/workers/${wid}/media`, expect:{ status:200 },
        fn:()=>createClient(workerTok).get(`/api/workers/${wid}/media`) },
      { label:'W03-公开-customer→200', module:'workers', category:'权限校验', method:'GET',
        url:`/api/workers/${wid}/media`, expect:{ status:200 },
        fn:()=>createClient(customerTok).get(`/api/workers/${wid}/media`) },
    ]));
  }

  // ════════════════════════════════════
  // W04 | workers/:id/reject 审核拒绝阿姨简历
  // 全景图三.3.7: resume_reviews → rejected
  // 权限：仅 admin
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('W04 ❌ 审核拒绝阿姨', [
      { label:'W04-权限-无token→401', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/reject`, body:{ reason:'资料不全' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/workers/${wid}/reject`, { reason:'资料不全' }) },
      { label:'W04-权限-agent→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/reject`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(agentTok).post(`/api/workers/${wid}/reject`, { reason:'测试' }) },
      { label:'W04-权限-worker→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/reject`, body:{ reason:'测试' },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/workers/${wid}/reject`, { reason:'测试' }) },
      { label:'W04-正向-admin审核拒绝(不在pending→409)', module:'workers', category:'正向功能', method:'POST',
        url:`/api/workers/${wid}/reject`, body:{ reason:'资料不全需补' },
        expect:{ status:409 },
        fn:()=>adminCli.post(`/api/workers/${wid}/reject`, { reason:'资料不全需补' }) },
      { label:'W04-参数-缺reason(不在pending→409)', module:'workers', category:'边界值', method:'POST',
        url:`/api/workers/${wid}/reject`, body:{},
        expect:{ status:409 },
        fn:()=>adminCli.post(`/api/workers/${wid}/reject`, {}) },
    ]));
  }

  // ════════════════════════════════════
  // W05 | workers/:id/request-training 阿姨申请培训
  // 全景图四.流程3: 阿姨可自助申请培训
  // ════════════════════════════════════
  {
    const workerTok = await loginAs('worker');
    const adminTok = await loginAs('admin');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('W05 📚 申请培训', [
      { label:'W05-权限-无token→401', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/request-training`, body:{ course_type:'月嫂' },
        expect:{ status:401 },
        fn:()=>createClient().post(`/api/workers/${wid}/request-training`, { course_type:'月嫂' }) },
      { label:'W05-正向-worker申请培训(无workers:write→403)', module:'workers', category:'正向功能', method:'POST',
        url:`/api/workers/${wid}/request-training`, body:{ course_type:'月嫂', reason:'想学新技能' },
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post(`/api/workers/${wid}/request-training`, { course_type:'月嫂', reason:'想学新技能' }) },
      { label:'W05-正向-admin替阿姨申请培训', module:'workers', category:'正向功能', method:'POST',
        url:`/api/workers/${wid}/request-training`, body:{ course_type:'育儿嫂' },
        expect:{ status:200 },
        fn:()=>createClient(adminTok).post(`/api/workers/${wid}/request-training`, { course_type:'育儿嫂' }) },
      { label:'W05-权限-customer→403', module:'workers', category:'权限校验', method:'POST',
        url:`/api/workers/${wid}/request-training`, body:{ course_type:'月嫂' },
        expect:{ status:403 },
        fn:()=>createClient(customerTok).post(`/api/workers/${wid}/request-training`, { course_type:'月嫂' }) },
      { label:'W05-边界-不存在的worker→404', module:'workers', category:'边界值', method:'POST',
        url:'/api/workers/nonexist-w99/request-training', body:{ course_type:'月嫂' },
        expect:{ status:404 },
        fn:()=>createClient(adminTok).post('/api/workers/nonexist-w99/request-training', { course_type:'月嫂' }) },
    ]));
  }

  // ════════════════════════════════════
  // W06 | workers/:id/share 分享阿姨简历
  // 权限：内部6角色 | 阿姨自己
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('W06 🔗 分享简历', [
      { label:'W06-权限-无token→401', module:'workers', category:'权限校验', method:'GET',
        url:`/api/workers/${wid}/share`, expect:{ status:401 },
        fn:()=>createClient().get(`/api/workers/${wid}/share`) },
      { label:'W06-正向-admin分享简历', module:'workers', category:'正向功能', method:'GET',
        url:`/api/workers/${wid}/share`, expect:{ status:200 },
        fn:()=>createClient(adminTok).get(`/api/workers/${wid}/share`) },
      { label:'W06-正向-agent分享简历', module:'workers', category:'正向功能', method:'GET',
        url:`/api/workers/${wid}/share`, expect:{ status:200 },
        fn:()=>createClient(agentTok).get(`/api/workers/${wid}/share`) },
      { label:'W06-正向-worker分享自己', module:'workers', category:'正向功能', method:'GET',
        url:`/api/workers/${wid}/share`, expect:{ status:200 },
        fn:()=>createClient(workerTok).get(`/api/workers/${wid}/share`) },
      { label:'W06-权限-customer→403', module:'workers', category:'权限校验', method:'GET',
        url:`/api/workers/${wid}/share`, expect:{ status:403 },
        fn:()=>createClient(customerTok).get(`/api/workers/${wid}/share`) },
    ]));
  }

  // ════════════════════════════════════
  // W07 | workers/:id/work-experience 工作经历
  // 权限：内部6角色可读写 | 阿姨对自己可读写
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('W07 💼 工作经历', [
      { label:'W07-公开-无token→200', module:'workers', category:'权限校验', method:'GET',
        url:`/api/workers/${wid}/work-experience`, expect:{ status:200 },
        fn:()=>createClient().get(`/api/workers/${wid}/work-experience`) },
      { label:'W07-正向-admin查看经历', module:'workers', category:'正向功能', method:'GET',
        url:`/api/workers/${wid}/work-experience`, expect:{ status:200 },
        fn:()=>adminCli.get(`/api/workers/${wid}/work-experience`) },
      { label:'W07-正向-worker查看自己', module:'workers', category:'正向功能', method:'GET',
        url:`/api/workers/${wid}/work-experience`, expect:{ status:200 },
        fn:()=>createClient(workerTok).get(`/api/workers/${wid}/work-experience`) },
      { label:'W07-公开-customer→200', module:'workers', category:'权限校验', method:'GET',
        url:`/api/workers/${wid}/work-experience`, expect:{ status:200 },
        fn:()=>createClient(customerTok).get(`/api/workers/${wid}/work-experience`) },
      { label:'W07-正向-admin添加工作经历', module:'workers', category:'正向功能', method:'POST',
        url:`/api/workers/${wid}/work-experience`,
        body:{ period:'2025-01至2025-12', employer:'测试雇主', job_type:'月嫂', description:'测试' },
        expect:{ status:200 },
        fn:()=>adminCli.post(`/api/workers/${wid}/work-experience`,
          { period:'2025-01至2025-12', employer:'测试雇主', job_type:'月嫂', description:'测试' }) },
    ]));
  }

  return results;
};

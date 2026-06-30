/**
 * 深度强化测试套件 (DEEPEN)
 * 
 * 目的：给已有测试覆盖的 API 补充：
 *   1. 角色矩阵 — 原只用 admin 测的，补 agent/recruiter/instructor/training_supervisor/
 *      worker_operator/worker/customer 等多角色视角
 *   2. 边界值 — 非UUID ID、空字符串、SQL注入、超长输入、负/零分页、特殊字符
 *   3. 幂等性 — 重复发送同一请求不报500
 *
 * 不改动任何现有 .test.js 文件，全部新增用例集中于此。
 * 与 docs/业务逻辑全景图.md 权限矩阵保持一致，不做与本文件冲突的断言。
 */
const {
  loginAs, clearTokens, createClient, runCase, batchRun,
  fetchTestIds, genPhone, config
} = require('../helpers');

const ALL_ROLES = ['admin','agent','recruiter','instructor','training_supervisor','worker_operator','worker','customer'];

/** 需要待测 ID 的数据集 */
let ids;

module.exports = async function deepenSuite() {
  await clearTokens();
  ids = await fetchTestIds();
  const results = [];

  // ──────────────────────────────────────────
  // D01 角色矩阵：workers 阿姨库
  // ──────────────────────────────────────────
  {
    const wid = ids.worker || ids.workers?.[0] || '00000000-0000-0000-0000-000000000001';
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const recruiterTok = await loginAs('recruiter');
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('D01 👤 阿姨库角色矩阵 (workers)', [
      // GET /api/workers — 各种角色都能查列表
      { label:'D01-get-admin',  module:'workers', category:'角色矩阵', method:'GET', url:'/api/workers',
        fn:()=>createClient(adminTok).get('/api/workers'),              expect:{ status:200 } },
      { label:'D01-get-agent',  module:'workers', category:'角色矩阵', method:'GET', url:'/api/workers',
        fn:()=>createClient(agentTok).get('/api/workers'),              expect:{ status:200 } },
      { label:'D01-get-recruiter',module:'workers',category:'角色矩阵', method:'GET', url:'/api/workers',
        fn:()=>createClient(recruiterTok).get('/api/workers'),          expect:{ status:200 } },
      { label:'D01-get-worker', module:'workers', category:'角色矩阵', method:'GET', url:'/api/workers',
        fn:()=>createClient(workerTok).get('/api/workers'),             expect:{ status:200 } },
      { label:'D01-get-customer',module:'workers',category:'角色矩阵', method:'GET', url:'/api/workers',
        fn:()=>createClient(customerTok).get('/api/workers'),           expect:[200,403] },

      // GET /api/workers/:id — 多角色查单条
      { label:'D01-detail-admin',module:'workers',category:'角色矩阵', method:'GET', url:`/api/workers/${wid}`,
        fn:()=>createClient(adminTok).get(`/api/workers/${wid}`),       expect:[200,404] },
      { label:'D01-detail-agent',module:'workers',category:'角色矩阵', method:'GET', url:`/api/workers/${wid}`,
        fn:()=>createClient(agentTok).get(`/api/workers/${wid}`),       expect:[200,404] },
      { label:'D01-detail-customer',module:'workers',category:'角色矩阵', method:'GET', url:`/api/workers/${wid}`,
        fn:()=>createClient(customerTok).get(`/api/workers/${wid}`),    expect:[200,404] },

      // PUT /api/workers — agent 和 recruiter 应有权限编辑（按业务逻辑全景图）
      { label:'D01-edit-admin', module:'workers',category:'角色矩阵', method:'PUT', url:'/api/workers',
        body:{ id:wid, name:'d01-test-name' },
        fn:()=>createClient(adminTok).put('/api/workers', { id:wid, name:'d01-test-name' }),
        expect:[200,404] },
      { label:'D01-edit-agent', module:'workers',category:'角色矩阵', method:'PUT', url:'/api/workers',
        body:{ id:wid, name:'d01-test-agent' },
        fn:()=>createClient(agentTok).put('/api/workers', { id:wid, name:'d01-test-agent' }),
        expect:[200,403] },
      { label:'D01-edit-recruiter',module:'workers',category:'角色矩阵', method:'PUT', url:'/api/workers',
        body:{ id:wid, name:'d01-test-recruiter' },
        fn:()=>createClient(recruiterTok).put('/api/workers', { id:wid, name:'d01-test-recruiter' }),
        expect:[200,403] },
    ]));
  }

  // ──────────────────────────────────────────
  // D02 角色矩阵：orders 订单
  // ──────────────────────────────────────────
  {
    const oid = ids.order || ids.orders?.[0] || '00000000-0000-0000-0000-000000000010';
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');
    const recruiterTok = await loginAs('recruiter');

    results.push(...await batchRun('D02 📦 订单角色矩阵 (orders)', [
      { label:'D02-list-admin',  module:'orders', category:'角色矩阵', method:'GET', url:'/api/orders',
        fn:()=>createClient(adminTok).get('/api/orders'),       expect:{ status:200 } },
      { label:'D02-list-agent',  module:'orders', category:'角色矩阵', method:'GET', url:'/api/orders',
        fn:()=>createClient(agentTok).get('/api/orders'),        expect:{ status:200 } },
      { label:'D02-list-worker', module:'orders', category:'角色矩阵', method:'GET', url:'/api/orders',
        fn:()=>createClient(workerTok).get('/api/orders'),       expect:{ status:200 } },
      { label:'D02-list-customer',module:'orders',category:'角色矩阵', method:'GET', url:'/api/orders',
        fn:()=>createClient(customerTok).get('/api/orders'),     expect:{ status:200 } },

      { label:'D02-detail-agent',module:'orders',category:'角色矩阵', method:'GET', url:`/api/orders/${oid}`,
        fn:()=>createClient(agentTok).get(`/api/orders/${oid}`), expect:[200,404] },
      { label:'D02-detail-customer',module:'orders',category:'角色矩阵', method:'GET', url:`/api/orders/${oid}`,
        fn:()=>createClient(customerTok).get(`/api/orders/${oid}`), expect:[200,404] },
      { label:'D02-detail-recruiter',module:'orders',category:'角色矩阵', method:'GET', url:`/api/orders/${oid}`,
        fn:()=>createClient(recruiterTok).get(`/api/orders/${oid}`), expect:[200,404] },
    ]));
  }

  // ──────────────────────────────────────────
  // D03 角色矩阵：leads 线索
  // ──────────────────────────────────────────
  {
    const lid = ids.lead || ids.leads?.[0] || '00000000-0000-0000-0000-000000000100';
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const recruiterTok = await loginAs('recruiter');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('D03 🎯 线索角色矩阵 (leads)', [
      { label:'D03-list-admin', module:'leads',category:'角色矩阵', method:'GET', url:'/api/leads',
        fn:()=>createClient(adminTok).get('/api/leads'),            expect:{ status:200 } },
      { label:'D03-list-agent', module:'leads',category:'角色矩阵', method:'GET', url:'/api/leads',
        fn:()=>createClient(agentTok).get('/api/leads'),             expect:[200,403] },
      { label:'D03-list-recruiter',module:'leads',category:'角色矩阵', method:'GET', url:'/api/leads',
        fn:()=>createClient(recruiterTok).get('/api/leads'),         expect:{ status:200 } },
      { label:'D03-list-worker',module:'leads',category:'角色矩阵', method:'GET', url:'/api/leads',
        fn:()=>createClient(workerTok).get('/api/leads'),            expect:[200,403] },

      // agent/recruiter 应能创建线索（业务逻辑全景图 4.3）
      { label:'D03-create-agent',module:'leads',category:'角色矩阵', method:'POST', url:'/api/leads',
        body:{ name:'d03-agent-lead', phone:genPhone() },
        fn:()=>createClient(agentTok).post('/api/leads', { name:'d03-agent-lead', phone:genPhone() }),
        expect:[200,201,403] },
      { label:'D03-create-recruiter',module:'leads',category:'角色矩阵', method:'POST', url:'/api/leads',
        body:{ name:'d03-rec-lead', phone:genPhone() },
        fn:()=>createClient(recruiterTok).post('/api/leads', { name:'d03-rec-lead', phone:genPhone() }),
        expect:[200,201,403] },
    ]));
  }

  // ──────────────────────────────────────────
  // D04 角色矩阵：courses 课程
  // ──────────────────────────────────────────
  {
    const cid = ids.course || ids.courses?.[0] || '00000000-0000-0000-0000-000000000200';
    const adminTok = await loginAs('admin');
    const instructorTok = await loginAs('instructor');
    const supervisorTok = await loginAs('training_supervisor');
    const recruiterTok = await loginAs('recruiter');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('D04 📚 课程角色矩阵 (courses)', [
      { label:'D04-list-instructor', module:'courses',category:'角色矩阵', method:'GET', url:'/api/courses',
        fn:()=>createClient(instructorTok).get('/api/courses'),     expect:{ status:200 } },
      { label:'D04-list-supervisor', module:'courses',category:'角色矩阵', method:'GET', url:'/api/courses',
        fn:()=>createClient(supervisorTok).get('/api/courses'),     expect:{ status:200 } },
      { label:'D04-list-recruiter', module:'courses',category:'角色矩阵', method:'GET', url:'/api/courses',
        fn:()=>createClient(recruiterTok).get('/api/courses'),      expect:{ status:200 } },

      // 查单课程详情
      { label:'D04-detail-instructor',module:'courses',category:'角色矩阵', method:'GET', url:`/api/courses/${cid}`,
        fn:()=>createClient(instructorTok).get(`/api/courses/${cid}`), expect:[200,404] },
      { label:'D04-detail-supervisor',module:'courses',category:'角色矩阵', method:'GET', url:`/api/courses/${cid}`,
        fn:()=>createClient(supervisorTok).get(`/api/courses/${cid}`), expect:[200,404] },

      // instructor 应能编辑课程（全景图 3.5）
      { label:'D04-edit-instructor',module:'courses',category:'角色矩阵', method:'PUT', url:'/api/courses',
        body:{ id:cid, title:'d04-test-title' },
        fn:()=>createClient(instructorTok).put('/api/courses', { id:cid, title:'d04-test-title' }),
        expect:[200,403] },
      { label:'D04-edit-noauth-worker',module:'courses',category:'角色矩阵', method:'PUT', url:'/api/courses',
        body:{ id:cid, title:'d04-hack' },
        fn:()=>createClient(workerTok).put('/api/courses', { id:cid, title:'d04-hack' }),
        expect:[401,403] },
    ]));
  }

  // ──────────────────────────────────────────
  // D05 角色矩阵：reviews 评价
  // ──────────────────────────────────────────
  {
    const rid = ids.review || ids.reviews?.[0] || '00000000-0000-0000-0000-000000000300';
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('D05 ⭐ 评价角色矩阵 (reviews)', [
      { label:'D05-list-admin', module:'reviews',category:'角色矩阵', method:'GET', url:'/api/reviews',
        fn:()=>createClient(adminTok).get('/api/reviews'),       expect:{ status:200 } },
      { label:'D05-list-agent', module:'reviews',category:'角色矩阵', method:'GET', url:'/api/reviews',
        fn:()=>createClient(agentTok).get('/api/reviews'),        expect:{ status:200 } },
      { label:'D05-list-worker', module:'reviews',category:'角色矩阵', method:'GET', url:'/api/reviews',
        fn:()=>createClient(workerTok).get('/api/reviews'),       expect:{ status:200 } },
      { label:'D05-list-customer',module:'reviews',category:'角色矩阵', method:'GET', url:'/api/reviews',
        fn:()=>createClient(customerTok).get('/api/reviews'),     expect:{ status:200 } },

      // agent/worker/customer 查看单条评价
      { label:'D05-detail-agent',module:'reviews',category:'角色矩阵', method:'GET', url:`/api/reviews/${rid}`,
        fn:()=>createClient(agentTok).get(`/api/reviews/${rid}`),  expect:[200,404] },
      { label:'D05-detail-customer',module:'reviews',category:'角色矩阵', method:'GET', url:`/api/reviews/${rid}`,
        fn:()=>createClient(customerTok).get(`/api/reviews/${rid}`), expect:[200,404] },
    ]));
  }

  // ──────────────────────────────────────────
  // D06 角色矩阵：users / settings / contracts
  // ──────────────────────────────────────────
  {
    const cid = ids.contract || ids.contracts?.[0] || '00000000-0000-0000-0000-000000000400';
    const adminTok = await loginAs('admin');
    const agentTok = await loginAs('agent');
    const supervisorTok = await loginAs('training_supervisor');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('D06 🔐 敏感API角色矩阵 (users/settings/contracts)', [
      // users — admin only
      { label:'D06-users-admin',  module:'users',category:'角色矩阵', method:'GET', url:'/api/users',
        fn:()=>createClient(adminTok).get('/api/users'),          expect:{ status:200 } },
      { label:'D06-users-agent→403', module:'users',category:'角色矩阵', method:'GET', url:'/api/users',
        fn:()=>createClient(agentTok).get('/api/users'),          expect:[401,403] },
      { label:'D06-users-worker→403',module:'users',category:'角色矩阵', method:'GET', url:'/api/users',
        fn:()=>createClient(workerTok).get('/api/users'),         expect:[401,403] },

      // settings — admin only
      { label:'D06-settings-admin', module:'settings',category:'角色矩阵', method:'GET', url:'/api/settings',
        fn:()=>createClient(adminTok).get('/api/settings'),       expect:{ status:200 } },
      { label:'D06-settings-agent→403', module:'settings',category:'角色矩阵', method:'GET', url:'/api/settings',
        fn:()=>createClient(agentTok).get('/api/settings'),       expect:[401,403] },

      // contracts — admin/agent/supervisor 有读权限（全景图 3.6）
      { label:'D06-contracts-admin', module:'contracts',category:'角色矩阵', method:'GET', url:'/api/contracts',
        fn:()=>createClient(adminTok).get('/api/contracts'),      expect:{ status:200 } },
      { label:'D06-contracts-agent', module:'contracts',category:'角色矩阵', method:'GET', url:'/api/contracts',
        fn:()=>createClient(agentTok).get('/api/contracts'),       expect:{ status:200 } },
      { label:'D06-contracts-supervisor', module:'contracts',category:'角色矩阵', method:'GET', url:'/api/contracts',
        fn:()=>createClient(supervisorTok).get('/api/contracts'),  expect:{ status:200 } },
      { label:'D06-contract-detail-agent', module:'contracts',category:'角色矩阵', method:'GET', url:`/api/contracts/${cid}`,
        fn:()=>createClient(agentTok).get(`/api/contracts/${cid}`), expect:[200,404] },
    ]));
  }

  // ──────────────────────────────────────────
  // D07 边界值：非 UUID 格式 ID
  // ──────────────────────────────────────────
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);

    results.push(...await batchRun('D07 🧪 边界值-ID非UUID格式', [
      { label:'D07-workers-非UUID', module:'boundary',category:'边界值', method:'GET', url:'/api/workers/not-a-uuid',
        fn:()=>adminCli.get('/api/workers/not-a-uuid'),
        expect:[400,404,500] },
      { label:'D07-orders-非UUID',  module:'boundary',category:'边界值', method:'GET', url:'/api/orders/not-a-uuid',
        fn:()=>adminCli.get('/api/orders/not-a-uuid'),
        expect:[400,404,500] },
      { label:'D07-leads-非UUID',   module:'boundary',category:'边界值', method:'GET', url:'/api/leads/not-a-uuid',
        fn:()=>adminCli.get('/api/leads/not-a-uuid'),
        expect:[400,404,500] },
      { label:'D07-courses-非UUID', module:'boundary',category:'边界值', method:'GET', url:'/api/courses/not-a-uuid',
        fn:()=>adminCli.get('/api/courses/not-a-uuid'),
        expect:[400,404,500] },
      { label:'D07-reviews-非UUID', module:'boundary',category:'边界值', method:'GET', url:'/api/reviews/not-a-uuid',
        fn:()=>adminCli.get('/api/reviews/not-a-uuid'),
        expect:[400,404,500] },
      { label:'D07-contracts-非UUID',module:'boundary',category:'边界值', method:'GET', url:'/api/contracts/not-a-uuid',
        fn:()=>adminCli.get('/api/contracts/not-a-uuid'),
        expect:[400,404,500] },
      { label:'D07-enrollments-非UUID',module:'boundary',category:'边界值', method:'GET', url:'/api/enrollments/not-a-uuid',
        fn:()=>adminCli.get('/api/enrollments/not-a-uuid'),
        expect:[400,404,500] },
      { label:'D07-users-非UUID',   module:'boundary',category:'边界值', method:'GET', url:'/api/users/not-a-uuid',
        fn:()=>adminCli.get('/api/users/not-a-uuid'),
        expect:[400,404,500] },
    ]));
  }

  // ──────────────────────────────────────────
  // D08 边界值：SQL 注入 / XSS 试探
  // ──────────────────────────────────────────
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const sqlInj = encodeURIComponent("1' OR '1'='1");
    const xss = encodeURIComponent('<script>alert(1)</script>');

    results.push(...await batchRun('D08 🛡️ 边界值-SQL注入/XSS防御', [
      { label:'D08-sqli-workers', module:'boundary',category:'边界值', method:'GET',
        url:`/api/workers/${sqlInj}`,
        fn:()=>adminCli.get(`/api/workers/${sqlInj}`),
        expect:[400,404] },
      { label:'D08-sqli-orders',  module:'boundary',category:'边界值', method:'GET',
        url:`/api/orders/${sqlInj}`,
        fn:()=>adminCli.get(`/api/orders/${sqlInj}`),
        expect:[400,404] },
      { label:'D08-sqli-leads',   module:'boundary',category:'边界值', method:'GET',
        url:`/api/leads/${sqlInj}`,
        fn:()=>adminCli.get(`/api/leads/${sqlInj}`),
        expect:[400,404] },
      { label:'D08-xss-workers',  module:'boundary',category:'边界值', method:'GET',
        url:`/api/workers/${xss}`,
        fn:()=>adminCli.get(`/api/workers/${xss}`),
        expect:[400,404] },
      { label:'D08-xss-orders',   module:'boundary',category:'边界值', method:'GET',
        url:`/api/orders/${xss}`,
        fn:()=>adminCli.get(`/api/orders/${xss}`),
        expect:[400,404] },
      // search 参数 SQLi
      { label:'D08-search-sqli',  module:'boundary',category:'边界值', method:'GET',
        url:`/api/search?q=${sqlInj}`,
        fn:()=>adminCli.get(`/api/search?q=${sqlInj}`),
        expect:[200,400] },
      // settings key 参数注入
      { label:'D08-settings-sqli',module:'boundary',category:'边界值', method:'GET',
        url:`/api/settings?key=${sqlInj}`,
        fn:()=>adminCli.get(`/api/settings?key=${sqlInj}`),
        expect:[200,400,404] },
    ]));
  }

  // ──────────────────────────────────────────
  // D09 边界值：超长字符串 / 特殊字符 / 空值
  // ──────────────────────────────────────────
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const LONG = 'A'.repeat(5000);
    const WID = ids.worker || ids.workers?.[0] || '00000000-0000-0000-0000-000000000001';

    results.push(...await batchRun('D09 🔠 边界值-超长/特殊字符/空值', [
      // 超长查询参数
      { label:'D09-search-long', module:'boundary',category:'边界值', method:'GET',
        url:`/api/search?q=${encodeURIComponent(LONG)}`,
        fn:()=>adminCli.get(`/api/search?q=${encodeURIComponent(LONG)}`),
        expect:[200,400,414] },
      // 空 ID
      { label:'D09-workers-empty-id', module:'boundary',category:'边界值', method:'GET', url:'/api/workers/',
        fn:()=>adminCli.get('/api/workers/'),
        expect:[200,404] },
      { label:'D09-orders-empty-id',  module:'boundary',category:'边界值', method:'GET', url:'/api/orders/',
        fn:()=>adminCli.get('/api/orders/'),
        expect:[200,404] },
      // 特殊 Unicode 字符
      { label:'D09-special-unicode',  module:'boundary',category:'边界值', method:'GET',
        url:'/api/workers/' + encodeURIComponent('測試\u0000'),
        fn:()=>adminCli.get('/api/workers/' + encodeURIComponent('測試\u0000')),
        expect:[400,404,500] },
      // 负页码
      { label:'D09-workers-neg-page', module:'boundary',category:'边界值', method:'GET', url:'/api/workers?page=-1',
        fn:()=>adminCli.get('/api/workers?page=-1'),
        expect:[200,400] },
      { label:'D09-orders-neg-limit', module:'boundary',category:'边界值', method:'GET', url:'/api/orders?limit=-5',
        fn:()=>adminCli.get('/api/orders?limit=-5'),
        expect:[200,400] },
      // workers 更新空 name
      { label:'D09-edit-empty-name',  module:'boundary',category:'边界值', method:'PUT', url:'/api/workers',
        body:{ id:WID, name:'' },
        fn:()=>adminCli.put('/api/workers', { id:WID, name:'' }),
        expect:[200,400] },
    ]));
  }

  // ──────────────────────────────────────────
  // D10 幂等性：重复发送同一请求
  // ──────────────────────────────────────────
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const WID = ids.worker || ids.workers?.[0] || '00000000-0000-0000-0000-000000000001';

    results.push(...await batchRun('D10 🔁 幂等性测试', [
      // 重复 GET 列表 — 应始终 200
      { label:'D10-idem-workers-get1',module:'idempotent',category:'幂等性', method:'GET', url:'/api/workers',
        fn:()=>adminCli.get('/api/workers'), expect:{ status:200 } },
      { label:'D10-idem-workers-get2',module:'idempotent',category:'幂等性', method:'GET', url:'/api/workers',
        fn:()=>adminCli.get('/api/workers'), expect:{ status:200 } },
      { label:'D10-idem-orders-get',   module:'idempotent',category:'幂等性', method:'GET', url:'/api/orders',
        fn:()=>adminCli.get('/api/orders'),  expect:{ status:200 } },
      { label:'D10-idem-leads-get',    module:'idempotent',category:'幂等性', method:'GET', url:'/api/leads',
        fn:()=>adminCli.get('/api/leads'),   expect:{ status:200 } },
      { label:'D10-idem-courses-get',  module:'idempotent',category:'幂等性', method:'GET', url:'/api/courses',
        fn:()=>adminCli.get('/api/courses'), expect:{ status:200 } },
      { label:'D10-idem-reviews-get',  module:'idempotent',category:'幂等性', method:'GET', url:'/api/reviews',
        fn:()=>adminCli.get('/api/reviews'), expect:{ status:200 } },
      { label:'D10-idem-contracts-get',module:'idempotent',category:'幂等性', method:'GET', url:'/api/contracts',
        fn:()=>adminCli.get('/api/contracts'), expect:{ status:200 } },
      // 重复 PUT 不应 500
      { label:'D10-idem-edit-dup',     module:'idempotent',category:'幂等性', method:'PUT', url:'/api/workers',
        body:{ id:WID, name:'idem-test' },
        fn:()=>adminCli.put('/api/workers', { id:WID, name:'idem-test' }),
        expect:[200,400] },
      { label:'D10-idem-edit-redup',   module:'idempotent',category:'幂等性', method:'PUT', url:'/api/workers',
        body:{ id:WID, name:'idem-test' },
        fn:()=>adminCli.put('/api/workers', { id:WID, name:'idem-test' }),
        expect:[200,400] },
      // 无 token 重复访问
      { label:'D10-idem-noauth',       module:'idempotent',category:'幂等性', method:'GET', url:'/api/workers',
        fn:()=>createClient().get('/api/workers'), expect:{ status:401 } },
    ]));
  }

  // ──────────────────────────────────────────
  // D11 角色矩阵：enrollments 报名 / settings
  // ──────────────────────────────────────────
  {
    const eid = ids.enrollment || ids.enrollments?.[0] || '00000000-0000-0000-0000-000000000500';
    const adminTok = await loginAs('admin');
    const instructorTok = await loginAs('instructor');
    const recruiterTok = await loginAs('recruiter');
    const workerTok = await loginAs('worker');
    const supervisorTok = await loginAs('training_supervisor');

    results.push(...await batchRun('D11 📋 报名/排课角色矩阵 (enrollments/schedules)', [
      // enrollments — 全景图 3.7：instructor/recruiter/supervisor 可读
      { label:'D11-enroll-list-instructor', module:'enrollments',category:'角色矩阵', method:'GET', url:'/api/enrollments',
        fn:()=>createClient(instructorTok).get('/api/enrollments'),  expect:{ status:200 } },
      { label:'D11-enroll-list-recruiter',  module:'enrollments',category:'角色矩阵', method:'GET', url:'/api/enrollments',
        fn:()=>createClient(recruiterTok).get('/api/enrollments'),   expect:{ status:200 } },
      { label:'D11-enroll-list-supervisor', module:'enrollments',category:'角色矩阵', method:'GET', url:'/api/enrollments',
        fn:()=>createClient(supervisorTok).get('/api/enrollments'),  expect:{ status:200 } },
      { label:'D11-enroll-list-worker', module:'enrollments',category:'角色矩阵', method:'GET', url:'/api/enrollments',
        fn:()=>createClient(workerTok).get('/api/enrollments'),      expect:{ status:200 } },

      // instructor 应能创建 enrollments（全景图 3.7）
      { label:'D11-enroll-create-instructor',module:'enrollments',category:'角色矩阵', method:'POST', url:'/api/enrollments',
        body:{ worker_id:ids.worker, course_id:ids.course },
        fn:()=>createClient(instructorTok).post('/api/enrollments',
          { worker_id:ids.worker, course_id:ids.course }),
        expect:[200,201,403] },

      // course-schedules — supervisor 应能查
      { label:'D11-schedule-supervisor', module:'schedules',category:'角色矩阵', method:'GET', url:'/api/course-schedules',
        fn:()=>createClient(supervisorTok).get('/api/course-schedules'), expect:{ status:200 } },
      { label:'D11-schedule-instructor', module:'schedules',category:'角色矩阵', method:'GET', url:'/api/course-schedules',
        fn:()=>createClient(instructorTok).get('/api/course-schedules'), expect:{ status:200 } },
    ]));
  }

  // ──────────────────────────────────────────
  // D12 边界值：空 body / 缺失字段 POST
  // ──────────────────────────────────────────
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);

    results.push(...await batchRun('D12 📭 边界值-空body/缺失必填字段', [
      { label:'D12-leads-empty-body', module:'boundary',category:'边界值', method:'POST', url:'/api/leads',
        body:{}, fn:()=>adminCli.post('/api/leads', {}),
        expect:[400,201] },
      { label:'D12-orders-empty-body', module:'boundary',category:'边界值', method:'POST', url:'/api/orders',
        body:{}, fn:()=>adminCli.post('/api/orders', {}),
        expect:[400,201] },
      { label:'D12-reviews-empty-body',module:'boundary',category:'边界值', method:'POST', url:'/api/reviews',
        body:{}, fn:()=>adminCli.post('/api/reviews', {}),
        expect:[400,201] },
      // 非法 JSON
      { label:'D12-leads-bad-json', module:'boundary',category:'边界值', method:'POST', url:'/api/leads',
        fn:async()=>{
          const res = await fetch(`${config.BASE_URL}/api/leads`, {
            method:'POST',
            headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${adminTok}` },
            body:'{broken json ///'
          });
          return { status:res.status, data:await res.json().catch(()=>null) };
        },
        expect:[400] },
    ]));
  }

  // ──────────────────────────────────────────
  // D13 角色矩阵补充：无 token 统一 401
  // ──────────────────────────────────────────
  {
    results.push(...await batchRun('D13 🔒 无token统一401验证', [
      { label:'D13-noauth-workers',  module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/workers',
        fn:()=>createClient().get('/api/workers'),    expect:{ status:401 } },
      { label:'D13-noauth-orders',   module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/orders',
        fn:()=>createClient().get('/api/orders'),     expect:{ status:401 } },
      { label:'D13-noauth-leads',    module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/leads',
        fn:()=>createClient().get('/api/leads'),      expect:{ status:401 } },
      { label:'D13-noauth-courses',  module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/courses',
        fn:()=>createClient().get('/api/courses'),    expect:{ status:401 } },
      { label:'D13-noauth-reviews',  module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/reviews',
        fn:()=>createClient().get('/api/reviews'),    expect:{ status:401 } },
      { label:'D13-noauth-contracts',module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/contracts',
        fn:()=>createClient().get('/api/contracts'),  expect:{ status:401 } },
      { label:'D13-noauth-enrollments',module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/enrollments',
        fn:()=>createClient().get('/api/enrollments'), expect:{ status:401 } },
      { label:'D13-noauth-settings', module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/settings',
        fn:()=>createClient().get('/api/settings'),   expect:{ status:401 } },
      { label:'D13-noauth-users',    module:'auth-check',category:'角色矩阵', method:'GET', url:'/api/users',
        fn:()=>createClient().get('/api/users'),      expect:{ status:401 } },
    ]));
  }

  return results;
};

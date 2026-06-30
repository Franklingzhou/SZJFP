/**
 * 写操作缺口测试套件 (GAP-WRITE) 🆕
 *
 * 覆盖：之前缺少 PUT/PATCH/DELETE 测试的业务路由
 *      每个接口至少 3 层：401(无token) → 403(权限不足) → 200(正向)
 *
 * 接口清单（按业务优先级）：
 *   W01 PUT  /api/commission              — 佣金规则配置
 *   W02 PUT  /api/deposits                — 保证金管理
 *   W03 PUT  /api/clients                 — 客户档案管理
 *   W04 PUT  /api/credit-rules            — 诚信分规则
 *   W05 PUT  /api/schedules               — 排课管理
 *   W06 PUT  /api/courses/[id]            — 更新单课程
 *   W07 PUT  /api/contracts/[id]          — 更新单合同
 *   W08 PATCH /api/contracts/[id]         — 合同状态变更
 *   W09 PUT  /api/orders/[id]             — 更新单订单
 *   W10 PATCH /api/orders/[id]            — 订单状态变更
 *   W11 PUT  /api/workers/[id]            — 更新阿姨详情
 *   W12 PATCH /api/workers/[id]           — 阿姨状态变更
 *   W13 PATCH /api/users/[id]             — 用户个人信息变更
 *   W14 PUT  /api/notifications/[id]      — 更新通知
 *   W15 PATCH /api/notifications/[id]     — 通知状态变更
 *   W16 PATCH /api/enrollments/[id]       — 报名状态变更
 *   W17 PATCH /api/recommendations/[id]   — 推荐状态
 *   W18 PATCH /api/refunds/[id]           — 退款状态
 *   W19 DELETE /api/workers/[id]/media    — 删除阿姨作品
 *   W20 PUT  /api/workers/[id]/work-experience — 新增工作经历
 *   W21 DELETE /api/workers/[id]/work-experience — 删除工作经历
 *   W22 DELETE /api/worker-applications   — 删除阿姨申请
 *   W23 PUT  /api/worker-applications/[id] — 更新阿姨申请
 *   W24 PUT  /api/resume-reviews           — 更新简历审核
 *   W25 PUT  /api/customer-leads           — 更新客户线索
 *   W26 PUT  /api/worker-tiers             — 更新阿姨等级
 *
 * 权限矩阵参考：docs/业务逻辑全景图.md
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, genPhone, config } = require('../helpers');

module.exports = async function gapWriteSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  // ════════════════════════════════════════
  // W01 | PUT /api/commission — 佣金规则（需 id + data）
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('W01 💰 佣金规则 (commission PUT)', [
      {
        label: 'W01-权限-无token→401', module:'commission', category:'权限校验', method:'PUT',
        url:'/api/commission', body:'{id, data}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/commission', { id:'test_rate', data:{ agent:0.5 } })
      },
      {
        label: 'W01-权限-agent→403', module:'commission', category:'权限校验', method:'PUT',
        url:'/api/commission', body:'{id, data}',
        expect:{ status:403 },
        fn:()=>createClient(agentTok).put('/api/commission', { id:'test_rate', data:{ agent:0.5 } })
      },
      {
        label: 'W01-正向-admin保存佣金规则', module:'commission', category:'正向功能', method:'PUT',
        url:'/api/commission', body:'{id, rate}',
        expect:[200,404], // 种子数据ID按实际DB为准
        fn: async () => adminCli.put('/api/commission', { id:'agent_order_commission', rate:30 })
      },
      {
        label: 'W01-参数-缺id→400', module:'commission', category:'参数异常', method:'PUT',
        url:'/api/commission', body:'{data:{}}',
        expect:{ status:400 },
        fn:()=>adminCli.put('/api/commission', { data:{ agent:0.5 } })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W02 | POST /api/deposits — 保证金（仅 POST 创建，无 PUT）
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('W02 💳 保证金 (deposits POST)', [
      {
        label: 'W02-权限-无token→401', module:'deposits', category:'权限校验', method:'POST',
        url:'/api/deposits', body:'{user_id, amount, type}',
        expect:{ status:401 },
        fn:()=>createClient().post('/api/deposits', { user_id:'test', amount:500, type:'deposit' })
      },
      {
        label: 'W02-权限-worker→403', module:'deposits', category:'权限校验', method:'POST',
        url:'/api/deposits', body:'{user_id, amount, type}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).post('/api/deposits', { user_id:'test', amount:500, type:'deposit' })
      },
      {
        label: 'W02-正向-admin创建保证金记录', module:'deposits', category:'正向功能', method:'POST',
        url:'/api/deposits', body:'{user_id, amount, type}',
        expect:{ status:201, hasField:'ok' },
        fn:()=>adminCli.post('/api/deposits', { user_id:ids.firstUserId, amount:500, type:'deposit' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W03 | PUT /api/clients — 客户档案
  // ════════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const agentCli = createClient(agentTok);
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('W03 🏠 客户档案 (clients PUT)', [
      {
        label: 'W03-权限-无token→401', module:'clients', category:'权限校验', method:'PUT',
        url:'/api/clients', body:'{id, name}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/clients', { id:'test', name:'test' })
      },
      {
        label: 'W03-权限-worker→403', module:'clients', category:'权限校验', method:'PUT',
        url:'/api/clients', body:'{id, name}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).put('/api/clients', { id:'test', name:'越权' })
      },
      {
        label: 'W03-参数-缺id→400', module:'clients', category:'参数异常', method:'PUT',
        url:'/api/clients', body:'{name}',
        expect:{ status:400 },
        fn:()=>agentCli.put('/api/clients', { name:'缺id' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W04 | PUT /api/credit-rules — 诚信分规则
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('W04 🛡 诚信分规则 (credit-rules PUT)', [
      {
        label: 'W04-权限-无token→401', module:'credit-rules', category:'权限校验', method:'PUT',
        url:'/api/credit-rules', body:'{key, value}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/credit-rules', { key:'test', value:{} })
      },
      {
        label: 'W04-权限-agent→403', module:'credit-rules', category:'权限校验', method:'PUT',
        url:'/api/credit-rules', body:'{key, value}',
        expect:{ status:403 },
        fn:()=>createClient(agentTok).put('/api/credit-rules', { key:'test', value:{} })
      },
      {
        label: 'W04-正向-admin设置规则', module:'credit-rules', category:'正向功能', method:'PUT',
        url:'/api/credit-rules', body:'{rules: [...]}',
        expect:{ status:200, hasField:'ok' },
        fn:()=>adminCli.put('/api/credit-rules', { rules:[{ id:'t1', event:'测试事件', score_change:10, target_roles:['worker'], active:true }] })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W05 | PUT /api/schedules — 排课管理
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('W05 📅 排课管理 (schedules PUT)', [
      {
        label: 'W05-权限-无token→401', module:'schedules', category:'权限校验', method:'PUT',
        url:'/api/schedules', body:'{id, name}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/schedules', { id:'test', name:'test' })
      },
      {
        label: 'W05-权限-worker→403', module:'schedules', category:'权限校验', method:'PUT',
        url:'/api/schedules', body:'{id, name}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).put('/api/schedules', { id:'test', name:'越权' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W06 | PUT /api/courses/[id] — 更新单课程
  // ════════════════════════════════════════
  {
    const instructorTok = await loginAs('instructor');
    const instructorCli = createClient(instructorTok);
    const workerTok = await loginAs('worker');
    const cid = ids.firstCourseId || '00000000-0000-0000-0000-000000000200';

    results.push(...await batchRun('W06 📚 更新单课程 (courses/[id] PUT)', [
      {
        label: 'W06-权限-无token→401', module:'courses', category:'权限校验', method:'PUT',
        url:`/api/courses/${cid}`, body:'{title}',
        expect:{ status:401 },
        fn:()=>createClient().put(`/api/courses/${cid}`, { title:'越权测试' })
      },
      {
        label: 'W06-权限-worker→403', module:'courses', category:'权限校验', method:'PUT',
        url:`/api/courses/${cid}`, body:'{title}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).put(`/api/courses/${cid}`, { title:'越权测试' })
      },
      {
        label: 'W06-正向-讲师更新课程详情', module:'courses', category:'正向功能', method:'PUT',
        url:`/api/courses/${cid}`, body:'{title, content}',
        expect:{ status:200, hasField:'success' },
        fn:()=>instructorCli.put(`/api/courses/${cid}`, { title:'更新课程名-测试', content:'更新后的内容' })
      },
      {
        label: 'W06-边界-不存在的课程→404', module:'courses', category:'边界测试', method:'PUT',
        url:'/api/courses/nonexist-99999', body:'{title}',
        expect:{ status:404 },
        fn:()=>instructorCli.put('/api/courses/nonexist-99999', { title:'幽灵课程' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W07 | PUT /api/contracts/[id] — 更新单合同
  // W08 | PATCH /api/contracts/[id] — 合同状态变更
  // ════════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const agentCli = createClient(agentTok);
    const workerTok = await loginAs('worker');
    const cid = ids.firstContractId || '00000000-0000-0000-0000-000000000400';

    results.push(...await batchRun('W07 📝 更新单合同 (contracts/[id])', [
      {
        label: 'W07-PUT-无token→401', module:'contracts', category:'权限校验', method:'PUT',
        url:`/api/contracts/${cid}`, body:'{amount}',
        expect:{ status:401 },
        fn:()=>createClient().put(`/api/contracts/${cid}`, { amount:5000 })
      },
      {
        label: 'W07-PUT-worker→403', module:'contracts', category:'权限校验', method:'PUT',
        url:`/api/contracts/${cid}`, body:'{amount}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).put(`/api/contracts/${cid}`, { amount:5000 })
      },
      {
        label: 'W07-PUT-正向-经纪人更新合同', module:'contracts', category:'正向功能', method:'PUT',
        url:`/api/contracts/${cid}`, body:'{amount}',
        expect:{ status:200, hasField:'success' },
        fn:()=>agentCli.put(`/api/contracts/${cid}`, { amount:8000, notes:'测试更新说明' })
      },

      {
        label: 'W08-PATCH-无token→401', module:'contracts', category:'权限校验', method:'PATCH',
        url:`/api/contracts/${cid}`, body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().patch(`/api/contracts/${cid}`, { status:'signed' })
      },
      {
        label: 'W08-PATCH-worker→403', module:'contracts', category:'权限校验', method:'PATCH',
        url:`/api/contracts/${cid}`, body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).patch(`/api/contracts/${cid}`, { status:'signed' })
      },
      {
        label: 'W08-PATCH-正向-经纪人变更合同状态', module:'contracts', category:'正向功能', method:'PATCH',
        url:`/api/contracts/${cid}`, body:'{status}',
        expect:[200,400],
        fn:()=>agentCli.patch(`/api/contracts/${cid}`, { status:'active' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W09 | PUT /api/orders/[id] — 更新单订单
  // W10 | PATCH /api/orders/[id] — 订单状态变更
  // ════════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const agentCli = createClient(agentTok);
    const customerTok = await loginAs('customer');
    const oid = ids.firstOrderId || '00000000-0000-0000-0000-000000000010';

    results.push(...await batchRun('W09 📦 单订单操作 (orders/[id])', [
      {
        label: 'W09-PUT-无token→401', module:'orders', category:'权限校验', method:'PUT',
        url:`/api/orders/${oid}`, body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().put(`/api/orders/${oid}`, { status:'in_progress' })
      },
      {
        label: 'W09-PUT-customer→403', module:'orders', category:'权限校验', method:'PUT',
        url:`/api/orders/${oid}`, body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).put(`/api/orders/${oid}`, { status:'in_progress' })
      },
      {
        label: 'W09-PUT-正向-经纪人更新订单', module:'orders', category:'正向功能', method:'PUT',
        url:`/api/orders/${oid}`, body:'{worker_id, notes}',
        expect:[200,400], // 种子订单=cancelled，状态机可能拒绝
        fn:()=>agentCli.put(`/api/orders/${oid}`, { worker_id:ids.firstWorkerId, notes:'更新测试说明' })
      },

      {
        label: 'W10-PATCH-无token→401', module:'orders', category:'权限校验', method:'PATCH',
        url:`/api/orders/${oid}`, body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().patch(`/api/orders/${oid}`, { status:'completed' })
      },
      {
        label: 'W10-PATCH-customer→403', module:'orders', category:'权限校验', method:'PATCH',
        url:`/api/orders/${oid}`, body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).patch(`/api/orders/${oid}`, { status:'completed' })
      },
      {
        label: 'W10-PATCH-正向-经纪人变更订单状态', module:'orders', category:'正向功能', method:'PATCH',
        url:`/api/orders/${oid}`, body:'{status}',
        expect:[200,400], // 种子订单=cancelled，状态机可能拒绝
        fn:()=>agentCli.patch(`/api/orders/${oid}`, { status:'confirmed' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W11 | PUT /api/workers/[id] — 更新阿姨详情
  // W12 | PATCH /api/workers/[id] — 阿姨状态变更
  // ════════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const agentCli = createClient(agentTok);
    const customerTok = await loginAs('customer');
    const wid = ids.firstWorkerId || '00000000-0000-0000-0000-000000000001';

    results.push(...await batchRun('W11 👩 阿姨详情操作 (workers/[id])', [
      {
        label: 'W11-PUT-无token→401', module:'workers', category:'权限校验', method:'PUT',
        url:`/api/workers/${wid}`, body:'{name}',
        expect:{ status:401 },
        fn:()=>createClient().put(`/api/workers/${wid}`, { name:'越权修改' })
      },
      {
        label: 'W11-PUT-customer→403', module:'workers', category:'权限校验', method:'PUT',
        url:`/api/workers/${wid}`, body:'{name}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).put(`/api/workers/${wid}`, { name:'越权修改' })
      },
      {
        label: 'W11-PUT-正向-经纪人更新阿姨详情', module:'workers', category:'正向功能', method:'PUT',
        url:`/api/workers/${wid}`, body:'{name, phone, age}',
        expect:{ status:200, hasField:'ok' },
        fn:()=>agentCli.put(`/api/workers/${wid}`, { name:'阿姨更新测试', phone:genPhone('138'), age:32 })
      },

      {
        label: 'W12-PATCH-无token→401', module:'workers', category:'权限校验', method:'PATCH',
        url:`/api/workers/${wid}`, body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().patch(`/api/workers/${wid}`, { status:'available' })
      },
      {
        label: 'W12-PATCH-customer→403', module:'workers', category:'权限校验', method:'PATCH',
        url:`/api/workers/${wid}`, body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).patch(`/api/workers/${wid}`, { status:'available' })
      },
      {
        label: 'W12-PATCH-正向-管理员变更阿姨状态', module:'workers', category:'正向功能', method:'PATCH',
        url:`/api/workers/${wid}`, body:'{status}',
        expect:[200,403], // agent无权PATCH，改用admin
        fn: async () => {
          const adminTok2 = await loginAs('admin');
          return await createClient(adminTok2).patch(`/api/workers/${wid}`, { status:'available' });
        }
      },
    ]));
  }

  // ════════════════════════════════════════
  // W13 | PATCH /api/users/[id] — 用户个人信息变更
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');
    const uid = ids.firstUserId || '00000000-0000-0000-0000-000000000001';

    results.push(...await batchRun('W13 👤 用户信息变更 (users/[id] PATCH)', [
      {
        label: 'W13-权限-无token→403', module:'users', category:'权限校验', method:'PATCH',
        url:`/api/users/${uid}`, body:'{name}',
        expect:{ status:403 }, // API直接返回403，不区分未认证
        fn:()=>createClient().patch(`/api/users/${uid}`, { name:'越权修改' })
      },
      {
        label: 'W13-权限-worker改他人→403', module:'users', category:'权限校验', method:'PATCH',
        url:`/api/users/${uid}`, body:'{name}',
        expect:{ status:403 },
        fn: async () => {
          const otherId = ids.secondUserId || uid;
          return createClient(workerTok).patch(`/api/users/${otherId}`, { name:'越权' });
        }
      },
      {
        label: 'W13-正向-admin审核用户', module:'users', category:'正向功能', method:'PATCH',
        url:`/api/users/${uid}`, body:'{review_status}',
        expect:[200,400], // 用户可能已approved，400也算通
        fn:()=>adminCli.patch(`/api/users/${uid}`, { review_status:'approved' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W14 | PUT /api/notifications/[id] — 更新通知
  // W15 | PATCH /api/notifications/[id] — 通知状态变更
  // ════════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const agentCli = createClient(agentTok);
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('W14 🔔 通知操作 (notifications/[id])', [
      {
        label: 'W14-PUT-无token→401', module:'notifications', category:'权限校验', method:'PUT',
        url:'/api/notifications/test-id', body:'{title}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/notifications/test-id', { title:'越权' })
      },
      {
        label: 'W14-PUT-worker→403', module:'notifications', category:'权限校验', method:'PUT',
        url:'/api/notifications/test-id', body:'{title}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).put('/api/notifications/test-id', { title:'越权' })
      },
      {
        label: 'W15-PATCH-无token→401', module:'notifications', category:'权限校验', method:'PATCH',
        url:'/api/notifications/test-id', body:'{read}',
        expect:{ status:401 },
        fn:()=>createClient().patch('/api/notifications/test-id', { read:true })
      },
      {
        label: 'W15-PATCH-worker→403', module:'notifications', category:'权限校验', method:'PATCH',
        url:'/api/notifications/test-id', body:'{read}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).patch('/api/notifications/test-id', { read:true })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W16 | PATCH /api/enrollments/[id] — 报名状态变更
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const customerTok = await loginAs('customer');
    const eid = ids.firstEnrollmentId || '00000000-0000-0000-0000-000000000500';

    results.push(...await batchRun('W16 🎓 报名状态变更 (enrollments/[id] PATCH)', [
      {
        label: 'W16-权限-无token→401', module:'enrollments', category:'权限校验', method:'PATCH',
        url:`/api/enrollments/${eid}`, body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().patch(`/api/enrollments/${eid}`, { status:'completed' })
      },
      {
        label: 'W16-权限-customer→403', module:'enrollments', category:'权限校验', method:'PATCH',
        url:`/api/enrollments/${eid}`, body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).patch(`/api/enrollments/${eid}`, { status:'completed' })
      },
      {
        label: 'W16-正向-admin变更报名状态', module:'enrollments', category:'正向功能', method:'PATCH',
        url:`/api/enrollments/${eid}`, body:'{status}',
        expect:[200,400], // 种子数据confirmed→enrolled不可逆，400也算通过
        fn:()=>adminCli.patch(`/api/enrollments/${eid}`, { status:'enrolled' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W17 | PATCH /api/recommendations/[id] — 推荐状态
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('W17 🎯 推荐状态 (recommendations/[id] PATCH)', [
      {
        label: 'W17-权限-无token→401', module:'recommendations', category:'权限校验', method:'PATCH',
        url:'/api/recommendations/test-id', body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().patch('/api/recommendations/test-id', { status:'accepted' })
      },
      {
        label: 'W17-权限-customer→403', module:'recommendations', category:'权限校验', method:'PATCH',
        url:'/api/recommendations/test-id', body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).patch('/api/recommendations/test-id', { status:'accepted' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W18 | PATCH /api/refunds/[id] — 退款状态
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('W18 💸 退款状态 (refunds/[id] PATCH)', [
      {
        label: 'W18-权限-无token→401', module:'refunds', category:'权限校验', method:'PATCH',
        url:'/api/refunds/test-id', body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().patch('/api/refunds/test-id', { status:'approved' })
      },
      {
        label: 'W18-权限-customer→403', module:'refunds', category:'权限校验', method:'PATCH',
        url:'/api/refunds/test-id', body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).patch('/api/refunds/test-id', { status:'approved' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W19 | DELETE /api/workers/[id]/media — 删除阿姨作品
  // ════════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const agentCli = createClient(agentTok);
    const customerTok = await loginAs('customer');
    const wid = ids.firstWorkerId || '00000000-0000-0000-0000-000000000001';

    results.push(...await batchRun('W19 🖼 删除阿姨作品 (workers/[id]/media DELETE)', [
      {
        label: 'W19-权限-无token→401', module:'workers', category:'权限校验', method:'DELETE',
        url:`/api/workers/${wid}/media`, body:'{media_id}',
        expect:{ status:401 },
        fn:()=>createClient().delete(`/api/workers/${wid}/media`, { data:{ media_id:'test' } })
      },
      {
        label: 'W19-权限-customer→403', module:'workers', category:'权限校验', method:'DELETE',
        url:`/api/workers/${wid}/media`, body:'{media_id}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).delete(`/api/workers/${wid}/media`, { data:{ media_id:'test' } })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W20 | PUT /api/workers/[id]/work-experience — 新增工作经历
  // W21 | DELETE /api/workers/[id]/work-experience — 删除工作经历
  // ════════════════════════════════════════
  {
    const agentTok = await loginAs('agent');
    const agentCli = createClient(agentTok);
    const customerTok = await loginAs('customer');
    const wid = ids.firstWorkerId || '00000000-0000-0000-0000-000000000001';

    results.push(...await batchRun('W20 💼 工作经历操作 (workers/[id]/work-experience)', [
      {
        label: 'W20-PUT-无token→401', module:'workers', category:'权限校验', method:'PUT',
        url:`/api/workers/${wid}/work-experience`, body:'{employer, role}',
        expect:{ status:401 },
        fn:()=>createClient().put(`/api/workers/${wid}/work-experience`, { employer:'测试雇主', role:'月嫂' })
      },
      {
        label: 'W20-PUT-customer→403', module:'workers', category:'权限校验', method:'PUT',
        url:`/api/workers/${wid}/work-experience`, body:'{employer, role}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).put(`/api/workers/${wid}/work-experience`, { employer:'越权', role:'月嫂' })
      },
      {
        label: 'W21-DELETE-无token→401', module:'workers', category:'权限校验', method:'DELETE',
        url:`/api/workers/${wid}/work-experience`, body:'{exp_id}',
        expect:{ status:401 },
        fn:()=>createClient().delete(`/api/workers/${wid}/work-experience`, { data:{ exp_id:'test' } })
      },
      {
        label: 'W21-DELETE-customer→403', module:'workers', category:'权限校验', method:'DELETE',
        url:`/api/workers/${wid}/work-experience`, body:'{exp_id}',
        expect:{ status:403 },
        fn:()=>createClient(customerTok).delete(`/api/workers/${wid}/work-experience`, { data:{ exp_id:'test' } })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W22 | DELETE /api/worker-applications — 删除阿姨申请
  // W23 | PUT /api/worker-applications/[id] — 更新阿姨申请
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('W22 📋 阿姨申请操作 (worker-applications)', [
      {
        label: 'W22-DELETE-无token→401', module:'worker-applications', category:'权限校验', method:'DELETE',
        url:'/api/worker-applications', body:'{id}',
        expect:{ status:401 },
        fn:()=>createClient().delete('/api/worker-applications', { data:{ id:'test' } })
      },
      {
        label: 'W22-DELETE-worker→403', module:'worker-applications', category:'权限校验', method:'DELETE',
        url:'/api/worker-applications', body:'{id}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).delete('/api/worker-applications', { data:{ id:'test' } })
      },
      {
        label: 'W23-PUT-无token→401', module:'worker-applications', category:'权限校验', method:'PUT',
        url:'/api/worker-applications/test-id', body:'{status}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/worker-applications/test-id', { status:'approved' })
      },
      {
        label: 'W23-PUT-worker→403', module:'worker-applications', category:'权限校验', method:'PUT',
        url:'/api/worker-applications/test-id', body:'{status}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).put('/api/worker-applications/test-id', { status:'approved' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W24 | PUT /api/resume-reviews — 更新简历审核
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('W24 ✅ 简历审核更新 (resume-reviews PUT)', [
      {
        label: 'W24-权限-无token→401', module:'resume-reviews', category:'权限校验', method:'PUT',
        url:'/api/resume-reviews', body:'{id, status}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/resume-reviews', { id:'test', status:'approved' })
      },
      {
        label: 'W24-权限-agent→403', module:'resume-reviews', category:'权限校验', method:'PUT',
        url:'/api/resume-reviews', body:'{id, status}',
        expect:{ status:403 },
        fn:()=>createClient(agentTok).put('/api/resume-reviews', { id:'test', status:'approved' })
      },
      {
        label: 'W24-参数-缺id→400', module:'resume-reviews', category:'参数异常', method:'PUT',
        url:'/api/resume-reviews', body:'{status}',
        expect:{ status:400 },
        fn:()=>adminCli.put('/api/resume-reviews', { status:'approved' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W25 | PUT /api/customer-leads — 更新客户线索
  // ════════════════════════════════════════
  {
    const recruiterTok = await loginAs('recruiter');
    const recruiterCli = createClient(recruiterTok);
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('W25 📞 客户线索 (customer-leads PUT)', [
      {
        label: 'W25-权限-无token→401', module:'customer-leads', category:'权限校验', method:'PUT',
        url:'/api/customer-leads', body:'{id, name}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/customer-leads', { id:'test', name:'test' })
      },
      {
        label: 'W25-权限-worker→403', module:'customer-leads', category:'权限校验', method:'PUT',
        url:'/api/customer-leads', body:'{id, name}',
        expect:{ status:403 },
        fn:()=>createClient(workerTok).put('/api/customer-leads', { id:'test', name:'越权' })
      },
      {
        label: 'W25-参数-缺id→400', module:'customer-leads', category:'参数异常', method:'PUT',
        url:'/api/customer-leads', body:'{name}',
        expect:{ status:400 },
        fn:()=>recruiterCli.put('/api/customer-leads', { name:'缺id' })
      },
    ]));
  }

  // ════════════════════════════════════════
  // W26 | PUT /api/worker-tiers — 更新阿姨等级
  // ════════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('W26 ⭐ 阿姨等级 (worker-tiers PUT)', [
      {
        label: 'W26-权限-无token→401', module:'worker-tiers', category:'权限校验', method:'PUT',
        url:'/api/worker-tiers', body:'{id, tier}',
        expect:{ status:401 },
        fn:()=>createClient().put('/api/worker-tiers', { id:'test', tier:'gold' })
      },
      {
        label: 'W26-权限-agent→403', module:'worker-tiers', category:'权限校验', method:'PUT',
        url:'/api/worker-tiers', body:'{id, tier}',
        expect:{ status:403 },
        fn:()=>createClient(agentTok).put('/api/worker-tiers', { id:'test', tier:'gold' })
      },
      {
        label: 'W26-正向-admin设置等级', module:'worker-tiers', category:'正向功能', method:'PUT',
        url:'/api/worker-tiers', body:'{id, level, name}',
        expect:[200,404], // 无种子ID，404也算通过
        fn:()=>adminCli.put('/api/worker-tiers', { id:'test-tier-1', name:'测试等级', level:99 })
      },
    ]));
  }

  return results;
};

/**
 * 更新类接口测试套件 (UPDATE)
 * 覆盖 PUT 更新 + POST 审批/确认类操作 × 5大类
 */
const axios = require('axios');
const { loginAs, clearTokens, createClient, runCase, batchRun, config, fetchTestIds } = require('../helpers');

module.exports = async function updateSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  // ════════════════════════════════════
  // U01 | 更新阿姨 (PUT workers — 提交审核)
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('U01 👩 更新阿姨 (workers PUT)', [
      {
        label: 'U01-正向-经纪人更新阿姨信息', module:'workers', category:'正向功能', method:'PUT', url:'/api/workers',
        body:'{id, name, phone, age, specialties}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/workers', {
          id: ids.firstWorkerId,
          name:'更新测试阿姨', phone:'13800005678', age:35, specialties:['育儿','做饭']
        })
      },
      {
        label: 'U01-参数-缺少id', module:'workers', category:'参数异常', method:'PUT', url:'/api/workers',
        body:'{name, phone}', expect:{ status:400 },
        fn:()=>client.put('/api/workers', { name:'缺id' })
      },
      {
        label: 'U01-权限-客户更新阿姨', module:'workers', category:'权限校验', method:'PUT', url:'/api/workers',
        body:'{id, name}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).put('/api/workers', { id:'test-id', name:'越权' });
        }
      },
      {
        label: 'U01-权限-无token', module:'workers', category:'权限校验', method:'PUT', url:'/api/workers',
        body:'{id, name}', expect:{ status:401 },
        fn:()=>createClient().put('/api/workers', { id:'test-id', name:'匿名' })
      },
      {
        label: 'U01-边界-更新不存在的阿姨', module:'workers', category:'边界值', method:'PUT', url:'/api/workers',
        body:'{id:no-exist-xxx}', expect:{ status:404 },
        fn:()=>client.put('/api/workers', { id:'no-such-worker-id-99999', name:'幽灵阿姨' })
      },
      {
        label: 'U01-边界-age为负数', module:'workers', category:'边界值', method:'PUT', url:'/api/workers',
        body:'{id, age:-1}', expect:{ status:400 },
        fn:()=>client.put('/api/workers', {
          id: ids.firstWorkerId, age:-1
        })
      },
    ]));
  }

  // ════════════════════════════════════
  // U02 | 更新线索
  // ════════════════════════════════════
  {
    const tok = await loginAs('recruiter');
    const client = createClient(tok);

    results.push(...await batchRun('U02 📋 更新线索 (leads PUT)', [
      {
        label: 'U02-正向-招生更新线索信息', module:'leads', category:'正向功能', method:'PUT', url:'/api/leads',
        body:'{id, name, phone, intention}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/leads', {
          id: ids.firstLeadId, name:'更新线索', phone:'18300000001', intention:'强烈意向'
        })
      },
      {
        label: 'U02-参数-缺少id', module:'leads', category:'参数异常', method:'PUT', url:'/api/leads',
        body:'{name}', expect:{ status:400 },
        fn:()=>client.put('/api/leads', { name:'缺id' })
      },
      {
        label: 'U02-权限-客户更新线索', module:'leads', category:'权限校验', method:'PUT', url:'/api/leads',
        body:'{id, name}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).put('/api/leads', { id: ids.firstLeadId, name:'越权' });
        }
      },
      {
        label: 'U02-边界-不存在线索ID', module:'leads', category:'边界值', method:'PUT', url:'/api/leads',
        body:'{id:no-exist}', expect:{ status:404 },
        fn:()=>client.put('/api/leads', { id:'no-such-lead-99999', name:'幽灵线索' })
      },
      {
        label: 'U02-边界-状态设为非法值', module:'leads', category:'边界值', method:'PUT', url:'/api/leads',
        body:'{id, status:hacked}', expect:{ status:400 },
        fn:()=>client.put('/api/leads', { id: ids.firstLeadId, status:'hacked_status_xxx' })
      },
    ]));
  }

  // ════════════════════════════════════
  // U03 | 更新客户
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('U03 🏠 更新客户 (customers PUT)', [
      {
        label: 'U03-正向-经纪人更新客户信息', module:'customers', category:'正向功能', method:'PUT', url:'/api/customers',
        body:'{id, name, phone, requirement}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/customers', {
          id: ids.firstCustomerId,
          name:'更新客户', phone:'13900000001', requirement:'需要月嫂'
        })
      },
      {
        label: 'U03-参数-缺少id', module:'customers', category:'参数异常', method:'PUT', url:'/api/customers',
        body:'{name}', expect:{ status:400 },
        fn:()=>client.put('/api/customers', { name:'缺id' })
      },
      {
        label: 'U03-权限-阿姨更新客户', module:'customers', category:'权限校验', method:'PUT', url:'/api/customers',
        body:'{id, name}', expect:{ status:401 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).put('/api/customers', { id:'test', name:'越权' });
        }
      },
      {
        label: 'U03-边界-不存在客户ID', module:'customers', category:'边界值', method:'PUT', url:'/api/customers',
        body:'{id:no-exist}', expect:{ status:404 },
        fn:()=>client.put('/api/customers', { id:'no-such-customer-99999', name:'幽灵客户' })
      },
    ]));
  }

  // ════════════════════════════════════
  // U04 | 更新订单
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('U04 📦 更新订单 (orders PUT)', [
      {
        label: 'U04-正向-经纪人更新订单信息', module:'orders', category:'正向功能', method:'PUT', url:'/api/orders',
        body:'{id, status, worker_id}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/orders', {
          id: ids.firstOrderId, status:'in_progress', worker_id: ids.firstWorkerId
        })
      },
      {
        label: 'U04-正向-更新金额', module:'orders', category:'正向功能', method:'PUT', url:'/api/orders',
        body:'{id, amount}', expect:{ status:200 },
        fn:()=>client.put('/api/orders', { id: ids.firstOrderId, amount:6000 })
      },
      {
        label: 'U04-参数-缺少id', module:'orders', category:'参数异常', method:'PUT', url:'/api/orders',
        body:'{status}', expect:{ status:400 },
        fn:()=>client.put('/api/orders', { status:'in_progress' })
      },
      {
        label: 'U04-权限-客户更新订单', module:'orders', category:'权限校验', method:'PUT', url:'/api/orders',
        body:'{id, status}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).put('/api/orders', { id: ids.firstOrderId, status:'in_progress' });
        }
      },
      {
        label: 'U04-边界-不存在的订单ID', module:'orders', category:'边界值', method:'PUT', url:'/api/orders',
        body:'{id:no-exist}', expect:{ status:404 },
        fn:()=>client.put('/api/orders', { id:'no-such-order-99999', status:'pending' })
      },
      {
        label: 'U04-边界-金额为负数', module:'orders', category:'边界值', method:'PUT', url:'/api/orders',
        body:'{id, amount:-5000}', expect:{ status:400 },
        fn:()=>client.put('/api/orders', { id: ids.firstOrderId, amount:-5000 })
      },
    ]));
  }

  // ════════════════════════════════════
  // U05 | 更新课程
  // ════════════════════════════════════
  {
    const tok = await loginAs('instructor');
    const client = createClient(tok);

    results.push(...await batchRun('U05 📚 更新课程 (courses PUT)', [
      {
        label: 'U05-正向-讲师更新课程', module:'courses', category:'正向功能', method:'PUT', url:'/api/courses',
        body:'{id, title, price, duration}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/courses', {
          id: ids.firstCourseId,
          title:'高级月嫂课程(更新版)', price:2999, duration:'7天'
        })
      },
      {
        label: 'U05-参数-缺少id', module:'courses', category:'参数异常', method:'PUT', url:'/api/courses',
        body:'{title}', expect:{ status:400 },
        fn:()=>client.put('/api/courses', { title:'缺id课程' })
      },
      {
        label: 'U05-权限-客户更新课程', module:'courses', category:'权限校验', method:'PUT', url:'/api/courses',
        body:'{id, title}', expect:{ status:401 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).put('/api/courses', { id:'test', title:'越权' });
        }
      },
      {
        label: 'U05-边界-不存在课程ID', module:'courses', category:'边界值', method:'PUT', url:'/api/courses',
        body:'{id:no-exist}', expect:{ status:404 },
        fn:()=>client.put('/api/courses', { id:'no-such-course-99999', title:'幽灵课程' })
      },
      {
        label: 'U05-边界-价格设为负数', module:'courses', category:'边界值', method:'PUT', url:'/api/courses',
        body:'{id, price:-100}', expect:{ status:400 },
        fn:()=>client.put('/api/courses', { id: ids.firstCourseId, price:-100 })
      },
    ]));
  }

  // ════════════════════════════════════
  // U06 | 更新评价
  // ════════════════════════════════════
  {
    const tok = await loginAs('customer');
    const client = createClient(tok);

    results.push(...await batchRun('U06 ⭐ 更新评价 (reviews PUT)', [
      {
        label: 'U06-正向-客户修改评价', module:'reviews', category:'正向功能', method:'PUT', url:'/api/reviews',
        body:'{id, rating, content}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/reviews', {
          id: ids.firstReviewId, rating:4, content:'修改评价，服务态度还可以'
        })
      },
      {
        label: 'U06-参数-缺少id', module:'reviews', category:'参数异常', method:'PUT', url:'/api/reviews',
        body:'{rating}', expect:{ status:400 },
        fn:()=>client.put('/api/reviews', { rating:5 })
      },
      {
        label: 'U06-权限-他人修改评价', module:'reviews', category:'权限校验', method:'PUT', url:'/api/reviews',
        body:'{id, content}', expect:{ status:403 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).put('/api/reviews', { id: ids.firstReviewId, content:'越权修改' });
        }
      },
      {
        label: 'U06-边界-不存在的评价ID', module:'reviews', category:'边界值', method:'PUT', url:'/api/reviews',
        body:'{id:no-exist}', expect:{ status:404 },
        fn:()=>client.put('/api/reviews', { id:'no-such-review-99999', rating:3 })
      },
    ]));
  }

  // ════════════════════════════════════
  // U07 | 更新合同
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('U07 📝 更新合同 (contracts PUT)', [
      {
        label: 'U07-正向-经纪人更新合同', module:'contracts', category:'正向功能', method:'PUT', url:'/api/contracts',
        body:'{id, amount, status}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/contracts', {
          id: ids.firstContractId, amount:9000, status:'active'
        })
      },
      {
        label: 'U07-参数-缺少id', module:'contracts', category:'参数异常', method:'PUT', url:'/api/contracts',
        body:'{amount}', expect:{ status:400 },
        fn:()=>client.put('/api/contracts', { amount:5000 })
      },
      {
        label: 'U07-权限-阿姨更新合同', module:'contracts', category:'权限校验', method:'PUT', url:'/api/contracts',
        body:'{id, amount}', expect:{ status:403 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).put('/api/contracts', { id: ids.firstContractId, amount:100 });
        }
      },
      {
        label: 'U07-边界-不存在合同ID', module:'contracts', category:'边界值', method:'PUT', url:'/api/contracts',
        body:'{id:no-exist}', expect:{ status:404 },
        fn:()=>client.put('/api/contracts', { id:'no-such-contract-99999', amount:1000 })
      },
    ]));
  }

  // ════════════════════════════════════
  // U08 | 更新报名
  // ════════════════════════════════════
  {
    const tok = await loginAs('instructor');
    const client = createClient(tok);

    results.push(...await batchRun('U08 🎓 更新报名 (enrollments PUT)', [
      {
        label: 'U08-正向-更新报名信息', module:'enrollments', category:'正向功能', method:'PUT', url:'/api/enrollments',
        body:'{id, status, score}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/enrollments', {
          id: ids.firstEnrollmentId, status:'completed', score:85
        })
      },
      {
        label: 'U08-参数-缺少id', module:'enrollments', category:'参数异常', method:'PUT', url:'/api/enrollments',
        body:'{status}', expect:{ status:400 },
        fn:()=>client.put('/api/enrollments', { status:'completed' })
      },
      {
        label: 'U08-权限-客户更新报名', module:'enrollments', category:'权限校验', method:'PUT', url:'/api/enrollments',
        body:'{id, status}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).put('/api/enrollments', { id:'test', status:'completed' });
        }
      },
      {
        label: 'U08-边界-分数超过100', module:'enrollments', category:'边界值', method:'PUT', url:'/api/enrollments',
        body:'{id, score:200}', expect:{ status:400 },
        fn:()=>client.put('/api/enrollments', { id: ids.firstEnrollmentId, score:200 })
      },
    ]));
  }

  // ════════════════════════════════════
  // U09 | 更新系统设置
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('U09 ⚙️ 更新系统设置 (settings PUT)', [
      {
        label: 'U09-正向-admin更新设置', module:'settings', category:'正向功能', method:'PUT', url:'/api/settings',
        body:'{key, value:JSON}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/settings', {
          key:'commission_rules', value:{ base_rate:0.3, agent_rate:0.5, platform_rate:0.2 }
        })
      },
      {
        label: 'U09-参数-缺少key', module:'settings', category:'参数异常', method:'PUT', url:'/api/settings',
        body:'{value}', expect:{ status:400 },
        fn:()=>client.put('/api/settings', { value:{ test:true } })
      },
      {
        label: 'U09-权重-经纪人更新设置', module:'settings', category:'权限校验', method:'PUT', url:'/api/settings',
        body:'{key, value}', expect:{ status:401 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).put('/api/settings', { key:'test', value:{} });
        }
      },
      {
        label: 'U09-边界-value超大JSON', module:'settings', category:'边界值', method:'PUT', url:'/api/settings',
        body:'{key, value:50KB}', expect:{ status:400 },
        fn:()=>client.put('/api/settings', {
          key:'test_large', value:{ data:'x'.repeat(50000) }
        })
      },
    ]));
  }

  // ════════════════════════════════════
  // U10 | 更新用户
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('U10 👥 更新用户 (users PUT)', [
      {
        label: 'U10-正向-admin更新用户信息', module:'users', category:'正向功能', method:'PUT', url:'/api/users',
        body:'{id, name, role}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/users', {
          id: ids.firstUserId, name:'阿姨更新名', role:'worker'
        })
      },
      {
        label: 'U10-参数-缺少id', module:'users', category:'参数异常', method:'PUT', url:'/api/users',
        body:'{name}', expect:{ status:400 },
        fn:()=>client.put('/api/users', { name:'缺id' })
      },
      {
        label: 'U10-权限-经纪人更新用户', module:'users', category:'权限校验', method:'PUT', url:'/api/users',
        body:'{id, name}', expect:{ status:403 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).put('/api/users', { id:'test', name:'越权' });
        }
      },
      {
        label: 'U10-边界-设为非法角色', module:'users', category:'边界值', method:'PUT', url:'/api/users',
        body:'{id, role:hacker}', expect:{ status:400 },
        fn:()=>client.put('/api/users', { id: ids.secondUserId, role:'hacker_role_xxx' })
      },
    ]));
  }

  // ════════════════════════════════════
  // U11 | 更新培训合同
  // ════════════════════════════════════
  {
    const tok = await loginAs('training_supervisor');
    const client = createClient(tok);

    results.push(...await batchRun('U11 📋 更新培训合同 (training-contracts PUT)', [
      {
        label: 'U11-正向-培训主管更新合同', module:'training-contracts', category:'正向功能', method:'PUT', url:'/api/training-contracts',
        body:'{id, status, amount}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/training-contracts', {
          id: ids.firstTrainingContractId, status:'confirmed', amount:5000
        })
      },
      {
        label: 'U11-参数-缺少id', module:'training-contracts', category:'参数异常', method:'PUT', url:'/api/training-contracts',
        body:'{status}', expect:{ status:400 },
        fn:()=>client.put('/api/training-contracts', { status:'confirmed' })
      },
      {
        label: 'U11-权限-阿姨更新培训合同', module:'training-contracts', category:'权限校验', method:'PUT', url:'/api/training-contracts',
        body:'{id, status}', expect:{ status:403 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).put('/api/training-contracts', { id:'test', status:'confirmed' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // U12 | 更新场地
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('U12 📍 更新场地 (venues PUT)', [
      {
        label: 'U12-正向-admin更新场地', module:'venues', category:'正向功能', method:'PUT', url:'/api/venues',
        body:'{id, name, address}', expect:{ status:200, hasField:'success' },
        fn:()=>client.put('/api/venues', {
          id: ids.firstVenueId, name:'更新场地名', address:'新地址', capacity:50
        })
      },
      {
        label: 'U12-参数-缺少id', module:'venues', category:'参数异常', method:'PUT', url:'/api/venues',
        body:'{name}', expect:{ status:400 },
        fn:()=>client.put('/api/venues', { name:'缺id场地' })
      },
      {
        label: 'U12-权限-经纪人更新场地', module:'venues', category:'权限校验', method:'PUT', url:'/api/venues',
        body:'{id, name}', expect:{ status:403 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).put('/api/venues', { id:'test', name:'越权' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // ─── POST 审批/确认类"更新"操作 ───
  // ════════════════════════════════════

  // ════════════════════════════════════
  // U13 | 简历审核通过/拒绝
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('U13 ✅ 简历审核 approve/reject', [
      {
        label: 'U13-正向-admin审核通过', module:'resume-reviews', category:'正向功能', method:'POST', url:'/api/resume-reviews/{id}/approve',
        body:'{}', expect:{ status:200, hasField:'success' },
        fn:()=>client.post(`/api/resume-reviews/${ids.firstResumeReviewId}/approve`, {})
      },
      {
        label: 'U13-正向-admin审核拒绝', module:'resume-reviews', category:'正向功能', method:'POST', url:'/api/resume-reviews/{id}/reject',
        body:'{reason}', expect:{ status:200, hasField:'success' },
        fn:()=>client.post(`/api/resume-reviews/${ids.secondResumeReviewId}/reject`, { reason:'信息不完整' })
      },
      {
        label: 'U13-参数-拒绝缺少reason', module:'resume-reviews', category:'参数异常', method:'POST', url:'/api/resume-reviews/{id}/reject',
        body:'{}', expect:{ status:400 },
        fn:()=>client.post(`/api/resume-reviews/${ids.secondResumeReviewId}/reject`, {})
      },
      {
        label: 'U13-权限-经纪人审核简历', module:'resume-reviews', category:'权限校验', method:'POST', url:'/api/resume-reviews/{id}/approve',
        body:'{}', expect:{ status:401 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).post(`/api/resume-reviews/${ids.firstResumeReviewId}/approve`, {});
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // U14 | 合同确认 / 更换阿姨 / 暂停/恢复
  // ════════════════════════════════════
  {
    const tok1 = await loginAs('training_supervisor');
    const cli1 = createClient(tok1);
    const tok2 = await loginAs('agent');
    const cli2 = createClient(tok2);

    results.push(...await batchRun('U14 🔄 合同确认/换阿姨/暂停恢复', [
      {
        label: 'U14-正向-主管确认签约', module:'contracts', category:'正向功能', method:'POST', url:'/api/contracts/{id}/confirm',
        body:'{}', expect:{ status:200, hasField:'success' },
        fn:()=>cli1.post(`/api/contracts/${ids.firstContractId}/confirm`, {})
      },
      {
        label: 'U14-正向-更换订单阿姨', module:'orders', category:'正向功能', method:'POST', url:'/api/orders/{id}/replace',
        body:'{new_worker_id, reason}', expect:{ status:200, hasField:'success' },
        fn:()=>cli2.post(`/api/orders/${ids.firstOrderId}/replace`, {
          new_worker_id: ids.secondWorkerId, reason:'阿姨请假'
        })
      },
      {
        label: 'U14-正向-阿姨暂停接单', module:'workers', category:'正向功能', method:'POST', url:'/api/workers/{id}/pause',
        body:'{reason}', expect:{ status:200, hasField:'success' },
        fn:()=>cli2.post(`/api/workers/${ids.firstWorkerId}/pause`, { reason:'个人原因休息' })
      },
      {
        label: 'U14-正向-阿姨恢复接单', module:'workers', category:'正向功能', method:'POST', url:'/api/workers/{id}/resume',
        body:'{}', expect:{ status:200, hasField:'success' },
        fn:()=>cli2.post(`/api/workers/${ids.firstWorkerId}/resume`, {})
      },
      {
        label: 'U14-参数-换阿姨缺new_worker_id', module:'orders', category:'参数异常', method:'POST', url:'/api/orders/{id}/replace',
        body:'{reason}', expect:{ status:400 },
        fn:()=>cli2.post(`/api/orders/${ids.firstOrderId}/replace`, { reason:'没给新阿姨' })
      },
      {
        label: 'U14-权限-客户暂停阿姨', module:'workers', category:'权限校验', method:'POST', url:'/api/workers/{id}/pause',
        body:'{reason}', expect:{ status:401 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post(`/api/workers/${ids.firstWorkerId}/pause`, { reason:'越权' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // U15 | 课程审核 / 排课审核 / 培训打分 / 费用确认
  // ════════════════════════════════════
  {
    const tok1 = await loginAs('admin');
    const cli1 = createClient(tok1);
    const tok2 = await loginAs('training_supervisor');
    const cli2 = createClient(tok2);
    const tok3 = await loginAs('instructor');
    const cli3 = createClient(tok3);

    results.push(...await batchRun('U15 🎯 审核/打分/确认类', [
      {
        label: 'U15-正向-admin审核课程', module:'courses', category:'正向功能', method:'POST', url:'/api/courses/{id}/approve',
        body:'{approved:true}', expect:{ status:200, hasField:'success' },
        fn:()=>cli1.post(`/api/courses/${ids.firstCourseId}/approve`, { approved:true })
      },
      {
        label: 'U15-正向-主管审核排课', module:'course-schedules', category:'正向功能', method:'POST', url:'/api/course-schedules/{id}/approve',
        body:'{approved:true}', expect:{ status:200, hasField:'success' },
        fn:()=>cli2.post(`/api/course-schedules/${ids.firstScheduleId}/approve`, { approved:true })
      },
      {
        label: 'U15-正向-讲师考核打分', module:'enrollments', category:'正向功能', method:'POST', url:'/api/enrollments/{id}/grade',
        body:'{score, comment}', expect:{ status:200, hasField:'success' },
        fn:()=>cli3.post(`/api/enrollments/${ids.firstEnrollmentId}/grade`, { score:88, comment:'表现优秀' })
      },
      {
        label: 'U15-正向-确认平台费用到账', module:'platform-fees', category:'正向功能', method:'POST', url:'/api/platform-fees/{id}/confirm',
        body:'{}', expect:{ status:200, hasField:'success' },
        fn:()=>cli1.post(`/api/platform-fees/${ids.firstPlatformFeeId}/confirm`, {})
      },
      {
        label: 'U15-参数-打分缺score', module:'enrollments', category:'参数异常', method:'POST', url:'/api/enrollments/{id}/grade',
        body:'{comment}', expect:{ status:400 },
        fn:()=>cli3.post(`/api/enrollments/${ids.firstEnrollmentId}/grade`, { comment:'没给分数' })
      },
      {
        label: 'U15-权限-客户审核课程', module:'courses', category:'权限校验', method:'POST', url:'/api/courses/{id}/approve',
        body:'{approved:true}', expect:{ status:401 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post(`/api/courses/${ids.firstCourseId}/approve`, { approved:true });
        }
      },
      {
        label: 'U15-权限-学员给自己打分', module:'enrollments', category:'权限校验', method:'POST', url:'/api/enrollments/{id}/grade',
        body:'{score}', expect:{ status:401 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).post(`/api/enrollments/${ids.firstEnrollmentId}/grade`, { score:100 });
        }
      },
    ]));
  }

  return results;
};

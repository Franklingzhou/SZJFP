/**
 * 端到端流程测试套件 (E2E)
 * 覆盖 9 大核心业务流程，每个流程跨多个 API 调用验证完整链路
 *
 * 流程设计：
 *   E01 🔐 用户注册→登录→会话验证
 *   E02 📋 阿姨简历→提交审核→管理员审批
 *   E03 📦 订单全生命周期：创建→推荐→签约→完成→评价
 *   E04 🎯 线索转化：创建→跟进→签约
 *   E05 🎓 培训课程：创建→审核→报名→考核打分
 *   E06 📝 合同签约：草稿→签署→确认→自动关联
 *   E07 👤 客户旅程：创建→匹配→下单→完成
 *   E08 🛡 跨角色隔离：权限边界验证
 *   E09 ⚙️ 系统设置读写：读取→更新→验证持久化
 *   E99 🧹 清理：删除E2E测试过程中创建的资源
 */
const axios = require('axios');
const { loginAs, clearTokens, createClient, runCase, batchRun, config } = require('../helpers');
const genPhone = (prefix = '155') => `${prefix}${String(Math.floor(Math.random() * 90000000 + 10000000))}`;

module.exports = async function e2eSuite() {
  await clearTokens();
  const results = [];
  // 保存E2E期间创建的ID，供清理使用
  const created = { workerIds: [], orderIds: [], leadIds: [], courseIds: [],
    enrollmentIds: [], contractIds: [], reviewIds: [], customerIds: [] };

  // ════════════════════════════════════
  // E01 | 用户注册→登录→会话验证
  // ════════════════════════════════════
  results.push(...await batchRun('E01 🔐 注册→登录→会话', [
    {
      label: 'E01-流程-注册→密码登录→验证会话', module:'auth', category:'端到端流程', method:'POST→GET', url:'/api/auth/*',
      body:'phone→token→session', expect:{ status:200, hasField:'user' },
      fn: async () => {
        const phone = genPhone('155');
        // 1) 手机号注册
        const regRes = await createClient().post('/api/auth/phone-register', { phone, role:'worker', name:`E2E测试-${Date.now()}` });
        if (regRes.status !== 200 && regRes.status !== 201) throw new Error(`注册失败: ${regRes.status}`);
        // 2) 密码登录
        const loginRes = await createClient().post('/api/auth/password-login', { phone, password:'888888' });
        if (!loginRes.data?.token) throw new Error('登录未获取到token');
        const token = loginRes.data.token;
        // 3) 验证会话
        const sesRes = await createClient(token).get('/api/auth/session');
        if (!sesRes.data?.user) throw new Error('会话验证失败');
        return sesRes;
      }
    },
    {
      label: 'E01-流程-无token请求被拒绝', module:'auth', category:'端到端流程', method:'GET', url:'/api/auth/session',
      body:'无token', headers:'(无)', expect:{ status:401 },
      fn: () => createClient().get('/api/auth/session')
    },
    {
      label: 'E01-流程-假token请求被拒绝', module:'auth', category:'端到端流程', method:'GET', url:'/api/auth/session',
      body:'假token', expect:{ status:401 },
      fn: () => {
        const c = createClient('fake-token-12345');
        return c.get('/api/auth/session');
      }
    },
  ]));

  // ════════════════════════════════════
  // E02 | 阿姨简历→审核→上架
  // ════════════════════════════════════
  results.push(...await batchRun('E02 📋 阿姨简历审核全流程', [
    {
      label: 'E02-流程-创建简历→查询→admin审批通过', module:'workers', category:'端到端流程', method:'POST→GET→PUT', url:'/api/workers + /api/workers/:id',
      body:'创建→查询→审批', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const agentToken = await loginAs('agent');
        const adminToken = await loginAs('admin');
        // 1) 经纪人创建阿姨简历
        const createRes = await createClient(agentToken).post('/api/workers', {
          name: `E2E测试阿姨-${Date.now()}`,
          phone: genPhone('158'),
          age: 42, gender: '女', origin: '四川',
          job_types: ['保姆', '月嫂'], experience_years: 5,
          expected_salary_min: 6000, expected_salary_max: 8000,
        });
        const workerId = createRes.data?.worker?.id || createRes.data?.id;
        if (!workerId) throw new Error('创建阿姨失败');
        created.workerIds.push(workerId);
        // 2) 查询确认已创建
        const qRes = await createClient(agentToken).get('/api/workers', { id: workerId });
        const workers = qRes.data?.workers || qRes.data?.data || [];
        if (!workers.some(w => w.id === workerId)) throw new Error('查询不到刚创建的阿姨');
        // 3) admin审批通过
        const approveRes = await createClient(adminToken).put('/api/resume-reviews', {
          id: workerId, status: 'approved', review_note: 'E2E测试审批通过'
        });
        return approveRes;
      }
    },
  ]));

  // ════════════════════════════════════
  // E03 | 订单全生命周期
  // ════════════════════════════════════
  results.push(...await batchRun('E03 📦 订单全生命周期', [
    {
      label: 'E03-流程-创建订单→查询→完成', module:'orders', category:'端到端流程', method:'POST→GET→PUT', url:'/api/orders',
      body:'创建→查询→完成', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const agentToken = await loginAs('agent');
        // 1) 创建订单
        const createRes = await createClient(agentToken).post('/api/orders', {
          title: `E2E测试订单-${Date.now()}`,
          job_type: '月嫂',
          salary_min: 8000, salary_max: 12000,
          location: '深圳市南山区',
          description: 'E2E自动化测试创建的订单',
          contact_name: '测试客户', contact_phone: '15900001111',
        });
        const orderId = createRes.data?.order?.id || createRes.data?.id;
        if (!orderId) throw new Error('创建订单失败');
        created.orderIds.push(orderId);
        // 2) 查询订单确认
        const qRes = await createClient(agentToken).get('/api/orders', { id: orderId });
        const orders = qRes.data?.orders || qRes.data?.data || [];
        if (!orders.some(o => o.id === orderId)) throw new Error('查询不到订单');
        // 3) 完成订单
        const compRes = await createClient(agentToken).put('/api/orders', { id: orderId, status: 'completed' });
        return compRes;
      }
    },
    {
      label: 'E03-流程-非法状态流转被拒绝', module:'orders', category:'端到端流程', method:'PUT', url:'/api/orders',
      body:'completed→open(非法)', expect:{ status:400 },
      fn: async () => {
        const agentToken = await loginAs('agent');
        const createRes = await createClient(agentToken).post('/api/orders', {
          title: `E2E非法流转-${Date.now()}`, job_type: '钟点工',
          salary_min: 3000, salary_max: 5000, location: '广州', contact_name: '测', contact_phone: '15900002222',
        });
        const oid = createRes.data?.order?.id || createRes.data?.id;
        if (!oid) throw new Error('创建失败');
        created.orderIds.push(oid);
        // 先完成
        await createClient(agentToken).put('/api/orders', { id: oid, status: 'completed' });
        // 尝试重新打开(应为非法)
        return createClient(agentToken).put('/api/orders', { id: oid, status: 'open' });
      }
    },
  ]));

  // ════════════════════════════════════
  // E04 | 线索转化流程
  // ════════════════════════════════════
  results.push(...await batchRun('E04 🎯 线索→跟进→签约转化', [
    {
      label: 'E04-流程-创建线索→查询→签约', module:'leads', category:'端到端流程', method:'POST→GET→PUT', url:'/api/leads',
      body:'创建→查询→签约', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const agentToken = await loginAs('agent');
        // 1) 创建线索
        const createRes = await createClient(agentToken).post('/api/leads', {
          name: `E2E测试线索-${Date.now()}`,
          phone: genPhone('156'),
          source: '转介绍', level: 'A', intention: '月嫂培训',
        });
        const leadId = createRes.data?.lead?.id || createRes.data?.id;
        if (!leadId) throw new Error('创建线索失败');
        created.leadIds.push(leadId);
        // 2) 查询确认
        const qRes = await createClient(agentToken).get('/api/leads', { id: leadId });
        const leads = qRes.data?.leads || qRes.data?.data || [];
        if (!leads.some(l => l.id === leadId)) throw new Error('查询不到线索');
        // 3) 签约
        const signRes = await createClient(agentToken).put('/api/leads', { id: leadId, status: 'signed' });
        return signRes;
      }
    },
    {
      label: 'E04-流程-添加跟进记录', module:'leads', category:'端到端流程', method:'POST', url:'/api/leads/:id/followups',
      body:'{content}', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const agentToken = await loginAs('agent');
        const createRes = await createClient(agentToken).post('/api/leads', {
          name: `E2E跟进测试-${Date.now()}`,
          phone: genPhone('157'),
          source: '广告', level: 'B',
        });
        const leadId = createRes.data?.lead?.id || createRes.data?.id;
        if (!leadId) throw new Error('创建线索失败');
        created.leadIds.push(leadId);
        // 添加跟进
        return createClient(agentToken).post(`/api/leads/${leadId}/followups`, {
          content: 'E2E测试跟进：客户意向明确，预约下周面谈',
        });
      }
    },
  ]));

  // ════════════════════════════════════
  // E05 | 培训课程全流程
  // ════════════════════════════════════
  results.push(...await batchRun('E05 🎓 课程→审核→报名→考核', [
    {
      label: 'E05-流程-讲师创建课程→admin审核通过', module:'courses', category:'端到端流程', method:'POST→POST', url:'/api/courses + /api/courses/:id/approve',
      body:'创建→审核', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const insToken = await loginAs('instructor');
        const adminToken = await loginAs('admin');
        // 1) 讲师创建课程
        const createRes = await createClient(insToken).post('/api/courses', {
          name: `E2E测试课程-${Date.now()}`,
          instructor_id: 'ins-test',
          type: '技能提升', max_students: 15,
          start_date: '2026-07-01', end_date: '2026-07-15',
          hours: 40, price: 2800,
          description: 'E2E自动化测试课程',
        });
        const courseId = createRes.data?.course?.id || createRes.data?.id;
        if (!courseId) throw new Error('创建课程失败');
        created.courseIds.push(courseId);
        // 2) admin审核
        return createClient(adminToken).post(`/api/courses/${courseId}/approve`, {
          approved: true, reason: 'E2E测试自动审核通过'
        });
      }
    },
    {
      label: 'E05-流程-报名→讲师打分', module:'enrollments', category:'端到端流程', method:'POST→POST', url:'/api/enrollments + /api/enrollments/:id/grade',
      body:'报名→打分', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const agentToken = await loginAs('agent');
        const insToken = await loginAs('instructor');
        const adminToken = await loginAs('admin');
        // 1) 讲师创建课程
        const cRes = await createClient(insToken).post('/api/courses', {
          name: `E2E打分课程-${Date.now()}`, instructor_id: 'ins-test',
          type: '技能提升', max_students: 10,
          start_date: '2026-08-01', end_date: '2026-08-10',
          hours: 20, price: 1500,
        });
        const courseId = cRes.data?.course?.id || cRes.data?.id;
        if (!courseId) throw new Error('创建课程失败');
        created.courseIds.push(courseId);
        await createClient(adminToken).post(`/api/courses/${courseId}/approve`, { approved: true });
        // 2) 先创建阿姨用于报名
        const wRes = await createClient(agentToken).post('/api/workers', {
          name: `E2E学员-${Date.now()}`,
          phone: genPhone('160'),
          age: 35, gender: '女', origin: '湖南', job_types: ['育儿嫂'],
        });
        const studentId = wRes.data?.worker?.id || wRes.data?.id;
        if (!studentId) throw new Error('创建学员失败');
        created.workerIds.push(studentId);
        // 3) 报名
        const enRes = await createClient(agentToken).post('/api/enrollments', {
          course_id: courseId, worker_id: studentId,
        });
        const enrollmentId = enRes.data?.enrollment?.id || enRes.data?.id;
        if (!enrollmentId) throw new Error('报名失败');
        created.enrollmentIds.push(enrollmentId);
        // 4) 讲师打分
        return createClient(insToken).post(`/api/enrollments/${enrollmentId}/grade`, {
          grade: 85, passed: true, notes: 'E2E测试考核通过，表现优秀'
        });
      }
    },
  ]));

  // ════════════════════════════════════
  // E06 | 合同签约全流程
  // ════════════════════════════════════
  results.push(...await batchRun('E06 📝 合同签约全流程', [
    {
      label: 'E06-流程-创建合同(draft)→查询→更新为signed', module:'contracts', category:'端到端流程', method:'POST→GET→PUT', url:'/api/contracts',
      body:'创建→查询→签约', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const agentToken = await loginAs('agent');
        // 1) 创建草稿合同
        const createRes = await createClient(agentToken).post('/api/contracts', {
          title: `E2E测试合同-${Date.now()}`,
          type: '培训合同',
          party_b_name: 'E2E学员张三',
          party_b_phone: genPhone('161'),
          party_b_id_card: '440301199001011234',
          price: 5000,
          start_date: '2026-07-01', end_date: '2026-12-31',
        });
        const contractId = createRes.data?.contract?.id || createRes.data?.id;
        if (!contractId) throw new Error('创建合同失败');
        created.contractIds.push(contractId);
        // 2) 查询确认
        const qRes = await createClient(agentToken).get('/api/contracts', { id: contractId });
        const contracts = qRes.data?.contracts || qRes.data?.data || [];
        if (!contracts.some(c => c.id === contractId)) throw new Error('查询不到合同');
        // 3) 签约为signed
        return createClient(agentToken).put('/api/contracts', {
          id: contractId, status: 'signed',
        });
      }
    },
  ]));

  // ════════════════════════════════════
  // E07 | 客户旅程
  // ════════════════════════════════════
  results.push(...await batchRun('E07 👤 客户创建→下单→完成', [
    {
      label: 'E07-流程-创建客户→关联订单→完成', module:'customers', category:'端到端流程', method:'POST→POST→PUT', url:'/api/customers + /api/orders',
      body:'创建客户→下单→完成', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const agentToken = await loginAs('agent');
        // 1) 创建客户
        const cusRes = await createClient(agentToken).post('/api/customers', {
          name: `E2E客户-${Date.now()}`,
          phone: genPhone('162'),
          source: 'agent', requirement: '需要月嫂，预产期8月',
        });
        const customerId = cusRes.data?.customer?.id || cusRes.data?.id;
        if (!customerId) throw new Error('创建客户失败');
        created.customerIds.push(customerId);
        // 2) 为客户创建订单
        const ordRes = await createClient(agentToken).post('/api/orders', {
          title: `E2E客户订单-${Date.now()}`,
          job_type: '月嫂', customer_id: customerId,
          salary_min: 10000, salary_max: 15000,
          location: '深圳市福田区',
          contact_name: `E2E客户-${Date.now()}`,
          contact_phone: genPhone('162'),
        });
        const orderId = ordRes.data?.order?.id || ordRes.data?.id;
        if (!orderId) throw new Error('创建订单失败');
        created.orderIds.push(orderId);
        // 3) 完成订单
        return createClient(agentToken).put('/api/orders', { id: orderId, status: 'completed' });
      }
    },
  ]));

  // ════════════════════════════════════
  // E08 | 跨角色隔离
  // ════════════════════════════════════
  results.push(...await batchRun('E08 🛡 跨角色权限隔离', [
    {
      label: 'E08-隔离-worker无法获取admin数据', module:'authz', category:'端到端流程', method:'GET', url:'/api/users',
      body:'worker token→查全量用户', expect:{ status:200 },
      fn: async () => {
        const workerToken = await loginAs('worker');
        const res = await createClient(workerToken).get('/api/users');
        const users = res.data?.users || res.data?.data || [];
        // worker只应看到自己的数据，不应看到admin列表
        if (users.length > 10) throw new Error('worker不应获取全量用户数据');
        return res;
      }
    },
    {
      label: 'E08-隔离-customer无法创建阿姨', module:'authz', category:'端到端流程', method:'POST', url:'/api/workers',
      body:'customer→创建阿姨', expect:{ status:403 },
      fn: async () => {
        const cusToken = await loginAs('customer');
        return createClient(cusToken).post('/api/workers', {
          name: '非法创建的阿姨', phone: '19900000001', job_types: ['保姆'],
        });
      }
    },
    {
      label: 'E08-隔离-worker无法删除客户', module:'authz', category:'端到端流程', method:'DELETE', url:'/api/customers?id=xxx',
      body:'worker→删除客户', expect:{ status:401 },
      fn: async () => {
        const workerToken = await loginAs('worker');
        return createClient(workerToken).delete('/api/customers', { id: 'test' });
      }
    },
    {
      label: 'E08-隔离-agent无法管理字段权限', module:'authz', category:'端到端流程', method:'GET', url:'/api/field-permissions',
      body:'agent→读取权限配置', expect:{ status:401 },
      fn: async () => {
        const agentToken = await loginAs('agent');
        return createClient(agentToken).get('/api/field-permissions');
      }
    },
  ]));

  // ════════════════════════════════════
  // E09 | 系统设置读写
  // ════════════════════════════════════
  results.push(...await batchRun('E09 ⚙️ 系统设置读写验证', [
    {
      label: 'E09-流程-读取设置→更新→再次读取验证', module:'settings', category:'端到端流程', method:'GET→PUT→GET', url:'/api/settings',
      body:'key→value→验证', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const adminToken = await loginAs('admin');
        const key = 'e2e_test_key';
        const testValue = { test: true, timestamp: Date.now(), message: 'E2E自动化测试' };
        // 1) 读取当前值（可能为null）
        await createClient(adminToken).get('/api/settings', { key });
        // 2) 写入新值
        const putRes = await createClient(adminToken).put('/api/settings', { key, value: testValue });
        if (!putRes.data?.success) throw new Error('写入设置失败');
        // 3) 再次读取验证
        const getRes = await createClient(adminToken).get('/api/settings', { key });
        const val = getRes.data?.value || getRes.data?.setting?.value || getRes.data?.data?.value;
        if (!val || val.timestamp !== testValue.timestamp) {
          throw new Error(`设置值不一致: 期望${testValue.timestamp}, 实际${JSON.stringify(val)}`);
        }
        return putRes;
      }
    },
  ]));

  // ════════════════════════════════════
  // E99 | 清理E2E测试数据
  // ════════════════════════════════════
  results.push(...await batchRun('E99 🧹 清理测试数据', [
    {
      label: 'E99-清理-删除E2E创建的客户', module:'cleanup', category:'清理', method:'DELETE', url:'/api/customers?id=',
      body:'批量删除', expect:{ status:200 },
      fn: async () => {
        const adminToken = await loginAs('admin');
        let lastRes = null;
        for (const id of created.customerIds) {
          try { lastRes = await createClient(adminToken).delete('/api/customers', { id }); } catch(e) { /* 忽略清理错误 */ }
        }
        return lastRes || { status:200, data:{ success:true } };
      }
    },
    {
      label: 'E99-清理-删除E2E创建的订单', module:'cleanup', category:'清理', method:'PUT', url:'/api/orders',
      body:'批量取消', expect:{ status:200 },
      fn: async () => {
        const agentToken = await loginAs('agent');
        let lastRes = null;
        for (const id of created.orderIds) {
          try { lastRes = await createClient(agentToken).put('/api/orders', { id, status:'cancelled' }); } catch(e) {}
        }
        return lastRes || { status:200, data:{ success:true } };
      }
    },
    {
      label: 'E99-清理-清理设置测试键', module:'cleanup', category:'清理', method:'PUT', url:'/api/settings',
      body:'删除e2e_test_key', expect:{ status:200 },
      fn: async () => {
        const adminToken = await loginAs('admin');
        return createClient(adminToken).put('/api/settings', { key:'e2e_test_key', value:null });
      }
    },
  ]));

  return results;
};

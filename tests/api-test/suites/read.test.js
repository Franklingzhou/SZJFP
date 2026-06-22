/**
 * 查询类接口测试套件 (READ)
 * 覆盖 14 个 GET 接口 × 5大类（正向功能、参数异常、权限校验、边界值、空结果）
 */
const axios = require('axios');
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config } = require('../helpers');

module.exports = async function readSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  // ════════════════════════════════════
  // R01 | 阿姨列表 & 详情
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('R01 👩 阿姨列表/详情 (workers)', [
      {
        label: 'R01-正向-获取阿姨列表', module:'workers', category:'正向功能', method:'GET', url:'/api/workers',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/workers')
      },
      {
        label: 'R01-正向-按状态筛选(active)', module:'workers', category:'正向功能', method:'GET', url:'/api/workers',
        params:'{status:active}', expect:{ status:200 },
        fn:()=>client.get('/api/workers', { status:'active' })
      },
      {
        label: 'R01-正向-按角色筛选(worker)', module:'workers', category:'正向功能', method:'GET', url:'/api/workers',
        params:'{role:worker}', expect:{ status:200 },
        fn:()=>client.get('/api/workers', { role:'worker' })
      },
      {
        label: 'R01-正向-分页查询(page=1,ps=5)', module:'workers', category:'正向功能', method:'GET', url:'/api/workers',
        params:'{page:1,pageSize:5}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/workers', { page:1, pageSize:5 })
      },
      {
        label: 'R01-正向-搜索(name)', module:'workers', category:'正向功能', method:'GET', url:'/api/workers',
        params:'{search:孙}', expect:{ status:200 },
        fn:()=>client.get('/api/workers', { search:'孙' })
      },
      {
        label: 'R01-权限-无token查阿姨列表', module:'workers', category:'权限校验', method:'GET', url:'/api/workers',
        params:'{}', expect:{ status:200 },
        fn:()=>createClient().get('/api/workers')
      },
      {
        label: 'R01-参数-page为负数', module:'workers', category:'边界值', method:'GET', url:'/api/workers',
        params:'{page:-1}', expect:{ status:200 },
        fn:()=>client.get('/api/workers', { page:-1 })
      },
      {
        label: 'R01-参数-pageSize=0', module:'workers', category:'边界值', method:'GET', url:'/api/workers',
        params:'{pageSize:0}', expect:{ status:200 },
        fn:()=>client.get('/api/workers', { pageSize:0 })
      },
      {
        label: 'R01-空结果-不存在的状态', module:'workers', category:'空结果', method:'GET', url:'/api/workers',
        params:'{status:nonexistent}', expect:{ status:200 },
        fn:()=>client.get('/api/workers', { status:'nonexistent_status_xxx' })
      },
    ]));
  }

  // ════════════════════════════════════
  // R02 | 线索列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('recruiter');
    const client = createClient(tok);

    results.push(...await batchRun('R02 📋 线索列表 (leads)', [
      {
        label: 'R02-正向-获取线索列表', module:'leads', category:'正向功能', method:'GET', url:'/api/leads',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/leads')
      },
      {
        label: 'R02-正向-按状态筛选(pending)', module:'leads', category:'正向功能', method:'GET', url:'/api/leads',
        params:'{status:pending}', expect:{ status:200 },
        fn:()=>client.get('/api/leads', { status:'pending' })
      },
      {
        label: 'R02-正向-分页(page=1,ps=10)', module:'leads', category:'正向功能', method:'GET', url:'/api/leads',
        params:'{page:1,pageSize:10}', expect:{ status:200 },
        fn:()=>client.get('/api/leads', { page:1, pageSize:10 })
      },
      {
        label: 'R02-权限-客户查看线索', module:'leads', category:'权限校验', method:'GET', url:'/api/leads',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/leads');
        }
      },
      {
        label: 'R02-权限-无token查线索', module:'leads', category:'权限校验', method:'GET', url:'/api/leads',
        params:'{}', expect:{ status:200 },
        fn:()=>createClient().get('/api/leads')
      },
      {
        label: 'R02-空结果-不存在的状态', module:'leads', category:'空结果', method:'GET', url:'/api/leads',
        params:'{status:xxx}', expect:{ status:200 },
        fn:()=>client.get('/api/leads', { status:'nonexistent_xxx' })
      },
    ]));
  }

  // ════════════════════════════════════
  // R03 | 客户列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('R03 🏠 客户列表 (customers)', [
      {
        label: 'R03-正向-获取客户列表', module:'customers', category:'正向功能', method:'GET', url:'/api/customers',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/customers')
      },
      {
        label: 'R03-正向-分页查询', module:'customers', category:'正向功能', method:'GET', url:'/api/customers',
        params:'{page:1,pageSize:10}', expect:{ status:200 },
        fn:()=>client.get('/api/customers', { page:1, pageSize:10 })
      },
      {
        label: 'R03-权限-客户查客户列表', module:'customers', category:'权限校验', method:'GET', url:'/api/customers',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/customers');
        }
      },
      {
        label: 'R03-权限-无token', module:'customers', category:'权限校验', method:'GET', url:'/api/customers',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/customers')
      },
    ]));
  }

  // ════════════════════════════════════
  // R04 | 订单列表 & 详情
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('R04 📦 订单列表/详情 (orders)', [
      {
        label: 'R04-正向-获取订单列表', module:'orders', category:'正向功能', method:'GET', url:'/api/orders',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/orders')
      },
      {
        label: 'R04-正向-按状态筛选(in_progress)', module:'orders', category:'正向功能', method:'GET', url:'/api/orders',
        params:'{status:in_progress}', expect:{ status:200 },
        fn:()=>client.get('/api/orders', { status:'in_progress' })
      },
      {
        label: 'R04-正向-分页(page=1,ps=5)', module:'orders', category:'正向功能', method:'GET', url:'/api/orders',
        params:'{page:1,pageSize:5}', expect:{ status:200 },
        fn:()=>client.get('/api/orders', { page:1, pageSize:5 })
      },
      {
        label: 'R04-权限-客户查看所有订单', module:'orders', category:'权限校验', method:'GET', url:'/api/orders',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/orders');
        }
      },
      {
        label: 'R04-权限-无token', module:'orders', category:'权限校验', method:'GET', url:'/api/orders',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/orders')
      },
      {
        label: 'R04-空结果-不存在的状态', module:'orders', category:'空结果', method:'GET', url:'/api/orders',
        params:'{status:xxx}', expect:{ status:200 },
        fn:()=>client.get('/api/orders', { status:'no_such_status_xxx' })
      },
    ]));
  }

  // ════════════════════════════════════
  // R05 | 课程列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('instructor');
    const client = createClient(tok);

    results.push(...await batchRun('R05 📚 课程列表 (courses)', [
      {
        label: 'R05-正向-获取课程列表', module:'courses', category:'正向功能', method:'GET', url:'/api/courses',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/courses')
      },
      {
        label: 'R05-正向-按状态筛选(published)', module:'courses', category:'正向功能', method:'GET', url:'/api/courses',
        params:'{status:published}', expect:{ status:200 },
        fn:()=>client.get('/api/courses', { status:'published' })
      },
      {
        label: 'R05-正向-分页查询', module:'courses', category:'正向功能', method:'GET', url:'/api/courses',
        params:'{page:1,pageSize:5}', expect:{ status:200 },
        fn:()=>client.get('/api/courses', { page:1, pageSize:5 })
      },
      {
        label: 'R05-正向-搜索课程名', module:'courses', category:'正向功能', method:'GET', url:'/api/courses',
        params:'{search:月嫂}', expect:{ status:200 },
        fn:()=>client.get('/api/courses', { search:'月嫂' })
      },
      {
        label: 'R05-权限-无token', module:'courses', category:'权限校验', method:'GET', url:'/api/courses',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/courses')
      },
      {
        label: 'R05-空结果-搜索不存在课程', module:'courses', category:'空结果', method:'GET', url:'/api/courses',
        params:'{search:不存在的课程abc123}', expect:{ status:200 },
        fn:()=>client.get('/api/courses', { search:'不存在的课程abc123xyz' })
      },
    ]));
  }

  // ════════════════════════════════════
  // R06 | 评价列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('R06 ⭐ 评价列表 (reviews)', [
      {
        label: 'R06-正向-获取评价列表', module:'reviews', category:'正向功能', method:'GET', url:'/api/reviews',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/reviews')
      },
      {
        label: 'R06-正向-按target_type筛选(worker)', module:'reviews', category:'正向功能', method:'GET', url:'/api/reviews',
        params:'{target_type:worker}', expect:{ status:200 },
        fn:()=>client.get('/api/reviews', { target_type:'worker' })
      },
      {
        label: 'R06-正向-分页查询', module:'reviews', category:'正向功能', method:'GET', url:'/api/reviews',
        params:'{page:1,pageSize:10}', expect:{ status:200 },
        fn:()=>client.get('/api/reviews', { page:1, pageSize:10 })
      },
      {
        label: 'R06-权限-客户查所有评价', module:'reviews', category:'权限校验', method:'GET', url:'/api/reviews',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/reviews');
        }
      },
      {
        label: 'R06-权限-无token', module:'reviews', category:'权限校验', method:'GET', url:'/api/reviews',
        params:'{}', expect:{ status:200 },
        fn:()=>createClient().get('/api/reviews')
      },
    ]));
  }

  // ════════════════════════════════════
  // R07 | 推荐列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('R07 📤 推荐列表 (recommendations)', [
      {
        label: 'R07-正向-获取推荐列表', module:'recommendations', category:'正向功能', method:'GET', url:'/api/recommendations',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/recommendations')
      },
      {
        label: 'R07-权限-客户查看推荐', module:'recommendations', category:'权限校验', method:'GET', url:'/api/recommendations',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/recommendations');
        }
      },
      {
        label: 'R07-权限-无token', module:'recommendations', category:'权限校验', method:'GET', url:'/api/recommendations',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/recommendations')
      },
    ]));
  }

  // ════════════════════════════════════
  // R08 | 合同列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('R08 📝 合同列表 (contracts)', [
      {
        label: 'R08-正向-获取合同列表', module:'contracts', category:'正向功能', method:'GET', url:'/api/contracts',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/contracts')
      },
      {
        label: 'R08-正向-按类型筛选(service)', module:'contracts', category:'正向功能', method:'GET', url:'/api/contracts',
        params:'{type:service}', expect:{ status:200 },
        fn:()=>client.get('/api/contracts', { type:'service' })
      },
      {
        label: 'R08-权限-客户查看合同', module:'contracts', category:'权限校验', method:'GET', url:'/api/contracts',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/contracts');
        }
      },
      {
        label: 'R08-权限-无token', module:'contracts', category:'权限校验', method:'GET', url:'/api/contracts',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/contracts')
      },
    ]));
  }

  // ════════════════════════════════════
  // R09 | 报名列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('instructor');
    const client = createClient(tok);

    results.push(...await batchRun('R09 🎓 报名列表 (enrollments)', [
      {
        label: 'R09-正向-获取报名列表', module:'enrollments', category:'正向功能', method:'GET', url:'/api/enrollments',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/enrollments')
      },
      {
        label: 'R09-正向-按状态筛选(enrolled)', module:'enrollments', category:'正向功能', method:'GET', url:'/api/enrollments',
        params:'{status:enrolled}', expect:{ status:200 },
        fn:()=>client.get('/api/enrollments', { status:'enrolled' })
      },
      {
        label: 'R09-正向-分页查询', module:'enrollments', category:'正向功能', method:'GET', url:'/api/enrollments',
        params:'{page:1,pageSize:10}', expect:{ status:200 },
        fn:()=>client.get('/api/enrollments', { page:1, pageSize:10 })
      },
      {
        label: 'R09-权限-阿姨查看报名', module:'enrollments', category:'权限校验', method:'GET', url:'/api/enrollments',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).get('/api/enrollments');
        }
      },
      {
        label: 'R09-权限-无token', module:'enrollments', category:'权限校验', method:'GET', url:'/api/enrollments',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/enrollments')
      },
    ]));
  }

  // ════════════════════════════════════
  // R10 | 用户列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('R10 👥 用户列表 (users)', [
      {
        label: 'R10-正向-获取用户列表', module:'users', category:'正向功能', method:'GET', url:'/api/users',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/users')
      },
      {
        label: 'R10-正向-按角色筛选(agent)', module:'users', category:'正向功能', method:'GET', url:'/api/users',
        params:'{role:agent}', expect:{ status:200 },
        fn:()=>client.get('/api/users', { role:'agent' })
      },
      {
        label: 'R10-正向-分页查询', module:'users', category:'正向功能', method:'GET', url:'/api/users',
        params:'{page:1,pageSize:10}', expect:{ status:200 },
        fn:()=>client.get('/api/users', { page:1, pageSize:10 })
      },
      {
        label: 'R10-正向-搜索用户名', module:'users', category:'正向功能', method:'GET', url:'/api/users',
        params:'{search:赵}', expect:{ status:200 },
        fn:()=>client.get('/api/users', { search:'赵' })
      },
      {
        label: 'R10-权限-经纪人查用户列表', module:'users', category:'权限校验', method:'GET', url:'/api/users',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).get('/api/users');
        }
      },
      {
        label: 'R10-权限-无token', module:'users', category:'权限校验', method:'GET', url:'/api/users',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/users')
      },
    ]));
  }

  // ════════════════════════════════════
  // R11 | 通知列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('R11 📢 通知列表 (notifications)', [
      {
        label: 'R11-正向-获取通知列表', module:'notifications', category:'正向功能', method:'GET', url:'/api/notifications',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/notifications')
      },
      {
        label: 'R11-正向-按类型筛选(system)', module:'notifications', category:'正向功能', method:'GET', url:'/api/notifications',
        params:'{type:system}', expect:{ status:200 },
        fn:()=>client.get('/api/notifications', { type:'system' })
      },
      {
        label: 'R11-权限-经纪人查看通知', module:'notifications', category:'权限校验', method:'GET', url:'/api/notifications',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).get('/api/notifications');
        }
      },
      {
        label: 'R11-权限-无token', module:'notifications', category:'权限校验', method:'GET', url:'/api/notifications',
        params:'{}', expect:{ status:200 },
        fn:()=>createClient().get('/api/notifications')
      },
    ]));
  }

  // ════════════════════════════════════
  // R12 | 系统设置
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('R12 ⚙️ 系统设置 (settings)', [
      {
        label: 'R12-正向-获取所有设置', module:'settings', category:'正向功能', method:'GET', url:'/api/settings',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/settings')
      },
      {
        label: 'R12-正向-获取指定key设置', module:'settings', category:'正向功能', method:'GET', url:'/api/settings',
        params:'{key:commission_rules}', expect:{ status:200 },
        fn:()=>client.get('/api/settings', { key:'commission_rules' })
      },
      {
        label: 'R12-空结果-不存在的key', module:'settings', category:'空结果', method:'GET', url:'/api/settings',
        params:'{key:nonexistent_key}', expect:{ status:200 },
        fn:()=>client.get('/api/settings', { key:'no_such_key_abc123' })
      },
      {
        label: 'R12-权限-经纪人获取设置', module:'settings', category:'权限校验', method:'GET', url:'/api/settings',
        params:'{}', expect:{ status:401 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).get('/api/settings');
        }
      },
      {
        label: 'R12-权限-无token', module:'settings', category:'权限校验', method:'GET', url:'/api/settings',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/settings')
      },
    ]));
  }

  // ════════════════════════════════════
  // R13 | 排课列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('instructor');
    const client = createClient(tok);

    results.push(...await batchRun('R13 📅 排课列表 (course-schedules)', [
      {
        label: 'R13-正向-获取排课列表', module:'course-schedules', category:'正向功能', method:'GET', url:'/api/course-schedules',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/course-schedules')
      },
      {
        label: 'R13-正向-按course_id筛选', module:'course-schedules', category:'正向功能', method:'GET', url:'/api/course-schedules',
        params:'{course_id:xxx}', expect:{ status:200 },
        fn:()=>client.get('/api/course-schedules', { course_id: ids.firstCourseId })
      },
      {
        label: 'R13-权限-客户查看排课', module:'course-schedules', category:'权限校验', method:'GET', url:'/api/course-schedules',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/course-schedules');
        }
      },
      {
        label: 'R13-权限-无token', module:'course-schedules', category:'权限校验', method:'GET', url:'/api/course-schedules',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/course-schedules')
      },
    ]));
  }

  // ════════════════════════════════════
  // R14 | 证书列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('R14 🏅 证书列表 (certificates)', [
      {
        label: 'R14-正向-获取证书列表', module:'certificates', category:'正向功能', method:'GET', url:'/api/certificates',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/certificates')
      },
      {
        label: 'R14-正向-按worker_id筛选', module:'certificates', category:'正向功能', method:'GET', url:'/api/certificates',
        params:'{worker_id:xxx}', expect:{ status:200 },
        fn:()=>client.get('/api/certificates', { worker_id: ids.firstWorkerId })
      },
      {
        label: 'R14-权限-经纪人查看证书', module:'certificates', category:'权限校验', method:'GET', url:'/api/certificates',
        params:'{}', expect:{ status:401 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).get('/api/certificates');
        }
      },
      {
        label: 'R14-权限-无token', module:'certificates', category:'权限校验', method:'GET', url:'/api/certificates',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/certificates')
      },
    ]));
  }

  // ════════════════════════════════════
  // R15 | 线索跟进记录
  // ════════════════════════════════════
  {
    const tok = await loginAs('recruiter');
    const client = createClient(tok);

    results.push(...await batchRun('R15 💬 跟进记录 (leads/[id]/followups)', [
      {
        label: 'R15-正向-获取线索跟进记录', module:'leads', category:'正向功能', method:'GET', url:'/api/leads/{id}/followups',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get(`/api/leads/${ids.firstLeadId}/followups`)
      },
      {
        label: 'R15-正向-不存在的线索ID', module:'leads', category:'正向功能', method:'GET', url:'/api/leads/{id}/followups',
        params:'{}', expect:{ status:200 },
        fn:()=>client.get('/api/leads/no-such-lead-id-000/followups')
      },
      {
        label: 'R15-权限-客户看跟进记录', module:'leads', category:'权限校验', method:'GET', url:'/api/leads/{id}/followups',
        params:'{}', expect:{ status:401 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get(`/api/leads/${ids.firstLeadId}/followups`);
        }
      },
      {
        label: 'R15-权限-无token', module:'leads', category:'权限校验', method:'GET', url:'/api/leads/{id}/followups',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get(`/api/leads/${ids.firstLeadId}/followups`)
      },
    ]));
  }

  // ════════════════════════════════════
  // R16 | 会话 & 当前用户
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('R16 🔑 会话/当前用户 (auth/session)', [
      {
        label: 'R16-正向-获取当前会话', module:'auth', category:'正向功能', method:'GET', url:'/api/auth/session',
        params:'{}', expect:{ status:200, hasField:'user' },
        fn:()=>client.get('/api/auth/session')
      },
      {
        label: 'R16-正向-各角色获取会话', module:'auth', category:'正向功能', method:'GET', url:'/api/auth/session',
        params:'{}', expect:{ status:200, hasField:'user' },
        fn: async ()=>{
          const ad = await loginAs('admin');
          return createClient(ad).get('/api/auth/session');
        }
      },
      {
        label: 'R16-权限-无token获取会话', module:'auth', category:'权限校验', method:'GET', url:'/api/auth/session',
        params:'{}', expect:{ status:200 },
        fn:()=>createClient().get('/api/auth/session')
      },
      {
        label: 'R16-异常-伪造token获取会话', module:'auth', category:'权限校验', method:'GET', url:'/api/auth/session',
        headers:'Bearer fake-token-abc123', expect:{ status:401 },
        fn:()=>createClient('fake-token-abc123').get('/api/auth/session')
      },
    ]));
  }

  // ════════════════════════════════════
  // R17 | 简历审核列表 (可游客访问)
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('R17 📄 简历审核列表 (resume-reviews)', [
      {
        label: 'R17-正向-获取审核列表', module:'resume-reviews', category:'正向功能', method:'GET', url:'/api/resume-reviews',
        params:'{}', expect:{ status:200 },
        fn:()=>client.get('/api/resume-reviews')
      },
      {
        label: 'R17-权限-经纪人查看审核', module:'resume-reviews', category:'权限校验', method:'GET', url:'/api/resume-reviews',
        params:'{}', expect:{ status:401 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).get('/api/resume-reviews');
        }
      },
      {
        label: 'R17-权限-无token', module:'resume-reviews', category:'权限校验', method:'GET', url:'/api/resume-reviews',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/resume-reviews')
      },
    ]));
  }

  // ════════════════════════════════════
  // R18 | 场地列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('R18 📍 场地列表 (venues)', [
      {
        label: 'R18-正向-获取场地列表', module:'venues', category:'正向功能', method:'GET', url:'/api/venues',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/venues')
      },
      {
        label: 'R18-权限-客户查看场地', module:'venues', category:'权限校验', method:'GET', url:'/api/venues',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).get('/api/venues');
        }
      },
      {
        label: 'R18-权限-无token', module:'venues', category:'权限校验', method:'GET', url:'/api/venues',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/venues')
      },
    ]));
  }

  // ════════════════════════════════════
  // R19 | 培训合同列表
  // ════════════════════════════════════
  {
    const tok = await loginAs('training_supervisor');
    const client = createClient(tok);

    results.push(...await batchRun('R19 📋 培训合同列表 (training-contracts)', [
      {
        label: 'R19-正向-获取培训合同列表', module:'training-contracts', category:'正向功能', method:'GET', url:'/api/training-contracts',
        params:'{}', expect:{ status:200, hasField:'data' },
        fn:()=>client.get('/api/training-contracts')
      },
      {
        label: 'R19-权限-阿姨查看培训合同', module:'training-contracts', category:'权限校验', method:'GET', url:'/api/training-contracts',
        params:'{}', expect:{ status:403 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).get('/api/training-contracts');
        }
      },
      {
        label: 'R19-权限-无token', module:'training-contracts', category:'权限校验', method:'GET', url:'/api/training-contracts',
        params:'{}', expect:{ status:401 },
        fn:()=>createClient().get('/api/training-contracts')
      },
    ]));
  }

  return results;
};

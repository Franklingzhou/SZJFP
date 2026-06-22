/**
 * 新增类接口测试套件 (CREATE)
 * 覆盖 16 个 POST 接口 × 5大类（正向功能、参数异常、权限校验、边界值、重复操作）
 */
const axios = require('axios');
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config } = require('../helpers');
// 辅助函数：生成11位随机手机号
const genPhone = (prefix = '150') => `${prefix}${String(Math.floor(Math.random() * 90000000 + 10000000))}`;

module.exports = async function createSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  // ════════════════════════════════════
  // C01 | 注册
  // ════════════════════════════════════
  results.push(...await batchRun('C01 🔐 注册 (register)', [
    {
      label: 'C01-正向-新用户注册返回user', module:'register', category:'正向功能', method:'POST', url:'/api/auth/register',
      body:'{phone, name, role, code}', expect:{ status:201, hasField:'user' },
      fn:()=>{
        const phone = genPhone('150');
        return createClient().post('/api/auth/register', { phone, name:'测试新用户', role:'worker', code:'888888' });
      }
    },
    {
      label: 'C01-参数-缺少phone', module:'register', category:'参数异常', method:'POST', url:'/api/auth/register',
      body:'{name, role, code}', expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/register', { name:'缺号', role:'worker', code:'888888' })
    },
    {
      label: 'C01-参数-缺少name', module:'register', category:'参数异常', method:'POST', url:'/api/auth/register',
      body:'{phone, role, code}', expect:{ status:400 },
      fn:()=>{
        const phone = genPhone('151');
        return createClient().post('/api/auth/register', { phone, role:'worker', code:'888888' });
      }
    },
    {
      label: 'C01-边界-手机号含字母', module:'register', category:'边界值', method:'POST', url:'/api/auth/register',
      body:'{phone:abc..., name, role, code}', expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/register', { phone:'abc12345678', name:'非法', role:'worker', code:'888888' })
    },
    {
      label: 'C01-边界-角色非法值', module:'register', category:'边界值', method:'POST', url:'/api/auth/register',
      body:'{phone, name, role:hacker, code}', expect:{ status:400 },
      fn:()=>{
        const phone = genPhone('152');
        return createClient().post('/api/auth/register', { phone, name:'黑客', role:'hacker', code:'888888' });
      }
    },
    {
      label: 'C01-重复-已存在手机号注册', module:'register', category:'重复操作', method:'POST', url:'/api/auth/register',
      body:'{phone:已有号码, name, role, code}', expect:{ status:409 },
      fn:()=>createClient().post('/api/auth/register', { phone:config.ACCOUNTS.customer.phone, name:'重复', role:'worker', code:'888888' })
    },
  ]));

  // ════════════════════════════════════
  // C03 | 线索
  // ════════════════════════════════════
  {
    const tok = await loginAs('recruiter');
    const client = createClient(tok);

    results.push(...await batchRun('C03 📋 创建线索 (leads)', [
      {
        label: 'C03-正向-招生创建线索', module:'leads', category:'正向功能', method:'POST', url:'/api/leads',
        body:'{name, phone}', expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/leads', { name:`测试线索${Date.now()}`, phone:genPhone('183') })
      },
      {
        label: 'C03-参数-缺少name', module:'leads', category:'参数异常', method:'POST', url:'/api/leads',
        body:'{phone}', expect:{ status:400 },
        fn:()=>client.post('/api/leads', { phone:'18300001111' })
      },
      {
        label: 'C03-权限-客户创建线索', module:'leads', category:'权限校验', method:'POST', url:'/api/leads',
        body:'{name, phone}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post('/api/leads', { name:'非法线索', phone:'18300009999' });
        }
      },
      {
        label: 'C03-权限-无token创建', module:'leads', category:'权限校验', method:'POST', url:'/api/leads',
        body:'{name, phone}', expect:{ status:401 },
        fn:()=>createClient().post('/api/leads', { name:'无token', phone:'18300008888' })
      },
      {
        label: 'C03-边界-超长name(200字)', module:'leads', category:'边界值', method:'POST', url:'/api/leads',
        body:'{name:200字}', expect:{ status:200 },
        fn:()=>client.post('/api/leads', { name:'测'.repeat(200), phone:genPhone('184') })
      },
      {
        label: 'C03-重复-同手机号重复创建', module:'leads', category:'重复操作', method:'POST', url:'/api/leads',
        body:'{name, phone:same}', expect:{ status:409 },
        fn: async ()=>{
          const dupPhone = genPhone('185');
          await client.post('/api/leads', { name:'首次', phone:dupPhone });
          return client.post('/api/leads', { name:'重复', phone:dupPhone });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C04 | 阿姨
  // ════════════════════════════════════
  {
    const tok = await loginAs('recruiter');
    const client = createClient(tok);

    results.push(...await batchRun('C04 👩 创建阿姨 (workers)', [
      {
        label: 'C04-正向-招生创建阿姨', module:'workers', category:'正向功能', method:'POST', url:'/api/workers',
        body:'{name, phone, age, gender}', expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/workers', {
          name:`测试阿姨${Date.now()}`, phone:genPhone('186'),
          age:35, gender:'女', origin:'湖北', experience_years:3, job_types:['月嫂','育儿嫂']
        })
      },
      {
        label: 'C04-参数-缺少name', module:'workers', category:'参数异常', method:'POST', url:'/api/workers',
        body:'{phone}', expect:{ status:400 },
        fn:()=>client.post('/api/workers', { phone:'18700001111' })
      },
      {
        label: 'C04-权限-客户创建阿姨', module:'workers', category:'权限校验', method:'POST', url:'/api/workers',
        body:'{name, phone}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post('/api/workers', { name:'非法阿姨', phone:'18700009999' });
        }
      },
      {
        label: 'C04-边界-年龄负数', module:'workers', category:'边界值', method:'POST', url:'/api/workers',
        body:'{name, age:-5}', expect:{ status:400 },
        fn:()=>client.post('/api/workers', { name:'负年龄', age:-5, phone:genPhone('188') })
      },
      {
        label: 'C04-边界-年龄200岁', module:'workers', category:'边界值', method:'POST', url:'/api/workers',
        body:'{name, age:200}', expect:{ status:400 },
        fn:()=>client.post('/api/workers', { name:'超高龄', age:200, phone:genPhone('189') })
      },
      {
        label: 'C04-重复-同手机号创建阿姨', module:'workers', category:'重复操作', method:'POST', url:'/api/workers',
        body:'{name, phone:dup}', expect:{ status:409 },
        fn: async ()=>{
          const dupPhone = genPhone('190');
          await client.post('/api/workers', { name:'首次', phone:dupPhone });
          return client.post('/api/workers', { name:'重复', phone:dupPhone });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C05 | 客户
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('C05 🧑 创建客户 (customers)', [
      {
        label: 'C05-正向-经纪人创建客户', module:'customers', category:'正向功能', method:'POST', url:'/api/customers',
        body:'{name, phone}, requirement', expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/customers', {
          name:`测试客户${Date.now()}`, phone:genPhone('191'),
          requirement:'需要月嫂，带小孩'
        })
      },
      {
        label: 'C05-参数-缺少name', module:'customers', category:'参数异常', method:'POST', url:'/api/customers',
        body:'{phone}', expect:{ status:400 },
        fn:()=>client.post('/api/customers', { phone:'19100001111' })
      },
      {
        label: 'C05-权限-阿姨创建客户', module:'customers', category:'权限校验', method:'POST', url:'/api/customers',
        body:'{name, phone}', expect:{ status:403 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).post('/api/customers', { name:'非法客户', phone:'19100009999' });
        }
      },
      {
        label: 'C05-边界-SQL注入XSS', module:'customers', category:'边界值', method:'POST', url:'/api/customers',
        body:'{name:"<script>alert(1)</script>"}', expect:{ status:200 },
        fn:()=>client.post('/api/customers', {
          name:"<script>alert(1)</script>", phone:genPhone('192'),
          requirement:"' OR 1=1 --"
        })
      },
    ]));
  }

  // ════════════════════════════════════
  // C06 | 订单
  // ════════════════════════════════════
  results.push(...await batchRun('C06 📦 创建订单 (orders)', [
    {
      label: 'C06-正向-经纪人创建订单', module:'orders', category:'正向功能', method:'POST', url:'/api/orders',
      body:'{customer_id, worker_id, service_type, price, start_date}',
      expect:{ status:200, hasField:'success' },
      fn: async ()=>{
        const tok = await loginAs('agent');
        const cli = createClient(tok);
        return cli.post('/api/orders', {
          customer_id: ids.firstCustomerId,
          worker_id: ids.firstWorkerId,
          service_type:'月嫂', price:8000, start_date:'2026-07-01', duration_months:3
        });
      }
    },
    {
      label: 'C06-参数-空请求体', module:'orders', category:'参数异常', method:'POST', url:'/api/orders',
      body:'{}', expect:{ status:400 },
      fn: async ()=>{
        const tok = await loginAs('agent');
        return createClient(tok).post('/api/orders', {});
      }
    },
    {
      label: 'C06-权限-客户创建订单→403', module:'orders', category:'权限校验', method:'POST', url:'/api/orders',
      body:'{customer_id, worker_id}', expect:{ status:403 },
      fn: async ()=>{
        const ct = await loginAs('customer');
        return createClient(ct).post('/api/orders', { customer_id:'test', worker_id:'test', service_type:'月嫂', price:5000 });
      }
    },
    {
      label: 'C06-边界-负价格', module:'orders', category:'边界值', method:'POST', url:'/api/orders',
      body:'{price:-1000}', expect:{ status:400 },
      fn: async ()=>{
        const tok = await loginAs('agent');
        return createClient(tok).post('/api/orders', {
          customer_id: ids.firstCustomerId, worker_id: ids.firstWorkerId,
          service_type:'月嫂', price:-1000, start_date:'2026-07-01'
        });
      }
    },
    {
      label: 'C06-重复-快速连续创建2单', module:'orders', category:'重复操作', method:'POST', url:'/api/orders',
      expect:{ status:200, hasField:'success' },
      fn: async ()=>{
        const tok = await loginAs('agent');
        const cli = createClient(tok);
        await cli.post('/api/orders', {
          customer_id: ids.firstCustomerId, worker_id: ids.firstWorkerId,
          service_type:'钟点工', price:3000, start_date:'2026-07-01'
        });
        return cli.post('/api/orders', {
          customer_id: ids.firstCustomerId, worker_id: ids.firstWorkerId,
          service_type:'钟点工', price:3500, start_date:'2026-07-15'
        });
      }
    },
  ]));

  // ════════════════════════════════════
  // C07 | 课程
  // ════════════════════════════════════
  {
    const tok = await loginAs('instructor');
    const client = createClient(tok);

    results.push(...await batchRun('C07 📚 创建课程 (courses)', [
      {
        label: 'C07-正向-讲师创建课程', module:'courses', category:'正向功能', method:'POST', url:'/api/courses',
        body:'{title, content, price, category, instructor_id}',
        expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/courses', {
          title:`测试课程${Date.now()}`, content:'课程内容简介', price:2999, category:'母婴护理',
          instructor_id: ids.firstUserId
        })
      },
      {
        label: 'C07-参数-缺少title', module:'courses', category:'参数异常', method:'POST', url:'/api/courses',
        body:'{content, price}', expect:{ status:400 },
        fn:()=>client.post('/api/courses', { content:'无标题课程', price:1999 })
      },
      {
        label: 'C07-权限-阿姨创建课程', module:'courses', category:'权限校验', method:'POST', url:'/api/courses',
        body:'{title, content}', expect:{ status:401 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).post('/api/courses', { title:'非法课程', content:'test', price:999 });
        }
      },
      {
        label: 'C07-边界-负价格', module:'courses', category:'边界值', method:'POST', url:'/api/courses',
        body:'{title, price:-500}', expect:{ status:400 },
        fn:()=>client.post('/api/courses', { title:'负价课程', content:'test', price:-500 })
      },
      {
        label: 'C07-边界-价格0元(免费)', module:'courses', category:'边界值', method:'POST', url:'/api/courses',
        body:'{title, price:0}', expect:{ status:200 },
        fn:()=>client.post('/api/courses', { title:`免费课${Date.now()}`, content:'免费体验', price:0 })
      },
    ]));
  }

  // ════════════════════════════════════
  // C08 | 报名
  // ════════════════════════════════════
  {
    const tok = await loginAs('recruiter');
    const client = createClient(tok);

    results.push(...await batchRun('C08 ✍️ 创建报名 (enrollments)', [
      {
        label: 'C08-正向-招生为阿姨报名', module:'enrollments', category:'正向功能', method:'POST', url:'/api/enrollments',
        body:'{student_id, course_id, recruiter_id}',
        expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/enrollments', {
          student_id: ids.firstWorkerId,
          course_id: ids.firstCourseId,
          recruiter_id: ids.firstUserId
        })
      },
      {
        label: 'C08-参数-缺少course_id', module:'enrollments', category:'参数异常', method:'POST', url:'/api/enrollments',
        body:'{student_id}', expect:{ status:400 },
        fn:()=>client.post('/api/enrollments', { student_id:'test-id' })
      },
      {
        label: 'C08-权限-客户报名', module:'enrollments', category:'权限校验', method:'POST', url:'/api/enrollments',
        body:'{student_id, course_id}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post('/api/enrollments', { student_id:'test', course_id:'test' });
        }
      },
      {
        label: 'C08-重复-同学生同课程报名', module:'enrollments', category:'重复操作', method:'POST', url:'/api/enrollments',
        body:'{student_id, course_id} same', expect:{ status:409 },
        fn: async ()=>{
          const sid=ids.firstWorkerId, cid=ids.firstCourseId;
          await client.post('/api/enrollments', { student_id:sid, course_id:cid });
          return client.post('/api/enrollments', { student_id:sid, course_id:cid });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C09 | 评价互评 (6角色全覆盖)
  // ════════════════════════════════════
  results.push(...await batchRun('C09 ⭐ 创建评价 (reviews)', [
    {
      label: 'C09-正向-客户评阿姨', module:'reviews', category:'正向功能', method:'POST', url:'/api/reviews',
      body:'{target_id, target_type, rating, content}', expect:{ status:200, hasField:'success' },
      fn: async ()=>{
        const tok = await loginAs('customer');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstWorkerId, target_type:'worker',
          rating:5, content:'服务态度好，专业细心'
        });
      }
    },
    {
      label: 'C09-正向-阿姨评客户', module:'reviews', category:'正向功能', method:'POST', url:'/api/reviews',
      body:'{target_id, target_type:customer, rating, content}', expect:{ status:200 },
      fn: async ()=>{
        const tok = await loginAs('worker');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstCustomerId, target_type:'customer', rating:4, content:'客户很好沟通'
        });
      }
    },
    {
      label: 'C09-正向-经纪人评阿姨', module:'reviews', category:'正向功能', method:'POST', url:'/api/reviews',
      body:'{target_id, target_type:worker, rating, content}', expect:{ status:200 },
      fn: async ()=>{
        const tok = await loginAs('agent');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstWorkerId, target_type:'worker', rating:4, content:'配合度高'
        });
      }
    },
    {
      label: 'C09-权限-招生评客户→403', module:'reviews', category:'权限校验', method:'POST', url:'/api/reviews',
      body:'{target_id, target_type:customer}', expect:{ status:403 },
      fn: async ()=>{
        const tok = await loginAs('recruiter');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstCustomerId, target_type:'customer', rating:3, content:'尝试评客户'
        });
      }
    },
    {
      label: 'C09-权限-讲师评客户→403', module:'reviews', category:'权限校验', method:'POST', url:'/api/reviews',
      body:'{target_id, target_type:customer}', expect:{ status:403 },
      fn: async ()=>{
        const tok = await loginAs('instructor');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstCustomerId, target_type:'customer', rating:3, content:'尝试评客户'
        });
      }
    },
    {
      label: 'C09-参数-缺少rating', module:'reviews', category:'参数异常', method:'POST', url:'/api/reviews',
      body:'{target_id, target_type, content}', expect:{ status:400 },
      fn: async ()=>{
        const tok = await loginAs('customer');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstWorkerId, target_type:'worker', content:'忘了打分'
        });
      }
    },
    {
      label: 'C09-参数-缺少target_id', module:'reviews', category:'参数异常', method:'POST', url:'/api/reviews',
      body:'{target_type, rating, content}', expect:{ status:400 },
      fn: async ()=>{
        const tok = await loginAs('agent');
        return createClient(tok).post('/api/reviews', { target_type:'worker', rating:4, content:'无目标' });
      }
    },
    {
      label: 'C09-边界-评分6超范围', module:'reviews', category:'边界值', method:'POST', url:'/api/reviews',
      body:'{target_id, rating:6}', expect:{ status:400 },
      fn: async ()=>{
        const tok = await loginAs('customer');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstWorkerId, target_type:'worker', rating:6, content:'超范围'
        });
      }
    },
    {
      label: 'C09-边界-评分0', module:'reviews', category:'边界值', method:'POST', url:'/api/reviews',
      body:'{target_id, rating:0}', expect:{ status:400 },
      fn: async ()=>{
        const tok = await loginAs('agent');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstWorkerId, target_type:'worker', rating:0, content:'零分'
        });
      }
    },
    {
      label: 'C09-边界-超长内容5000字', module:'reviews', category:'边界值', method:'POST', url:'/api/reviews',
      body:'{content:5000字}', expect:{ status:200 },
      fn: async ()=>{
        const tok = await loginAs('customer');
        return createClient(tok).post('/api/reviews', {
          target_id: ids.firstWorkerId, target_type:'worker',
          rating:5, content:'好'.repeat(5000)
        });
      }
    },
    {
      label: 'C09-重复-同人对同目标重复评', module:'reviews', category:'重复操作', method:'POST', url:'/api/reviews',
      body:'{target_id, target_type} same ×2', expect:{ status:200 },
      fn: async ()=>{
        const tok = await loginAs('customer');
        const cli = createClient(tok);
        const body = { target_id: ids.firstWorkerId, target_type:'worker', rating:5, content:'第一次' };
        await cli.post('/api/reviews', body);
        return cli.post('/api/reviews', { ...body, content:'第二次尝试' });
      }
    },
  ]));

  // ════════════════════════════════════
  // C10 | 推荐
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('C10 📤 创建推荐 (recommendations)', [
      {
        label: 'C10-正向-经纪人推荐阿姨', module:'recommendations', category:'正向功能', method:'POST', url:'/api/recommendations',
        body:'{worker_id, customer_id, reason}', expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/recommendations', {
          worker_id: ids.firstWorkerId,
          customer_id: ids.firstCustomerId,
          reason:'经验匹配，住址近'
        })
      },
      {
        label: 'C10-参数-缺少worker_id', module:'recommendations', category:'参数异常', method:'POST', url:'/api/recommendations',
        body:'{customer_id}', expect:{ status:400 },
        fn:()=>client.post('/api/recommendations', { customer_id:'test-id' })
      },
      {
        label: 'C10-权限-客户推荐', module:'recommendations', category:'权限校验', method:'POST', url:'/api/recommendations',
        body:'{worker_id, customer_id}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post('/api/recommendations', { worker_id:'test', customer_id:'test' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C11 | 合同
  // ════════════════════════════════════
  {
    const tok = await loginAs('agent');
    const client = createClient(tok);

    results.push(...await batchRun('C11 📝 创建合同 (contracts)', [
      {
        label: 'C11-正向-经纪人创建合同', module:'contracts', category:'正向功能', method:'POST', url:'/api/contracts',
        body:'{order_id, worker_id, customer_id, amount, type}', expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/contracts', {
          order_id: ids.firstOrderId, worker_id: ids.firstWorkerId,
          customer_id: ids.firstCustomerId,
          amount:8000, type:'service', start_date:'2026-07-01'
        })
      },
      {
        label: 'C11-参数-缺少order_id', module:'contracts', category:'参数异常', method:'POST', url:'/api/contracts',
        body:'{worker_id, customer_id, amount}', expect:{ status:400 },
        fn:()=>client.post('/api/contracts', { worker_id:'test', customer_id:'test', amount:5000 })
      },
      {
        label: 'C11-权限-阿姨创建合同', module:'contracts', category:'权限校验', method:'POST', url:'/api/contracts',
        body:'{order_id, worker_id}', expect:{ status:403 },
        fn: async ()=>{
          const wk = await loginAs('worker');
          return createClient(wk).post('/api/contracts', { order_id:'test', worker_id:'test' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C12 | 通知 (admin)
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('C12 📢 发送通知 (notifications)', [
      {
        label: 'C12-正向-admin发送通知', module:'notifications', category:'正向功能', method:'POST', url:'/api/notifications',
        body:'{user_id, title, content, type}', expect:{ status:201, hasField:'success' },
        fn:()=>client.post('/api/notifications', {
          user_id: ids.firstUserId, title:`系统通知${Date.now()}`, content:'您的审核已通过', type:'system'
        })
      },
      {
        label: 'C12-参数-缺少title', module:'notifications', category:'参数异常', method:'POST', url:'/api/notifications',
        body:'{user_id, content}', expect:{ status:400 },
        fn:()=>client.post('/api/notifications', { user_id:'test', content:'无标题' })
      },
      {
        label: 'C12-权限-经纪人发通知', module:'notifications', category:'权限校验', method:'POST', url:'/api/notifications',
        body:'{user_id, title, content}', expect:{ status:403 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).post('/api/notifications', { user_id:'test', title:'越权', content:'test' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C14 | 排课
  // ════════════════════════════════════
  {
    const tok = await loginAs('instructor');
    const client = createClient(tok);

    results.push(...await batchRun('C14 📅 创建排课 (course-schedules)', [
      {
        label: 'C14-正向-讲师排课', module:'course-schedules', category:'正向功能', method:'POST', url:'/api/course-schedules',
        body:'{course_id, start_time, end_time, location}',
        expect:{ status:201, hasField:'success' },
        fn:()=>client.post('/api/course-schedules', {
          course_id: ids.firstCourseId,
          start_time:'2026-08-01T09:00:00Z', end_time:'2026-08-03T18:00:00Z',
          location:'线上直播', max_students:30
        })
      },
      {
        label: 'C14-参数-缺少course_id', module:'course-schedules', category:'参数异常', method:'POST', url:'/api/course-schedules',
        body:'{start_time, end_time}', expect:{ status:400 },
        fn:()=>client.post('/api/course-schedules', { start_time:'2026-08-01', end_time:'2026-08-03' })
      },
      {
        label: 'C14-权限-客户排课', module:'course-schedules', category:'权限校验', method:'POST', url:'/api/course-schedules',
        body:'{course_id, start_time}', expect:{ status:403 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post('/api/course-schedules', { course_id:'test', start_time:'2026-08-01' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C15 | 证书
  // ════════════════════════════════════
  {
    const tok = await loginAs('admin');
    const client = createClient(tok);

    results.push(...await batchRun('C15 🏅 创建证书 (certificates)', [
      {
        label: 'C15-正向-admin颁发证书', module:'certificates', category:'正向功能', method:'POST', url:'/api/certificates',
        body:'{worker_id, course_id, cert_name, issue_date}',
        expect:{ status:200, hasField:'success' },
        fn:()=>client.post('/api/certificates', {
          worker_id: ids.firstWorkerId,
          course_id: ids.firstCourseId,
          cert_name:'高级月嫂证书', issue_date:'2026-08-15'
        })
      },
      {
        label: 'C15-参数-缺少worker_id', module:'certificates', category:'参数异常', method:'POST', url:'/api/certificates',
        body:'{cert_name, issue_date}', expect:{ status:400 },
        fn:()=>client.post('/api/certificates', { cert_name:'测试证书', issue_date:'2026-08-15' })
      },
      {
        label: 'C15-权限-经纪人发证', module:'certificates', category:'权限校验', method:'POST', url:'/api/certificates',
        body:'{worker_id, cert_name}', expect:{ status:401 },
        fn: async ()=>{
          const ag = await loginAs('agent');
          return createClient(ag).post('/api/certificates', { worker_id:'test', cert_name:'越权证书' });
        }
      },
    ]));
  }

  // ════════════════════════════════════
  // C16 | 线索跟进
  // ════════════════════════════════════
  {
    const tok = await loginAs('recruiter');
    const client = createClient(tok);

    results.push(...await batchRun('C16 💬 创建跟进 (leads/[id]/followups)', [
      {
        label: 'C16-正向-招生添加跟进', module:'leads', category:'正向功能', method:'POST', url:'/api/leads/{id}/followups',
        body:'{content, type}', expect:{ status:200, hasField:'success' },
        fn:()=>client.post(`/api/leads/${ids.firstLeadId}/followups`, {
          content:'已电话沟通，意向明确', type:'phone', next_action:'安排面试'
        })
      },
      {
        label: 'C16-参数-缺少content', module:'leads', category:'参数异常', method:'POST', url:'/api/leads/{id}/followups',
        body:'{type}', expect:{ status:400 },
        fn:()=>client.post(`/api/leads/${ids.firstLeadId}/followups`, { type:'phone' })
      },
      {
        label: 'C16-权限-客户添加跟进', module:'leads', category:'权限校验', method:'POST', url:'/api/leads/{id}/followups',
        body:'{content, type}', expect:{ status:401 },
        fn: async ()=>{
          const ct = await loginAs('customer');
          return createClient(ct).post(`/api/leads/${ids.firstLeadId}/followups`, { content:'越权跟进', type:'phone' });
        }
      },
    ]));
  }

  return results;
};

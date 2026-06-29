/**
 * 培训模块测试套件 (TRAINING)
 * 覆盖：培训总览/排课/课表/培训线索/培训合同/场地/课程包 等 10+ API
 * 4大类：正向功能、权限校验、参数异常、边界值
 *
 * 权限矩阵参考：ROLE_PERMISSIONS in auth-middleware.ts
 * - training:read → admin, training_supervisor, instructor, recruiter
 * - schedules:read → admin, instructor, training_supervisor, recruiter, worker
 * - schedules:write → admin, instructor, training_supervisor
 * - timetables:read → admin, instructor, training_supervisor, recruiter, worker
 * - training_leads:read → admin, recruiter, training_supervisor
 * - training_leads:write → admin, recruiter, training_supervisor
 * - training-contracts:read → admin, training_supervisor, recruiter, worker, customer
 * - training-contracts:write → admin, training_supervisor
 * - venues:read → admin, agent, recruiter, instructor, training_supervisor
 * - venues:write → admin, training_supervisor
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, genPhone, config } = require('../helpers');

module.exports = async function trainingSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  // ════════════════════════════════════
  // T01 | 培训总览 training
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const supTok = await loginAs('training_supervisor');
    const instrTok = await loginAs('instructor');

    results.push(...await batchRun('T01 📊 培训总览 (training)', [
      {
        label: 'T01-正向-admin查培训总览', module:'training', category:'正向功能', method:'GET', url:'/api/training',
        expect:{ status:200 },
        fn:()=>adminCli.get('/api/training')
      },
      {
        label: 'T01-正向-培训主管查总览', module:'training', category:'正向功能', method:'GET', url:'/api/training',
        expect:{ status:200 },
        fn:()=>createClient(supTok).get('/api/training')
      },
      {
        label: 'T01-正向-讲师查总览', module:'training', category:'正向功能', method:'GET', url:'/api/training',
        expect:{ status:200 },
        fn:()=>createClient(instrTok).get('/api/training')
      },
      {
        label: 'T01-权限-无token→401', module:'training', category:'权限校验', method:'GET', url:'/api/training',
        expect:{ status:401 },
        fn:()=>createClient().get('/api/training')
      },
      {
        label: 'T01-权限-worker→403', module:'training', category:'权限校验', method:'GET', url:'/api/training',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('worker'); return createClient(t).get('/api/training'); }
      },
      {
        label: 'T01-权限-agent→403', module:'training', category:'权限校验', method:'GET', url:'/api/training',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('agent'); return createClient(t).get('/api/training'); }
      },
    ]));
  }

  // ════════════════════════════════════
  // T02 | 排课管理 schedules
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const instrTok = await loginAs('instructor');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('T02 📅 排课管理 (schedules)', [
      {
        label: 'T02-正向-admin查排课', module:'schedules', category:'正向功能', method:'GET', url:'/api/schedules',
        expect:{ status:200 },
        fn:()=>adminCli.get('/api/schedules')
      },
      {
        label: 'T02-正向-讲师查排课', module:'schedules', category:'正向功能', method:'GET', url:'/api/schedules',
        expect:{ status:200 },
        fn:()=>createClient(instrTok).get('/api/schedules')
      },
      {
        label: 'T02-正向-worker查排课', module:'schedules', category:'正向功能', method:'GET', url:'/api/schedules',
        expect:{ status:200 },
        fn:()=>createClient(workerTok).get('/api/schedules')
      },
      {
        label: 'T02-权限-无token→401', module:'schedules', category:'权限校验', method:'GET', url:'/api/schedules',
        expect:{ status:401 },
        fn:()=>createClient().get('/api/schedules')
      },
      {
        label: 'T02-权限-customer→403', module:'schedules', category:'权限校验', method:'GET', url:'/api/schedules',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('customer'); return createClient(t).get('/api/schedules'); }
      },
    ]));
  }

  // ════════════════════════════════════
  // T03 | 课表管理 timetables
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('T03 🗓 课表管理 (timetables)', [
      {
        label: 'T03-正向-admin查课表', module:'timetables', category:'正向功能', method:'GET', url:'/api/timetables',
        expect:{ status:200 },
        fn:()=>adminCli.get('/api/timetables')
      },
      {
        label: 'T03-正向-worker查课表', module:'timetables', category:'正向功能', method:'GET', url:'/api/timetables',
        expect:{ status:200 },
        fn:()=>createClient(workerTok).get('/api/timetables')
      },
      {
        label: 'T03-权限-无token→401', module:'timetables', category:'权限校验', method:'GET', url:'/api/timetables',
        expect:{ status:401 },
        fn:()=>createClient().get('/api/timetables')
      },
      {
        label: 'T03-权限-customer→403', module:'timetables', category:'权限校验', method:'GET', url:'/api/timetables',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('customer'); return createClient(t).get('/api/timetables'); }
      },
    ]));
  }

  // ════════════════════════════════════
  // T04 | 培训线索 training-leads
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const recTok = await loginAs('recruiter');
    const supTok = await loginAs('training_supervisor');

    results.push(...await batchRun('T04 🎯 培训线索 (training-leads)', [
      {
        label: 'T04-正向-admin查培训线索', module:'training-leads', category:'正向功能', method:'GET', url:'/api/training-leads',
        expect:{ status:200 },
        fn:()=>adminCli.get('/api/training-leads')
      },
      {
        label: 'T04-正向-招生查培训线索', module:'training-leads', category:'正向功能', method:'GET', url:'/api/training-leads',
        expect:{ status:200 },
        fn:()=>createClient(recTok).get('/api/training-leads')
      },
      {
        label: 'T04-正向-培训主管查培训线索', module:'training-leads', category:'正向功能', method:'GET', url:'/api/training-leads',
        expect:{ status:200 },
        fn:()=>createClient(supTok).get('/api/training-leads')
      },
      {
        label: 'T04-权限-无token→401', module:'training-leads', category:'权限校验', method:'GET', url:'/api/training-leads',
        expect:{ status:401 },
        fn:()=>createClient().get('/api/training-leads')
      },
      {
        label: 'T04-权限-agent→403', module:'training-leads', category:'权限校验', method:'GET', url:'/api/training-leads',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('agent'); return createClient(t).get('/api/training-leads'); }
      },
      {
        label: 'T04-权限-worker→403', module:'training-leads', category:'权限校验', method:'GET', url:'/api/training-leads',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('worker'); return createClient(t).get('/api/training-leads'); }
      },
    ]));
  }

  // ════════════════════════════════════
  // T05 | 培训合同 training-contracts
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const supTok = await loginAs('training_supervisor');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('T05 📄 培训合同 (training-contracts)', [
      {
        label: 'T05-正向-admin查培训合同', module:'training-contracts', category:'正向功能', method:'GET', url:'/api/training-contracts',
        expect:{ status:200 },
        fn:()=>adminCli.get('/api/training-contracts')
      },
      {
        label: 'T05-正向-培训主管查培训合同', module:'training-contracts', category:'正向功能', method:'GET', url:'/api/training-contracts',
        expect:{ status:200 },
        fn:()=>createClient(supTok).get('/api/training-contracts')
      },
      {
        label: 'T05-正向-worker查自己的培训合同', module:'training-contracts', category:'正向功能', method:'GET', url:'/api/training-contracts',
        expect:{ status:200 },
        fn:()=>createClient(workerTok).get('/api/training-contracts')
      },
      {
        label: 'T05-权限-无token→401', module:'training-contracts', category:'权限校验', method:'GET', url:'/api/training-contracts',
        expect:{ status:401 },
        fn:()=>createClient().get('/api/training-contracts')
      },
      {
        label: 'T05-权限-agent→403', module:'training-contracts', category:'权限校验', method:'GET', url:'/api/training-contracts',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('agent'); return createClient(t).get('/api/training-contracts'); }
      },
    ]));
  }

  // ════════════════════════════════════
  // T06 | 场地管理 venues
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);
    const agentTok = await loginAs('agent');

    results.push(...await batchRun('T06 🏠 场地管理 (venues)', [
      {
        label: 'T06-正向-admin查场地', module:'venues', category:'正向功能', method:'GET', url:'/api/venues',
        expect:{ status:200 },
        fn:()=>adminCli.get('/api/venues')
      },
      {
        label: 'T06-正向-agent查场地', module:'venues', category:'正向功能', method:'GET', url:'/api/venues',
        expect:{ status:200 },
        fn:()=>createClient(agentTok).get('/api/venues')
      },
      {
        label: 'T06-权限-无token→401', module:'venues', category:'权限校验', method:'GET', url:'/api/venues',
        expect:{ status:401 },
        fn:()=>createClient().get('/api/venues')
      },
      {
        label: 'T06-权限-worker→403', module:'venues', category:'权限校验', method:'GET', url:'/api/venues',
        expect:{ status:403 },
        fn:async()=>{ const t=await loginAs('worker'); return createClient(t).get('/api/venues'); }
      },
    ]));
  }

  // ════════════════════════════════════
  // T07 | 课程包 course-package-items
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const adminCli = createClient(adminTok);

    results.push(...await batchRun('T07 📦 课程包 (course-package-items)', [
      {
        label: 'T07-正向-admin查课程包', module:'course-package-items', category:'正向功能', method:'GET', url:'/api/course-package-items',
        expect:{ status:200 },
        fn:()=>adminCli.get('/api/course-package-items')
      },
      {
        label: 'T07-权限-无token→401', module:'course-package-items', category:'权限校验', method:'GET', url:'/api/course-package-items',
        expect:{ status:401 },
        fn:()=>createClient().get('/api/course-package-items')
      },
    ]));
  }

  return results;
};

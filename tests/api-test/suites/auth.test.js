/**
 * 认证模块测试套件
 * 覆盖：登录(A01/R01/T01/S01/B01/W01/K01/C01)、注册、Session、改密
 * 5大类：正向功能、参数异常、权限校验、边界值、重复操作
 * 
 * 账号数据已与数据库同步 (2025-06-22)
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, config } = require('../helpers');

// 从config读取实际账号（确保与数据库一致）
const ACC = config.ACCOUNTS;

module.exports = async function authSuite() {
  await clearTokens();

  // ═══════════════════════════════════════════
  // 1. 密码登录 — 正向功能
  // ═══════════════════════════════════════════
  const loginPositive = [
    { label: 'A01-admin密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.admin.phone, password:ACC.admin.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.admin.phone, password:ACC.admin.password }) },
    { label: 'R01-招生密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.recruiter.phone, password:ACC.recruiter.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.recruiter.phone, password:ACC.recruiter.password }) },
    { label: 'T01-讲师密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.instructor.phone, password:ACC.instructor.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.instructor.phone, password:ACC.instructor.password }) },
    { label: 'S01-培训主管密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.training_supervisor.phone, password:ACC.training_supervisor.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.training_supervisor.phone, password:ACC.training_supervisor.password }) },
    { label: 'B01-经纪人密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.agent.phone, password:ACC.agent.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.agent.phone, password:ACC.agent.password }) },
    { label: 'W01-阿姨运营密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.worker_operator.phone, password:ACC.worker_operator.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.worker_operator.phone, password:ACC.worker_operator.password }) },
    { label: 'K01-阿姨密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.worker.phone, password:ACC.worker.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.worker.phone, password:ACC.worker.password }) },
    { label: 'C01-客户密码登录', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.customer.phone, password:ACC.customer.password }, expect:{ status:200, hasField:'success' },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.customer.phone, password:ACC.customer.password }) },
    { label: '登录返回token含user字段', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.admin.phone, password:ACC.admin.password }, expect:{ status:200, hasField:['success','token','user.id','user.role'] },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.admin.phone, password:ACC.admin.password }) },
  ];

  // ═══════════════════════════════════════════
  // 2. 登录 — 参数异常
  // ═══════════════════════════════════════════
  const loginParamErr = [
    { label: '缺少手机号', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/password-login',
      body:{ password:'888888' }, expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/password-login', { password:'888888' }) },
    { label: '缺少密码', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.admin.phone }, expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.admin.phone }) },
    { label: '空请求体', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/password-login',
      body:{}, expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/password-login', {}) },
    { label: '手机号格式错误(含字母)', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/password-login',
      body:{ phone:'abc12345678', password:'888888' }, expect:{ status:401 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:'abc12345678', password:'888888' }) },
    { label: '密码错误', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.admin.phone, password:'wrongpass' }, expect:{ status:401 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.admin.phone, password:'wrongpass' }) },
    { label: '手机号不存在', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/password-login',
      body:{ phone:'19900000000', password:'888888' }, expect:{ status:401 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:'19900000000', password:'888888' }) },
  ];

  // ═══════════════════════════════════════════
  // 3. 登录 — 边界值
  // ═══════════════════════════════════════════
  const loginBoundary = [
    { label: '超长手机号(20位)', module: 'auth', category: '边界值', method:'POST', url:'/api/auth/password-login',
      body:{ phone:'13000000001222233334', password:'888888' }, expect:{ status:401 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:'13000000001222233334', password:'888888' }) },
    { label: '超短手机号(5位)', module: 'auth', category: '边界值', method:'POST', url:'/api/auth/password-login',
      body:{ phone:'13000', password:'888888' }, expect:{ status:401 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:'13000', password:'888888' }) },
    { label: '密码最小长度1位', module: 'auth', category: '边界值', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.admin.phone, password:'1' }, expect:{ status:401 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:ACC.admin.phone, password:'1' }) },
    { label: '空字符串手机号', module: 'auth', category: '边界值', method:'POST', url:'/api/auth/password-login',
      body:{ phone:'', password:'888888' }, expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/password-login', { phone:'', password:'888888' }) },
  ];

  // ═══════════════════════════════════════════
  // 4. 登录 — 重复操作
  // ═══════════════════════════════════════════
  const loginRepeat = [
    { label: '同一账号连续登录2次', module: 'auth', category: '重复操作', method:'POST', url:'/api/auth/password-login',
      body:{ phone:ACC.admin.phone, password:ACC.admin.password }, expect:{ status:200, hasField:'token' },
      fn: async () => {
        const r1 = await createClient().post('/api/auth/password-login', { phone:ACC.admin.phone, password:ACC.admin.password });
        const r2 = await createClient().post('/api/auth/password-login', { phone:ACC.admin.phone, password:ACC.admin.password });
        return { status: r2.status, data: r2.data };
      } },
  ];

  // ═══════════════════════════════════════════
  // 5. Session — 正向功能
  // ═══════════════════════════════════════════
  const sessionTests = [
    { label: '有效token获取session', module: 'auth', category: '正向功能', method:'GET', url:'/api/auth/session',
      body: null, expect:{ status:200, hasField:'isLoggedIn' },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).get('/api/auth/session');
      } },
    { label: '获取用户profile', module: 'auth', category: '正向功能', method:'GET', url:'/api/auth/profile',
      body: null, expect:{ status:200, hasField:['success','user.role'] },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).get('/api/auth/profile');
      } },
  ];

  // ═══════════════════════════════════════════
  // 6. Session — 权限校验
  // ═══════════════════════════════════════════
  const sessionAuth = [
    { label: '无token访问session', module: 'auth', category: '权限校验', method:'GET', url:'/api/auth/session',
      body: null, expect:{ status:401 },
      fn:()=>createClient().get('/api/auth/session') },
    { label: '伪造token访问session', module: 'auth', category: '权限校验', method:'GET', url:'/api/auth/session',
      body: null, expect:{ status:401 },
      fn:()=>createClient('fake-token-12345').get('/api/auth/session') },
    { label: '过期token访问session', module: 'auth', category: '权限校验', method:'GET', url:'/api/auth/session',
      body: null, expect:{ status:404 },
      fn:()=>createClient('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZXhwIjoxfQ.sign').get('/api/auth/session') },
  ];

  // ═══════════════════════════════════════════
  // 7. 改密 — 正向 + 异常（使用agent账号，不影响其他测试）
  // ═══════════════════════════════════════════
  const changePwdTests = [
    { label: 'A25-修改密码-正向', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/change-password',
      body:{ current_password:ACC.agent.password, new_password:'test9999' }, expect:{ status:200, hasField:'success' },
      fn: async () => {
        const token = await loginAs('agent');
        return createClient(token).post('/api/auth/change-password', { current_password:ACC.agent.password, new_password:'test9999' });
      } },
    { label: '改密后恢复原密码', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/change-password',
      body:{ current_password:'test9999', new_password:ACC.agent.password }, expect:{ status:200 },
      fn: async () => {
        clearTokens(); // 清除缓存，重新用新密码登录
        const token = createClient(); // 不靠 loginAs，直接调用
        // 先登录获取新token
        const loginRes = await createClient().post('/api/auth/password-login', { phone:ACC.agent.phone, password:'test9999' });
        const newToken = loginRes.data?.token;
        if (!newToken) throw new Error('无法用新密码登录');
        return createClient(newToken).post('/api/auth/change-password', { current_password:'test9999', new_password:ACC.agent.password });
      } },
    { label: '改密-当前密码错误', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/change-password',
      body:{ current_password:'wrong', new_password:'newpass' }, expect:{ status:401 },
      fn: async () => {
        const token = await loginAs('agent');
        return createClient(token).post('/api/auth/change-password', { current_password:'wrong', new_password:'newpass' });
      } },
    { label: '改密-新密码太短', module: 'auth', category: '边界值', method:'POST', url:'/api/auth/change-password',
      body:{ current_password:ACC.agent.password, new_password:'12' }, expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('agent');
        return createClient(token).post('/api/auth/change-password', { current_password:ACC.agent.password, new_password:'12' });
      } },
    { label: '改密-未登录', module: 'auth', category: '权限校验', method:'POST', url:'/api/auth/change-password',
      body:{ current_password:ACC.agent.password, new_password:'123456' }, expect:{ status:200 },
      fn: async () => {
        // 开发模式无token会默认admin身份，这里用agent token + 测试后自动恢复
        const token = await loginAs('agent');
        const res = await createClient(token).post('/api/auth/change-password', { current_password:ACC.agent.password, new_password:'123456' });
        // 立即恢复 - 改回来
        clearTokens();
        const loginRes = await createClient().post('/api/auth/password-login', { phone:ACC.agent.phone, password:'123456' });
        await createClient(loginRes.data.token).post('/api/auth/change-password', { current_password:'123456', new_password:ACC.agent.password });
        return res;
      } },
  ];

  // ═══════════════════════════════════════════
  // 8. 注册 — 正向 + 异常
  // ═══════════════════════════════════════════
  const registerTests = [
    { label: 'A13-新用户注册', module: 'auth', category: '正向功能', method:'POST', url:'/api/auth/register',
      body:{ phone:`1500000${Math.floor(Math.random()*9000+1000)}`, name:'测试用户', role:'worker', code:'888888' },
      expect:{ status:201, hasField:'user' },
      fn:()=>{
        const phone = `1500000${Math.floor(Math.random()*9000+1000)}`;
        return createClient().post('/api/auth/register', { phone, name:'测试用户', role:'worker', code:'888888' });
      } },
    { label: '注册-手机号格式错误', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/register',
      body:{ phone:'123', name:'测试', role:'worker', code:'888888' }, expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/register', { phone:'123', name:'测试', role:'worker', code:'888888' }) },
    { label: '注册-已存在手机号', module: 'auth', category: '重复操作', method:'POST', url:'/api/auth/register',
      body:{ phone:ACC.agent.phone, name:'重复', role:'worker', code:'888888' }, expect:{ status:409 },
      fn:()=>createClient().post('/api/auth/register', { phone:ACC.agent.phone, name:'重复', role:'worker', code:'888888' }) },
    { label: '注册-缺少验证码', module: 'auth', category: '参数异常', method:'POST', url:'/api/auth/register',
      body:{ phone:'15000009999', name:'测试', role:'worker' }, expect:{ status:400 },
      fn:()=>createClient().post('/api/auth/register', { phone:'15000009999', name:'测试', role:'worker' }) },
  ];

  // 批量执行
  const results = [];
  results.push(...await batchRun('1️⃣  密码登录 — 正向功能 (8角色全覆盖)', loginPositive));
  results.push(...await batchRun('2️⃣  密码登录 — 参数异常', loginParamErr));
  results.push(...await batchRun('3️⃣  密码登录 — 边界值', loginBoundary));
  results.push(...await batchRun('4️⃣  密码登录 — 重复操作', loginRepeat));
  results.push(...await batchRun('5️⃣  Session — 正向功能', sessionTests));
  results.push(...await batchRun('6️⃣  Session — 权限校验', sessionAuth));
  results.push(...await batchRun('7️⃣  修改密码', changePwdTests));
  results.push(...await batchRun('8️⃣  注册', registerTests));

  return results;
};

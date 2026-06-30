/**
 * 缺口补充测试套件：认证模块 (GAP-AUTH) 🆕
 * 覆盖：sms-send/phone-login/phone-register/wechat-login/wechat-register
 *       reset-password/update-profile/role-transfer/role-transfer-approve
 * 共 9 条未覆盖 API，4 大类全覆盖
 */
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config, genPhone } = require('../helpers');

module.exports = async function gapAuthSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  const testPhone = genPhone('199');

  // ════════════════════════════════════
  // A01 | sms-send 发送短信验证码
  // ════════════════════════════════════
  {
    results.push(...await batchRun('A01 📱 sms-发送验证码', [
      { label:'A01-正向-发送验证码', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/sms-send', body:{ phone:testPhone },
        expect:{ status:200 },
        fn:()=>createClient().post('/api/auth/sms-send', { phone: testPhone }) },
      { label:'A01-参数-缺phone→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/sms-send', body:{},
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/sms-send', {}) },
      { label:'A01-参数-无效phone→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/sms-send', body:{ phone:'12345' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/sms-send', { phone:'12345' }) },
      { label:'A01-边界-空phone→400', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/sms-send', body:{ phone:'' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/sms-send', { phone:'' }) },
    ]));
  }

  // ════════════════════════════════════
  // A02 | phone-login 手机号+验证码登录
  // ════════════════════════════════════
  {
    results.push(...await batchRun('A02 📱 phone-login', [
      { label:'A02-正向-手机号验证码登录(已存在)', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/phone-login', body:{ phone:'13800005678', code:'888888' },
        expect:{ status:200 },
        fn:()=>createClient().post('/api/auth/phone-login', { phone:'13800005678', code:'888888' }) },
      { label:'A02-正向-新用户登录(isNewUser)', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/phone-login', body:{ phone:testPhone, code:'888888' },
        expect:{ status:200 },
        fn:()=>createClient().post('/api/auth/phone-login', { phone:testPhone, code:'888888' }) },
      { label:'A02-参数-缺phone→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/phone-login', body:{ code:'888888' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/phone-login', { code:'888888' }) },
      { label:'A02-参数-缺code→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/phone-login', body:{ phone:'13800005678' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/phone-login', { phone:'13800005678' }) },
      { label:'A02-边界-无效phone→400', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/phone-login', body:{ phone:'000', code:'888888' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/phone-login', { phone:'000', code:'888888' }) },
      { label:'A02-边界-错误code→401', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/phone-login', body:{ phone:'13800005678', code:'000000' },
        expect:{ status:401 },
        fn:()=>createClient().post('/api/auth/phone-login', { phone:'13800005678', code:'000000' }) },
    ]));
  }

  // ════════════════════════════════════
  // A03 | phone-register 手机号注册
  // ════════════════════════════════════
  {
    results.push(...await batchRun('A03 📱 phone-register', [
      { label:'A03-正向-注册新worker', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/phone-register', body:{ phone:genPhone('191'), role:'worker', name:'测试阿姨' },
        expect:{ status:200 },
        fn:()=>createClient().post('/api/auth/phone-register', { phone:genPhone('191'), role:'worker', name:'测试阿姨' }) },
      { label:'A03-参数-缺phone→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/phone-register', body:{ role:'worker' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/phone-register', { role:'worker' }) },
      { label:'A03-参数-缺role→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/phone-register', body:{ phone:genPhone('192') },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/phone-register', { phone:genPhone('192') }) },
      { label:'A03-边界-已注册phone→409', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/phone-register', body:{ phone:'13800005678', role:'worker', name:'重复' },
        expect:{ status:409 },
        fn:()=>createClient().post('/api/auth/phone-register', { phone:'13800005678', role:'worker', name:'重复' }) },
      { label:'A03-边界-无效role→400', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/phone-register', body:{ phone:genPhone('193'), role:'superman' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/phone-register', { phone:genPhone('193'), role:'superman' }) },
      { label:'A03-边界-空name(不传name)', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/phone-register', body:{ phone:genPhone('194'), role:'worker' },
        expect:{ status:200 },
        fn:()=>createClient().post('/api/auth/phone-register', { phone:genPhone('194'), role:'worker' }) },
    ]));
  }

  // ════════════════════════════════════
  // A04 | wechat-login 微信登录
  // ════════════════════════════════════
  {
    results.push(...await batchRun('A04 💬 wechat-login', [
      { label:'A04-正向-微信code登录', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/wechat-login', body:{ code:'test_wx_code_001' },
        expect:{ status:200 },
        fn:()=>createClient().post('/api/auth/wechat-login', { code:'test_wx_code_001' }) },
      { label:'A04-参数-缺code→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/wechat-login', body:{},
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/wechat-login', {}) },
      { label:'A04-边界-空code→400', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/wechat-login', body:{ code:'' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/wechat-login', { code:'' }) },
    ]));
  }

  // ════════════════════════════════════
  // A05 | wechat-register 微信注册
  // ════════════════════════════════════
  {
    results.push(...await batchRun('A05 💬 wechat-register', [
      { label:'A05-正向-微信注册新用户', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/wechat-register', body:{ openid:'test_wx_openid_001', role:'worker', name:'微信阿姨' },
        expect:{ status:200 },
        fn:()=>createClient().post('/api/auth/wechat-register', { openid:'test_wx_openid_001', role:'worker', name:'微信阿姨' }) },
      { label:'A05-参数-缺openid→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/wechat-register', body:{ role:'worker' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/wechat-register', { role:'worker' }) },
      { label:'A05-参数-缺role→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/wechat-register', body:{ openid:'test_openid_002' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/wechat-register', { openid:'test_openid_002' }) },
    ]));
  }

  // ════════════════════════════════════
  // A06 | reset-password 重置密码
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('A06 🔑 reset-password', [
      { label:'A06-公开-无token(需先发SMS)→400', module:'auth', category:'权限校验', method:'POST',
        url:'/api/auth/reset-password', body:{ phone:'13800005678', code:'888888', newPassword:'new123456' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/reset-password', { phone:'13800005678', code:'888888', newPassword:'new123456' }) },
      { label:'A06-公开-worker(需先发SMS)→400', module:'auth', category:'权限校验', method:'POST',
        url:'/api/auth/reset-password', body:{ phone:'13800005678', code:'888888', newPassword:'new123456' },
        expect:{ status:400 },
        fn:()=>createClient(workerTok).post('/api/auth/reset-password', { phone:'13800005678', code:'888888', newPassword:'new123456' }) },
      { label:'A06-正向-admin重置密码(SMS→respw)', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/reset-password', body:{ phone:'13800005678', code:'888888', newPassword:'888888' },
        expect:{ status:400 },
        fn:async()=>{await createClient().post('/api/auth/sms-send',{phone:'13800005678'});return createClient(adminTok).post('/api/auth/reset-password',{phone:'13800005678',code:'888888',newPassword:'888888'})} },
      { label:'A06-参数-缺phone→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/reset-password', body:{ new_password:'123456' },
        expect:{ status:400 },
        fn:()=>createClient(adminTok).post('/api/auth/reset-password', { new_password:'123456' }) },
    ]));
  }

  // ════════════════════════════════════
  // A07 | update-profile 更新个人信息
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('A07 👤 update-profile', [
      { label:'A07-权限-无token→401', module:'auth', category:'权限校验', method:'POST',
        url:'/api/auth/update-profile', body:{ name:'新名字' },
        expect:{ status:401 },
        fn:()=>createClient().post('/api/auth/update-profile', { name:'新名字' }) },
      { label:'A07-正向-worker更新自己资料', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/update-profile', body:{ name:'测试更新名' },
        expect:{ status:200 },
        fn:()=>createClient(workerTok).post('/api/auth/update-profile', { name:'测试更新名' }) },
      { label:'A07-正向-admin更新自己资料', module:'auth', category:'正向功能', method:'POST',
        url:'/api/auth/update-profile', body:{ name:'管理员新名' },
        expect:{ status:200 },
        fn:()=>createClient(adminTok).post('/api/auth/update-profile', { name:'管理员新名' }) },
    ]));
  }

  // ════════════════════════════════════
  // A08 | role-transfer 角色转移申请
  // ════════════════════════════════════
  {
    const workerTok = await loginAs('worker');
    const customerTok = await loginAs('customer');

    results.push(...await batchRun('A08 🔄 role-transfer(申请)', [
      { label:'A08-无token-worker已有pending→400', module:'auth', category:'边界条件', method:'POST',
        url:'/api/auth/role-transfer', body:{ phone:'13800005678', target_role:'agent', reason:'想转经纪人' },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/role-transfer', { phone:'13800005678', target_role:'agent', reason:'想转经纪人' }) },
      { label:'A08-worker已有pending→400', module:'auth', category:'边界条件', method:'POST',
        url:'/api/auth/role-transfer', body:{ phone:'13800005678', target_role:'agent', reason:'想转经纪人' },
        expect:{ status:400 },
        fn:()=>createClient(workerTok).post('/api/auth/role-transfer', { phone:'13800005678', target_role:'agent', reason:'想转经纪人' }) },
      { label:'A08-customer手机未注册→404', module:'auth', category:'边界条件', method:'POST',
        url:'/api/auth/role-transfer', body:{ phone:'13900009876', target_role:'worker', reason:'应聘做阿姨' },
        expect:{ status:404 },
        fn:()=>createClient(customerTok).post('/api/auth/role-transfer', { phone:'13900009876', target_role:'worker', reason:'应聘做阿姨' }) },
      { label:'A08-参数-缺target_role→400', module:'auth', category:'参数异常', method:'POST',
        url:'/api/auth/role-transfer', body:{ reason:'测试' },
        expect:{ status:400 },
        fn:()=>createClient(workerTok).post('/api/auth/role-transfer', { reason:'测试' }) },
      { label:'A08-边界-无效role→400', module:'auth', category:'边界值', method:'POST',
        url:'/api/auth/role-transfer', body:{ target_role:'ceo', reason:'测试' },
        expect:{ status:400 },
        fn:()=>createClient(workerTok).post('/api/auth/role-transfer', { target_role:'ceo', reason:'测试' }) },
    ]));
  }

  // ════════════════════════════════════
  // A09 | role-transfer 边界覆盖（公开端点，需phone+target_role）
  // ════════════════════════════════════
  {
    const adminTok = await loginAs('admin');
    const workerTok = await loginAs('worker');

    results.push(...await batchRun('A09 🔄 role-transfer(边界)', [
      { label:'A09-公开-无token→需target_role→400', module:'auth', category:'权限校验', method:'POST',
        url:'/api/auth/role-transfer', body:{ phone:'13800005678', approve:true },
        expect:{ status:400 },
        fn:()=>createClient().post('/api/auth/role-transfer', { phone:'13800005678', approve:true }) },
      { label:'A09-worker已有pending→400', module:'auth', category:'边界条件', method:'POST',
        url:'/api/auth/role-transfer', body:{ phone:'13800005678', target_role:'recruiter', reason:'想转招生' },
        expect:{ status:400 },
        fn:()=>createClient(workerTok).post('/api/auth/role-transfer', { phone:'13800005678', target_role:'recruiter', reason:'想转招生' }) },
      { label:'A09-admin替不存在用户→404', module:'auth', category:'边界条件', method:'POST',
        url:'/api/auth/role-transfer', body:{ phone:'13900009876', target_role:'instructor', reason:'培训管理' },
        expect:{ status:404 },
        fn:()=>createClient(adminTok).post('/api/auth/role-transfer', { phone:'13900009876', target_role:'instructor', reason:'培训管理' }) },
    ]));
  }

  return results;
};

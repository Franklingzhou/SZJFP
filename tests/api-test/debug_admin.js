// 使用与测试框架完全相同的代码调试 admin 登录
const { loginAs, createClient, clearTokens, config } = require('./helpers');

async function main() {
  console.log('=== Config admin:', JSON.stringify(config.ACCOUNTS.admin));
  
  // 清除缓存
  clearTokens();
  
  // 直接 axios 调用（与 auth.test.js 相同方式）
  const c = createClient();
  console.log('\n--- 直接 createClient().post ---');
  const r1 = await c.post('/api/auth/password-login', {
    phone: config.ACCOUNTS.admin.phone,
    password: config.ACCOUNTS.admin.password
  });
  console.log('Status:', r1.status);
  console.log('Data:', JSON.stringify(r1.data).slice(0, 300));
  
  // 使用 loginAs（与 session 测试相同方式）
  console.log('\n--- loginAs("admin") ---');
  try {
    const token = await loginAs('admin');
    console.log('Token obtained:', token ? token.slice(0, 30) + '...' : 'NULL');
  } catch(e) {
    console.log('LoginAs FAILED:', e.message);
  }
}

main().catch(e => console.error('FATAL:', e));

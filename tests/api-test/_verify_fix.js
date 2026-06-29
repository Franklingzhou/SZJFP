/**
 * 快速验证第十二轮修复：NEW-REG-01 + BUG-A03
 * 用法: node tests/api-test/_verify_fix.js
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

function createSession(userId, role) {
  const ts = Date.now();
  const secret = 'dev-secret-key';
  const hash = Buffer.from(`${userId}:${ts}:${secret}`).toString('base64url');
  return Buffer.from(`${userId}:${ts}`).toString('base64url') + '.' + hash.substring(0, 16);
}

// 检查响应
function chk(ok, msg) { if (ok) console.log(`  ✅ ${msg}`); else console.error(`  ❌ ${msg}`); }

async function test_new_reg_01() {
  console.log('\n── NEW-REG-01: 手机号唯一性校验 ──');
  const phone = '13800005678'; // 已存在的阿姨孙八
  try {
    const res = await fetch(`${BASE_URL}/api/auth/phone-register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, role: 'worker', name: '重复测试' }),
    });
    const json = await res.json().catch(() => null);
    chk(res.status === 409, `状态码应为409，实际=${res.status}`);
    chk(json && json.code === 'DUPLICATE_PHONE', `code应为DUPLICATE_PHONE，实际=${json?.code}`);
    chk(json && !json.token, '不应返回token');
    console.log(`  响应体: ${JSON.stringify(json)}`);
    return res.status === 409 && json?.code === 'DUPLICATE_PHONE';
  } catch (e) {
    console.error(`  ❌ 请求失败: ${e.message}`);
    return false;
  }
}

async function test_bug_a03() {
  console.log('\n── BUG-A03: /admin/logs 页面可访问 ──');
  const session = createSession('admin001', 'admin');
  try {
    // 1. 页面是否200（需要带admin session）
    const pageRes = await fetch(`${BASE_URL}/admin/logs`, {
      headers: {
        'Cookie': `miniapp_token=${session}; miniapp_role=admin`,
        'Authorization': `Bearer dev-admin`,
      },
    });
    chk(pageRes.status === 200, `页面状态码应为200，实际=${pageRes.status}`);
    const html = await pageRes.text();
    chk(html.includes('admin_logs_page'), '页面chunk已加载（路由生效）');
    chk(!html.includes('__next_error'), '页面无报错');

    // 2. API是否正常
    const apiRes = await fetch(`${BASE_URL}/api/operation-logs?limit=5`, {
      headers: { 'Authorization': `Bearer dev-admin` },
    });
    chk(apiRes.status === 200, `API状态码应为200，实际=${apiRes.status}`);
    const apiJson = await apiRes.json();
    chk(apiJson.ok === true, 'API应返回ok:true');
    chk(Array.isArray(apiJson.data), 'data应为数组');
    console.log(`  API返回: total=${apiJson.total}, data长度=${apiJson.data?.length}`);

    return pageRes.status === 200 && apiRes.status === 200;
  } catch (e) {
    console.error(`  ❌ 请求失败: ${e.message}`);
    return false;
  }
}

async function run() {
  console.log(`🚀 测试目标: ${BASE_URL}`);

  // 先确认服务可达
  try {
    const ping = await fetch(`${BASE_URL}/api/settings?key=platform_info`);
    if (ping.ok) console.log('✅ 服务可达');
    else console.log('⚠️  服务可达但 /api/settings 返回', ping.status);
  } catch {
    console.error(`❌ 服务不可达 ${BASE_URL}，请先运行 pnpm dev`);
    process.exit(1);
  }

  const r1 = await test_new_reg_01();
  const r2 = await test_bug_a03();

  console.log('\n── 结果汇总 ──');
  console.log(`  NEW-REG-01: ${r1 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  BUG-A03:    ${r2 ? '✅ 通过' : '❌ 失败'}`);
  process.exit(r1 && r2 ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });

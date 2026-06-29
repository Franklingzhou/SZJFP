/**
 * 评价审核 API 快速检查
 */
const BASE = 'http://localhost:5000';
const AUTH = { 'Authorization': 'Bearer dev-admin' };
const JSON_HDR = { 'Content-Type': 'application/json', ...AUTH };

async function req(method, path, body = null) {
  const opts = { method, headers: body ? JSON_HDR : AUTH };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  let failures = 0;
  function check(name, ok, detail = '') {
    if (ok) console.log(`  ✅ ${name}`);
    else { console.log(`  ❌ ${name} ${detail}`); failures++; }
  }

  console.log('\n=== 评价审核 API 检查 ===\n');

  // 1. 获取评价列表
  console.log('1. GET /api/reviews');
  const r1 = await req('GET', '/api/reviews');
  check('reviews GET', r1.status === 200, `status=${r1.status}`);
  const reviews = r1.data?.data || [];
  console.log(`   条数: ${reviews.length}`);

  const pending = reviews.find(r => r.status === 'pending');
  const approved = reviews.find(r => r.status === 'approved' && r.hidden === false);

  // 2. approve
  if (pending) {
    console.log(`\n2. PATCH /api/reviews/${pending.id} action=approve`);
    const r2 = await req('PATCH', `/api/reviews/${pending.id}`, { action: 'approve' });
    check('approve', r2.status === 200 && r2.data?.data?.status === 'approved',
      `status=${r2.status} body=${JSON.stringify(r2.data)}`);
  } else {
    console.log('\n2. ⚠️ 无 pending 评价可测 approve');
  }

  // 3. POST 新评价 + reject
  console.log('\n3. POST + reject 流程');
  let validTargetId = null;
  let validTargetRole = null;
  for (const r of reviews) {
    if (r.target_user_id && r.target_role) {
      validTargetId = r.target_user_id;
      validTargetRole = r.target_role;
      break;
    }
  }
  let newReviewId = null;
  if (validTargetId) {
    const r3 = await req('POST', '/api/reviews', {
      target_user_id: validTargetId,
      reviewer_id: 'a001',
      reviewer_role: 'agent',
      rating: 4,
      content: '自检测试评价' + Date.now(),
      target_role: validTargetRole,
    });
    newReviewId = r3.data?.data?.id;
    check('POST 新评价', r3.status === 200 && newReviewId && r3.data?.data?.status === 'pending',
      `status=${r3.status} id=${newReviewId} review_status=${r3.data?.data?.status}`);
    
    if (newReviewId) {
      const r4 = await req('PATCH', `/api/reviews/${newReviewId}`, { action: 'reject' });
      check('reject', r4.status === 200 && r4.data?.data?.status === 'rejected',
        `status=${r4.status} body=${JSON.stringify(r4.data)}`);
    }
  } else {
    console.log('  ⚠️ 无有效 target_user_id，跳过 POST/reject');
  }

  // 4. hide/unhide
  if (approved) {
    console.log(`\n4. hide/unhide for ${approved.id}`);
    const r5 = await req('PATCH', `/api/reviews/${approved.id}`, { action: 'hide', hide_reason: '测试隐藏' });
    check('hide', r5.status === 200 && r5.data?.data?.hidden === true,
      `status=${r5.status} hidden=${r5.data?.data?.hidden}`);

    const r6 = await req('PATCH', `/api/reviews/${approved.id}`, { action: 'unhide' });
    check('unhide', r6.status === 200 && r6.data?.data?.hidden === false,
      `status=${r6.status} hidden=${r6.data?.data?.hidden}`);
  } else {
    console.log('\n4. ⚠️ 无 approved 评价可测 hide/unhide');
  }

  // 5. 非admin PUT 改 hidden（应被拒）
  console.log('\n5. 非admin PUT 改 hidden（应被拒）');
  const r7 = await fetch(BASE + '/api/reviews', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer dev_wx_agent' },
    body: JSON.stringify({ id: approved?.id || 'fake', hidden: false, content: 'hack' }),
  });
  const d7 = await r7.json();
  check('非admin改hidden被拒', r7.status === 403,
    `status=${r7.status} body=${JSON.stringify(d7)}`);

  // 6. 非admin PATCH approve（应被拒）
  console.log('\n6. 非admin PATCH approve（应被拒）');
  const r8 = await fetch(BASE + `/api/reviews/${pending?.id || 'fake'}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer dev_wx_agent' },
    body: JSON.stringify({ action: 'approve' }),
  });
  const d8 = await r8.json();
  check('非admin approve被拒', r8.status === 403,
    `status=${r8.status} body=${JSON.stringify(d8)}`);

  console.log(`\n=== ${failures === 0 ? '✅ 全部通过' : `❌ ${failures} 项失败`} ===\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });

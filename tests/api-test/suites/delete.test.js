/**
 * 删除类接口测试套件 (DELETE)
 * 覆盖 5 个 DELETE 接口 × 5大类（正向功能、参数异常、权限校验、边界值、不存在ID）
 *
 * 接口清单：
 *   D01 /api/customers              — 删除客户 (query ?id=, 仅admin)
 *   D02 /api/agency-contracts        — 删除中介合同 (query ?id=, draft/admin)
 *   D03 /api/course-package-items    — 删除套餐项目 (query ?id=)
 *   D04 /api/contract-templates      — 停用合同模板 (body {id}, 软删除)
 *   D05 /api/field-permissions       — 删除字段权限配置 (query ?id=)
 *
 * ⚠️ 已知缺口：workers/leads/orders/courses/reviews/contracts/enrollments/users
 *    /course-schedules/certificates/notifications/training-contracts/venues/
 *    recommendations/lead-contracts 共 16 个接口缺少 DELETE 方法
 */
const axios = require('axios');
const { loginAs, clearTokens, createClient, runCase, batchRun, fetchTestIds, config } = require('../helpers');
const genPhone = (prefix = '150') => `${prefix}${String(Math.floor(Math.random() * 90000000 + 10000000))}`;

module.exports = async function deleteSuite() {
  await clearTokens();
  const ids = await fetchTestIds();
  const results = [];

  // ════════════════════════════════════
  // D01 | 删除客户
  // ════════════════════════════════════
  results.push(...await batchRun('D01 🗑 删除客户 (customers)', [
    {
      label: 'D01-正向-admin删除客户返回success', module:'customers', category:'正向功能', method:'DELETE', url:'/api/customers?id=xxx',
      body:'{id}', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const token = await loginAs('admin');
        // 先创建一个客户用于删除
        const createRes = await createClient(token).post('/api/customers', {
          name: '待删除客户', phone: genPhone('150'),
          source: 'agent', status: 'inactive'
        });
        // API返回 {success: true, data: {id, ...}}
        const customerId = createRes.data?.data?.id;
        if (!customerId) throw new Error('创建客户失败，无法获取ID: ' + JSON.stringify(createRes.data));
        return createClient(token).delete('/api/customers', { id: customerId });
      }
    },
    {
      label: 'D01-参数-缺少id参数', module:'customers', category:'参数异常', method:'DELETE', url:'/api/customers',
      body:'(无id)', expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/customers');
      }
    },
    {
      label: 'D01-参数-id为空字符串', module:'customers', category:'参数异常', method:'DELETE', url:'/api/customers?id=',
      body:'{id:""}', expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/customers', { id: '' });
      }
    },
    {
      label: 'D01-权限-未登录删除客户', module:'customers', category:'权限校验', method:'DELETE', url:'/api/customers?id=xxx',
      body:'无token', headers:'(无)', expect:{ status:401 },
      fn: () => createClient().delete('/api/customers', { id: 'some-id' })
    },
    {
      label: 'D01-权限-非admin角色删除客户', module:'customers', category:'权限校验', method:'DELETE', url:'/api/customers?id=xxx',
      body:'{id}', expect:{ status:403 },
      fn: async () => {
        const token = await loginAs('agent');
        return createClient(token).delete('/api/customers', { id: 'some-id' });
      }
    },
    {
      label: 'D01-边界-删除不存在的客户ID', module:'customers', category:'边界值', method:'DELETE', url:'/api/customers?id=nonexist',
      body:'{id:"nonexist-99999"}', expect:{ status:200 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/customers', { id: 'nonexist-99999-xxxx' });
      }
    },
  ]));

  // ════════════════════════════════════
  // D02 | 删除中介合同
  // ════════════════════════════════════
  results.push(...await batchRun('D02 🗑 删除中介合同 (agency-contracts)', [
    {
      label: 'D02-正向-admin删除草稿合同', module:'agency-contracts', category:'正向功能', method:'DELETE', url:'/api/agency-contracts?id=xxx',
      body:'{id}', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const token = await loginAs('admin');
        // API requires: {order_id, party_b_id, title}
        const createRes = await createClient(token).post('/api/agency-contracts', {
          title: `待删除测试合同-${Date.now()}`,
          order_id: ids.firstOrderId,
          party_b_id: ids.firstWorkerId,  // 阿姨ID会解析为user_id
          amount: 5000,
        });
        const contractId = createRes.data?.data?.id;
        if (!contractId) throw new Error('创建合同失败，无法获取ID: ' + JSON.stringify(createRes.data));
        return createClient(token).delete('/api/agency-contracts', { id: contractId });
      }
    },
    {
      label: 'D02-正向-admin删除非草稿合同(特权)', module:'agency-contracts', category:'正向功能', method:'DELETE', url:'/api/agency-contracts?id=xxx',
      body:'{id}', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const token = await loginAs('admin');
        const createRes = await createClient(token).post('/api/agency-contracts', {
          title: `admin强制删除合同-${Date.now()}`,
          order_id: ids.firstOrderId,
          party_b_id: ids.firstWorkerId,
          amount: 5000,
        });
        const contractId = createRes.data?.data?.id;
        if (!contractId) throw new Error('创建合同失败: ' + JSON.stringify(createRes.data));
        // admin可以删除任何状态的合同
        return createClient(token).delete('/api/agency-contracts', { id: contractId });
      }
    },
    {
      label: 'D02-参数-缺少id参数', module:'agency-contracts', category:'参数异常', method:'DELETE', url:'/api/agency-contracts',
      body:'(无id)', expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/agency-contracts');
      }
    },
    {
      label: 'D02-权限-未登录删除合同', module:'agency-contracts', category:'权限校验', method:'DELETE', url:'/api/agency-contracts?id=xxx',
      body:'无token', headers:'(无)', expect:{ status:401 },
      fn: () => createClient().delete('/api/agency-contracts', { id: 'some-id' })
    },
    {
      label: 'D02-权限-无权限角色删除合同', module:'agency-contracts', category:'权限校验', method:'DELETE', url:'/api/agency-contracts?id=xxx',
      body:'{id}', expect:{ status:403 },
      fn: async () => {
        const token = await loginAs('worker');
        return createClient(token).delete('/api/agency-contracts', { id: 'some-id' });
      }
    },
    {
      label: 'D02-边界-删除不存在的合同ID', module:'agency-contracts', category:'边界值', method:'DELETE', url:'/api/agency-contracts?id=nonexist',
      body:'{id:"nonexist-99999"}', expect:{ status:404 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/agency-contracts', { id: 'nonexist-contract-99999' });
      }
    },
  ]));

  // ════════════════════════════════════
  // D03 | 删除套餐项目
  // ════════════════════════════════════
  results.push(...await batchRun('D03 🗑 删除套餐项目 (course-package-items)', [
    {
      label: 'D03-正向-删除套餐项目返回success', module:'course-package-items', category:'正向功能', method:'DELETE', url:'/api/course-package-items?id=xxx',
      body:'{id}', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const token = await loginAs('admin');
        const cli = createClient(token);
        // 先创建一个 package 类型的课程作为套餐
        const pkgRes = await cli.post('/api/courses', {
          title: `测试套餐课程-${Date.now()}`,
          content: '套餐课程内容',
          price: 0,
          category: '套餐',
          course_type: 'package',
        });
        const pkgId = pkgRes.data?.data?.id || pkgRes.data?.id;
        // 再创建一个普通课程作为子课程
        const itemRes = await cli.post('/api/courses', {
          title: `测试子课程-${Date.now()}`,
          content: '子课程内容',
          price: 100,
          category: '技能',
          course_type: 'single',
        });
        const itemId = itemRes.data?.data?.id || itemRes.data?.id;
        if (!pkgId || !itemId) {
          throw new Error('无法创建测试数据: pkgId=' + pkgId + ' itemId=' + itemId);
        }
        const createRes = await cli.post('/api/course-package-items', {
          package_course_id: pkgId,
          item_course_id: itemId,
          sort_order: 1,
        });
        const cpItemId = createRes.data?.data?.id || createRes.data?.id;
        if (!cpItemId) throw new Error('创建项目失败: ' + JSON.stringify(createRes.data));
        return cli.delete('/api/course-package-items', { id: cpItemId });
      }
    },
    {
      label: 'D03-参数-缺少id参数', module:'course-package-items', category:'参数异常', method:'DELETE', url:'/api/course-package-items',
      body:'(无id)', expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/course-package-items');
      }
    },
    {
      label: 'D03-权限-未登录删除', module:'course-package-items', category:'权限校验', method:'DELETE', url:'/api/course-package-items?id=xxx',
      body:'无token', headers:'(无)', expect:{ status:401 },
      fn: () => createClient().delete('/api/course-package-items', { id: 'some-id' })
    },
    {
      label: 'D03-权限-非授权角色删除', module:'course-package-items', category:'权限校验', method:'DELETE', url:'/api/course-package-items?id=xxx',
      body:'{id}', expect:{ status:403 },
      fn: async () => {
        const token = await loginAs('worker');
        return createClient(token).delete('/api/course-package-items', { id: 'some-id' });
      }
    },
    {
      label: 'D03-边界-删除不存在的项目ID', module:'course-package-items', category:'边界值', method:'DELETE', url:'/api/course-package-items?id=nonexist',
      body:'{id:"nonexist-99999"}', expect:{ status:500 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/course-package-items', { id: 'nonexist-item-99999' });
      }
    },
  ]));

  // ════════════════════════════════════
  // D04 | 停用合同模板 (软删除)
  // ════════════════════════════════════
  results.push(...await batchRun('D04 🗑 停用合同模板 (contract-templates)', [
    {
      label: 'D04-正向-停用合同模板返回success', module:'contract-templates', category:'正向功能', method:'DELETE', url:'/api/contract-templates',
      body:'{id}', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const token = await loginAs('admin');
        const createRes = await createClient(token).post('/api/contract-templates', {
          name: `待停用模板-${Date.now()}`,
          type: 'service',
          content: '合同模板测试内容',
          is_active: true,
        });
        const templateId = createRes.data?.data?.id;
        if (!templateId) throw new Error('创建模板失败: ' + JSON.stringify(createRes.data));
        // 用 query string 方式传 id
        const res = await createClient(token).delete('/api/contract-templates', { id: templateId });
        return res;
      }
    },
    {
      label: 'D04-参数-缺少id(Body方式)', module:'contract-templates', category:'参数异常', method:'DELETE', url:'/api/contract-templates',
      body:'{}', expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/contract-templates', { data: {} });
      }
    },
    {
      label: 'D04-权限-未登录停用模板', module:'contract-templates', category:'权限校验', method:'DELETE', url:'/api/contract-templates',
      body:'无token', headers:'(无)', expect:{ status:401 },
      fn: () => createClient().delete('/api/contract-templates', { data: { id: 'some-id' } })
    },
    {
        // 【fix】worker 已登录但无 contract-templates:write → 403（非401）
        label: 'D04-权限-非授权角色停用模板', module:'contract-templates', category:'权限校验', method:'DELETE', url:'/api/contract-templates',
      body:'{id}', expect:{ status:403 },
      fn: async () => {
        const token = await loginAs('worker');
        return createClient(token).delete('/api/contract-templates', { data: { id: 'some-id' } });
      }
    },
    {
      label: 'D04-边界-停用不存在的模板ID', module:'contract-templates', category:'边界值', method:'DELETE', url:'/api/contract-templates',
      body:'{id:"nonexist-99999"}', expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/contract-templates', { data: { id: 'nonexist-template-99999' } });
      }
    },
  ]));

  // ════════════════════════════════════
  // D05 | 删除字段权限配置
  // ════════════════════════════════════
  results.push(...await batchRun('D05 🗑 删除字段权限配置 (field-permissions)', [
    {
      label: 'D05-正向-删除权限配置返回success', module:'field-permissions', category:'正向功能', method:'DELETE', url:'/api/field-permissions?id=xxx',
      body:'{id}', expect:{ status:200, hasField:'success' },
      fn: async () => {
        const token = await loginAs('admin');
        const createRes = await createClient(token).post('/api/field-permissions', {
          role: 'worker',
          module: `test_module_${Date.now()}`,
          visible_fields: ['name', 'phone'],
          editable_fields: ['name'],
          enabled: true,
          description: '测试权限配置',
        });
        // API返回 {success: true, data: [{...}]} (数组)
        const permArr = createRes.data?.data;
        const permId = Array.isArray(permArr) ? permArr[0]?.id : permArr?.id;
        if (!permId) throw new Error('创建权限配置失败: ' + JSON.stringify(createRes.data));
        return createClient(token).delete('/api/field-permissions', { id: permId });
      }
    },
    {
      label: 'D05-参数-缺少id参数', module:'field-permissions', category:'参数异常', method:'DELETE', url:'/api/field-permissions',
      body:'(无id)', expect:{ status:400 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/field-permissions');
      }
    },
    {
      label: 'D05-权限-未登录删除配置', module:'field-permissions', category:'权限校验', method:'DELETE', url:'/api/field-permissions?id=xxx',
      body:'无token', headers:'(无)', expect:{ status:401 },
      fn: () => createClient().delete('/api/field-permissions', { id: 'some-id' })
    },
    {
      // 【fix】agent 已登录但无 field-permissions:delete → 403（非401）
      label: 'D05-权限-非授权角色删除配置', module:'field-permissions', category:'权限校验', method:'DELETE', url:'/api/field-permissions?id=xxx',
        body:'{id}', expect:{ status:403 },
        fn: async () => {
          const token = await loginAs('agent');
          return createClient(token).delete('/api/field-permissions', { id: 'some-id' });
        }
      },
    {
      label: 'D05-边界-删除不存在的配置ID', module:'field-permissions', category:'边界值', method:'DELETE', url:'/api/field-permissions?id=nonexist',
      body:'{id:"nonexist-99999"}', expect:{ status:200 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/field-permissions', { id: 'nonexist-perm-99999' });
      }
    },
  ]));

  // ════════════════════════════════════
  // D99 | 已知缺口 — 缺失 DELETE 的接口
  // ════════════════════════════════════
  results.push(...await batchRun('D99 ⚠️ 缺失DELETE的接口（文档性测试）', [
    {
      label: 'D99-缺口-workers缺少DELETE', module:'workers', category:'已知缺口', method:'DELETE', url:'/api/workers?id=xxx',
      body:'(不存在)', expect:{ status:405 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/workers', { id: 'some-id' });
      }
    },
    {
      label: 'D99-缺口-leads缺少DELETE', module:'leads', category:'已知缺口', method:'DELETE', url:'/api/leads?id=xxx',
      body:'(不存在)', expect:{ status:405 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/leads', { id: 'some-id' });
      }
    },
    {
      label: 'D99-缺口-orders缺少DELETE', module:'orders', category:'已知缺口', method:'DELETE', url:'/api/orders?id=xxx',
      body:'(不存在)', expect:{ status:405 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/orders', { id: 'some-id' });
      }
    },
    {
      label: 'D99-缺口-courses缺少DELETE', module:'courses', category:'已知缺口', method:'DELETE', url:'/api/courses?id=xxx',
      body:'(不存在)', expect:{ status:405 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/courses', { id: 'some-id' });
      }
    },
    {
      label: 'D99-缺口-reviews缺少DELETE', module:'reviews', category:'已知缺口', method:'DELETE', url:'/api/reviews?id=xxx',
      body:'(不存在)', expect:{ status:405 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/reviews', { id: 'some-id' });
      }
    },
    {
      label: 'D99-缺口-users缺少DELETE', module:'users', category:'已知缺口', method:'DELETE', url:'/api/users?id=xxx',
      body:'(不存在)', expect:{ status:405 },
      fn: async () => {
        const token = await loginAs('admin');
        return createClient(token).delete('/api/users', { id: 'some-id' });
      }
    },
  ]));

  return results;
};

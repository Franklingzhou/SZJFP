/**
 * 佣金计算工具 — 业务规则2.0 E10t2 + A27 + A31
 * 推荐成交签约后，自动生成三方分账佣金记录 + settlements + 平台费
 *
 * 佣金来源（3条线）：
 * 1. 线索签约（leads/convert）→ agency_fee 佣金给招生(recruiter)
 * 2. 推荐成交签约（orders/signing/confirm）→ service_fee 佣金给创建人+维护人+推荐人
 * 3. 平台收费(双20%)→ 培训费+中介费各20%
 *
 * commission_records 表结构（单行三方分账模式）：
 *   - order_id: 关联订单
 *   - recommendation_id: 关联推荐记录（可空）
 *   - creator_id / creator_amount: 创建人(录入人)及佣金
 *   - maintainer_id / maintainer_amount: 维护人及佣金
 *   - recommender_id / recommender_amount: 推荐人(签单人)及佣金
 *   - total_amount: 总佣金
 *   - status: pending / settled
 *
 * settlements 表结构（每接收人一行）：
 *   - order_id, type, total_amount, recipient_id, recipient_role, amount, rate, status
 *
 * platform_fees 表结构：
 *   - order_id, contract_id, contract_type(agency/training), amount, status(pending/confirmed)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// 类型定义
// ============================================================

export interface CommissionRecordInput {
  orderId: string;
  recommendationId?: string | null;
  creatorId: string;
  creatorAmount: number;
  maintainerId?: string | null;
  maintainerAmount?: number;
  recommenderId?: string | null;
  recommenderAmount?: number;
  totalAmount: number;
  /** 佣金类型：service_fee | agency_fee | training_fee */
  commissionType?: string;
}

export interface CommissionRecord {
  id: string;
  order_id: string;
  recommendation_id: string | null;
  commissionType?: string; // 运行时附加，不在DB列中
  creator_id: string;
  maintainer_id: string | null;
  recommender_id: string | null;
  creator_amount: number;
  maintainer_amount: number;
  recommender_amount: number;
  total_amount: number;
  status: 'pending' | 'settled';
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 创建一条佣金记录（三方分账单行模式）
 */
export async function createCommissionRecord(
  supabase: SupabaseClient,
  input: CommissionRecordInput,
): Promise<CommissionRecord | null> {
  const id = `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const record = {
    id,
    order_id: input.orderId,
    recommendation_id: input.recommendationId || null,
    creator_id: input.creatorId,
    maintainer_id: input.maintainerId || null,
    recommender_id: input.recommenderId || null,
    creator_amount: Math.round((input.creatorAmount || 0) * 100) / 100,
    maintainer_amount: Math.round((input.maintainerAmount || 0) * 100) / 100,
    recommender_amount: Math.round((input.recommenderAmount || 0) * 100) / 100,
    total_amount: Math.round(input.totalAmount * 100) / 100,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('commission_records')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('[commission-utils] createCommissionRecord error:', error.message, error.details);
    return null;
  }

  console.log('[commission-utils] Commission record created:', data.id, 'total:', data.total_amount);
  const result = data as CommissionRecord;
  result.commissionType = input.commissionType;
  return result;
}

/**
 * 计算订单的服务佣金总额
 * 优先使用 service_fee，回退到 amount * commission_rate
 */
function calcTotalCommission(order: Record<string, unknown>): number {
  const serviceFee = Number(order.service_fee) || 0;
  if (serviceFee > 0) return serviceFee;

  const amount = Number(order.amount) || 0;
  const rate = Number(order.commission_rate) || 30;
  return amount > 0 ? amount * rate / 100 : 0;
}

/**
 * 为推荐成交签约创建三方分账佣金记录
 *
 * 分账来源：
 * - 创建人（录入人）: worker.creator_id, 按 worker.creator_commission_rate 分账
 * - 维护人: worker.maintainer_id, 按 worker.maintainer_commission_rate 分账
 * - 推荐人（签单人）: recommendation.recommender_id, 按 worker.referrer_commission_rate 分账
 */
export async function createCommissionForOrderSigning(
  supabase: SupabaseClient,
  signingData: Record<string, unknown>,
): Promise<CommissionRecord | null> {
  const orderId = signingData.order_id as string;
  const workerId = signingData.worker_id as string;

  if (!orderId || !workerId) {
    console.warn('[commission-utils] createCommissionForOrderSigning: missing order_id or worker_id');
    return null;
  }

  try {
    // 1. 查询订单信息（amount, service_fee, commission_rate）
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .select('amount, service_fee, commission_rate, title')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !orderData) {
      console.warn('[commission-utils] Order not found:', orderId);
      return null;
    }

    // 2. 查询阿姨信息（creator_id, maintainer_id, 分账比例）
    const { data: workerData, error: workerErr } = await supabase
      .from('workers')
      .select('creator_id, maintainer_id, creator_commission_rate, maintainer_commission_rate, referrer_commission_rate, name')
      .eq('id', workerId)
      .maybeSingle();

    if (workerErr || !workerData) {
      console.warn('[commission-utils] Worker not found:', workerId);
      return null;
    }

    // 3. 查询该订单+阿姨的已接受推荐记录
    const { data: recommendations, error: recErr } = await supabase
      .from('recommendations')
      .select('id, recommender_id, recommender_role, status')
      .eq('order_id', orderId)
      .eq('worker_id', workerId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1);

    const acceptedRec = !recErr && recommendations && recommendations.length > 0
      ? recommendations[0] as Record<string, unknown>
      : null;

    // 4. 计算总佣金
    const totalCommission = calcTotalCommission(orderData as Record<string, unknown>);
    if (totalCommission <= 0) {
      console.log('[commission-utils] No commission to calculate (amount=0, service_fee=0)');
      // 即使金额为0也创建一条空记录，便于后续填入实际金额
    }

    // 5. 按 worker 上配置的比例拆分
    const creatorRate = Number((workerData as Record<string, unknown>).creator_commission_rate) || 30;
    const maintainerRate = Number((workerData as Record<string, unknown>).maintainer_commission_rate) || 30;
    const referrerRate = Number((workerData as Record<string, unknown>).referrer_commission_rate) || 30;

    const creatorId = (workerData as Record<string, unknown>).creator_id as string;
    const maintainerId = (workerData as Record<string, unknown>).maintainer_id as string | null;
    const recommenderId = acceptedRec
      ? (acceptedRec.recommender_id as string)
      : null;

    const creatorAmount = totalCommission * creatorRate / 100;
    const maintainerAmount = maintainerId ? totalCommission * maintainerRate / 100 : 0;
    const recommenderAmount = recommenderId ? totalCommission * referrerRate / 100 : 0;

    // 6. 创建佣金记录
    const record = await createCommissionRecord(supabase, {
      orderId,
      recommendationId: acceptedRec ? (acceptedRec.id as string) : null,
      creatorId: creatorId || 'system',
      creatorAmount,
      maintainerId,
      maintainerAmount,
      recommenderId,
      recommenderAmount,
      totalAmount: totalCommission,
      commissionType: 'service_fee',
    });

    console.log('[commission-utils] Order signing commission created:',
      'order=', orderId,
      'worker=', workerId,
      'total=', totalCommission,
      'creator=', creatorAmount,
      'maintainer=', maintainerAmount,
      'recommender=', recommenderAmount,
    );

    return record;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[commission-utils] createCommissionForOrderSigning error:', message);
    return null;
  }
}

/**
 * 为线索签约创建招生佣金记录（agency_fee）
 * 线索签约后，招生代理获得录入佣金
 */
export async function createCommissionForLeadConvert(
  supabase: SupabaseClient,
  leadData: Record<string, unknown>,
  workerId: string,
): Promise<CommissionRecord | null> {
  const recruiterId = leadData.recruiter_id as string;

  if (!recruiterId) {
    console.warn('[commission-utils] createCommissionForLeadConvert: missing recruiter_id');
    return null;
  }

  try {
    // 查询阿姨的 creator_commission_rate
    const { data: workerData } = await supabase
      .from('workers')
      .select('creator_commission_rate, name')
      .eq('id', workerId)
      .maybeSingle();

    const creatorRate = workerData
      ? Number((workerData as Record<string, unknown>).creator_commission_rate) || 30
      : 30;

    // 线索签约暂时没有关联订单，用 lead 的签约时间和预估佣金
    // 后续上户后可通过关联订单填入实际金额
    // 使用虚拟 order_id（格式: lead_{leadId}），等实际关联订单后替换
    const virtualOrderId = `lead_${leadData.id}`;
    const estimatedAmount = 0; // 签约时无订单金额，留待上户后核算

    const record = await createCommissionRecord(supabase, {
      orderId: virtualOrderId,
      recommendationId: null,
      creatorId: recruiterId,
      creatorAmount: 0, // 待上户后核算
      maintainerId: null,
      maintainerAmount: 0,
      recommenderId: null,
      recommenderAmount: 0,
      totalAmount: 0,
      commissionType: 'agency_fee',
    });

    console.log('[commission-utils] Lead convert commission placeholder created:',
      'lead=', leadData.id,
      'worker=', workerId,
      'recruiter=', recruiterId,
    );

    return record;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[commission-utils] createCommissionForLeadConvert error:', message);
    return null;
  }
}

// ============================================================
// A27: settlements 行创建（每接收人一行，供分账管理页使用）
// ============================================================

export interface SettlementInput {
  orderId: string;
  type: string;
  totalAmount: number;
  recipientId: string;
  recipientRole: string;
  amount: number;
  rate: number;
}

export async function createSettlementsFromCommission(
  supabase: SupabaseClient,
  commission: CommissionRecord,
  orderAmount: number,
): Promise<number> {
  const rows: SettlementInput[] = [];
  const orderId = commission.order_id;

  if (commission.creator_amount > 0 && commission.creator_id && commission.creator_id !== 'system') {
    const rate = commission.total_amount > 0
      ? Math.round(commission.creator_amount / commission.total_amount * 100)
      : 0;
    rows.push({
      orderId,
      type: commission.commissionType === 'agency_fee' ? 'agency' : 'service',
      totalAmount: orderAmount,
      recipientId: commission.creator_id,
      recipientRole: 'creator',
      amount: commission.creator_amount,
      rate,
    });
  }

  if (commission.maintainer_amount > 0 && commission.maintainer_id) {
    const rate = commission.total_amount > 0
      ? Math.round(commission.maintainer_amount / commission.total_amount * 100)
      : 0;
    rows.push({
      orderId,
      type: commission.commissionType === 'agency_fee' ? 'agency' : 'service',
      totalAmount: orderAmount,
      recipientId: commission.maintainer_id,
      recipientRole: 'maintainer',
      amount: commission.maintainer_amount,
      rate,
    });
  }

  if (commission.recommender_amount > 0 && commission.recommender_id) {
    const rate = commission.total_amount > 0
      ? Math.round(commission.recommender_amount / commission.total_amount * 100)
      : 0;
    rows.push({
      orderId,
      type: commission.commissionType === 'agency_fee' ? 'agency' : 'service',
      totalAmount: orderAmount,
      recipientId: commission.recommender_id,
      recipientRole: 'recommender',
      amount: commission.recommender_amount,
      rate,
    });
  }

  if (rows.length === 0) {
    console.log('[commission-utils] No settlements to create (all amounts zero or no recipients)');
    return 0;
  }

  const now = new Date().toISOString();
  const settlements = rows.map(r => ({
    id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${Math.random().toString(36).slice(2, 4)}`,
    order_id: r.orderId,
    type: r.type,
    total_amount: r.totalAmount,
    recipient_id: r.recipientId,
    recipient_role: r.recipientRole,
    amount: r.amount,
    rate: r.rate,
    status: 'pending',
    created_at: now,
  }));

  const { error } = await supabase
    .from('settlements')
    .insert(settlements);

  if (error) {
    console.error('[commission-utils] createSettlements error:', error.message, error.details);
  } else {
    console.log('[commission-utils] Settlements created:', rows.length, 'rows');
  }

  return error ? 0 : rows.length;
}

// ============================================================
// A31: 平台收费（双20%）自动创建
// ============================================================

/**
 * 为签约订单自动创建双20%平台费：
 * - agency_fee(中介费): 订单金额 * 20%
 * - training_fee(培训费): 订单金额 * 20%
 */
export async function createPlatformFeesForOrder(
  supabase: SupabaseClient,
  orderId: string,
  orderAmount: number,
  contractId?: string | null,
): Promise<number> {
  if (orderAmount <= 0) {
    console.log('[commission-utils] createPlatformFeesForOrder: orderAmount <= 0, skip');
    return 0;
  }

  const fee20 = Math.round(orderAmount * 0.2 * 100) / 100;
  const now = new Date().toISOString();

  const fees = [
    {
      id: `pf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      order_id: orderId,
      contract_id: contractId || null,
      contract_type: 'agency',
      amount: fee20,
      status: 'pending',
      created_at: now,
      updated_at: now,
    },
    {
      id: `pf_${Date.now() + 1}_${Math.random().toString(36).slice(2, 8)}`,
      order_id: orderId,
      contract_id: contractId || null,
      contract_type: 'training',
      amount: fee20,
      status: 'pending',
      created_at: now,
      updated_at: now,
    },
  ];

  const { error } = await supabase
    .from('platform_fees')
    .insert(fees);

  if (error) {
    console.error('[commission-utils] createPlatformFees error:', error.message, error.details);
    return 0;
  }

  console.log('[commission-utils] Platform fees created: agency=', fee20, 'training=', fee20, 'order=', orderId);
  return 2;
}

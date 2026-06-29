-- BUG-50: 旧合同数据修复
-- 尝试从orders表关联worker_id/customer_id来回填合同的缺失关联字段
-- 仅在合同关联字段为null时执行

-- 1. 通过 order_id 关联 orders 表，回填 worker_id
UPDATE contracts c
SET worker_id = o.worker_id,
    updated_at = NOW()
FROM orders o
WHERE c.order_id = o.id
  AND c.worker_id IS NULL
  AND o.worker_id IS NOT NULL;

-- 2. 通过 order_id 关联 orders 表，回填 customer_id
UPDATE contracts c
SET customer_id = o.customer_id,
    updated_at = NOW()
FROM orders o
WHERE c.order_id = o.id
  AND c.customer_id IS NULL
  AND o.customer_id IS NOT NULL;

-- 3. 通过 workers 表反向查找 party_b_id（如果 party_b_id 是 user_id）
UPDATE contracts c
SET party_b_id = w.user_id,
    updated_at = NOW()
FROM workers w
WHERE c.worker_id = w.id
  AND c.party_b_id IS NULL
  AND w.user_id IS NOT NULL;

-- 4. 尝试通过合同标题/类型推断关联（兜底策略）
-- 把remainder设为NULL以便前端正确处理
-- No destructive changes

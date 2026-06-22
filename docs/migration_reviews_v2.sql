-- ==========================================
-- reviews 表 v2 迁移：通用互评架构
-- 
-- 变更说明：
--   旧结构（v1）：worker_id + customer_id 双外键，tags/reply 字段
--   新结构（v2）：target_user_id + reviewer_id 通用字段，hidden 软删除
--   支持任意角色间互评（客户↔阿姨↔经纪人↔招生↔讲师↔阿姨运营）
-- ==========================================

-- 1. 删除旧表（如已存在v1结构）
-- DROP TABLE IF EXISTS reviews CASCADE;

-- 2. 创建 v2 结构
CREATE TABLE IF NOT EXISTS reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 评价人
    reviewer_id   UUID,          -- 评价人用户ID（关联 users.id，留空=匿名）
    reviewer_role VARCHAR(32),   -- 评价人角色: worker/customer/agent/recruiter/instructor/worker_operator
    
    -- 被评价人
    target_user_id UUID NOT NULL,  -- 被评价人用户ID（必填）
    target_role    VARCHAR(32),    -- 被评价人角色
    
    -- 关联（可选，有订单就关联订单）
    order_id    UUID,            -- 关联订单/课程/合同/推荐ID
    
    -- 评价内容
    rating      INTEGER,         -- 1-5星评分
    content     TEXT,            -- 评价文字内容
    
    -- 管理
    hidden      BOOLEAN DEFAULT false,  -- 管理员隐藏标记（软删除）
    
    -- 时间戳
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. 索引
CREATE INDEX IF NOT EXISTS idx_reviews_target_user_id ON reviews(target_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_role ON reviews(reviewer_role);
CREATE INDEX IF NOT EXISTS idx_reviews_target_role ON reviews(target_role);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_hidden ON reviews(hidden);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- 4. 组合索引（常用查询）
CREATE INDEX IF NOT EXISTS idx_reviews_type ON reviews(reviewer_role, target_role, hidden);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_user_id, target_role, hidden);

-- 5. 注释
COMMENT ON TABLE reviews IS '评价互评表 — 开放式互评，支持任意角色间评价，关联订单可选';
COMMENT ON COLUMN reviews.reviewer_id IS '评价人用户ID，留空=匿名评价';
COMMENT ON COLUMN reviews.reviewer_role IS '评价人角色：worker/customer/agent/recruiter/instructor/worker_operator';
COMMENT ON COLUMN reviews.target_user_id IS '被评价人用户ID（必填）';
COMMENT ON COLUMN reviews.target_role IS '被评价人角色';
COMMENT ON COLUMN reviews.order_id IS '关联ID（订单/课程/合同/推荐等，可选）';
COMMENT ON COLUMN reviews.rating IS '1-5星评分';
COMMENT ON COLUMN reviews.content IS '评价文字内容';
COMMENT ON COLUMN reviews.hidden IS '管理员隐藏标记=true（软删除），默认false显示';

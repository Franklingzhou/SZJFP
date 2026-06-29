-- ============================================================
-- P0 Bug 修复：补充缺失的表列，对齐 schema.ts
-- 执行环境: Supabase SQL Editor / pg 直连
-- 日期: 2026-06-23
-- ============================================================

-- ============================================================
-- 1. resume_reviews 表：补全审核字段
-- ============================================================
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'create';
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) DEFAULT 'create_resume';
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS old_data TEXT;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS new_data TEXT;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS changes TEXT;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS proposed_data JSONB;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS original_data JSONB;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS changed_fields TEXT[];
-- 注意：supabase-init.sql 用的是 reviewed_by，代码用的是 reviewer_id
-- 如果 reviewed_by 列已存在，重命名；否则直接创建 reviewer_id
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_reviews' AND column_name = 'reviewed_by') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_reviews' AND column_name = 'reviewer_id') THEN
    ALTER TABLE resume_reviews RENAME COLUMN reviewed_by TO reviewer_id;
  END IF;
END $$;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(36) REFERENCES users(id);
-- 代码用 review_note，旧表用 notes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_reviews' AND column_name = 'notes') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resume_reviews' AND column_name = 'review_note') THEN
    ALTER TABLE resume_reviews RENAME COLUMN notes TO review_note;
  END IF;
END $$;
ALTER TABLE resume_reviews ADD COLUMN IF NOT EXISTS review_note TEXT;

-- ============================================================
-- 2. contracts 表：补全字段（代码用新字段，DB还是旧字段）
-- ============================================================
-- contracts 旧表：party_a_name, party_a_phone, party_b_name, party_b_phone, content, attachments, order_id, student_id, lead_id, contract_no, template_id
-- contracts 新定义：title, party_a_id, party_b_id, party_b_id_card, course_id, price, start_date, end_date, approved_by, approved_at, reject_reason

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS title VARCHAR(128);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_a_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_b_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_b_id_card VARCHAR(18);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS course_id VARCHAR(36) REFERENCES courses(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS start_date VARCHAR(20);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS end_date VARCHAR(20);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approved_by VARCHAR(36) REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- party_b_phone 在旧表中叫 party_b_phone，但也检查一下
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party_b_phone VARCHAR(20);

-- 补充索引
CREATE INDEX IF NOT EXISTS contracts_party_a_id_idx ON contracts(party_a_id);
CREATE INDEX IF NOT EXISTS contracts_party_b_id_idx ON contracts(party_b_id);
CREATE INDEX IF NOT EXISTS contracts_course_id_idx ON contracts(course_id);

-- ============================================================
-- 3. workers 表：补全缺失字段
-- ============================================================
ALTER TABLE workers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS lead_id VARCHAR(36) REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS worker_no VARCHAR(50);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS tier_id VARCHAR(36);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(2,1) DEFAULT '0';
ALTER TABLE workers ADD COLUMN IF NOT EXISTS reorder_rate NUMERIC(4,3) DEFAULT '0';

CREATE INDEX IF NOT EXISTS workers_phone_idx ON workers(phone);
CREATE INDEX IF NOT EXISTS workers_lead_id_idx ON workers(lead_id);

-- ============================================================
-- 4. leads 表：补全签约/推荐字段
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS signed_by VARCHAR(36) REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sign_worker_id VARCHAR(36);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS want_training BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS creator_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS creator_role VARCHAR(20);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_id VARCHAR(36) REFERENCES users(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_role VARCHAR(20);

CREATE INDEX IF NOT EXISTS leads_signed_by_idx ON leads(signed_by);
CREATE INDEX IF NOT EXISTS leads_sign_worker_id_idx ON leads(sign_worker_id);

-- ============================================================
-- 5. enrollments 表：补全字段
-- ============================================================
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS worker_id VARCHAR(36) REFERENCES workers(id);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS grade VARCHAR(20);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS graded_by VARCHAR(36) REFERENCES users(id);
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS passed BOOLEAN;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS score INTEGER;

CREATE INDEX IF NOT EXISTS enrollments_worker_id_idx ON enrollments(worker_id);

-- ============================================================
-- 6. 创建 system_settings 表（如果不存在）
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB,
  description VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入初始配置
INSERT INTO system_settings (key, value, description) VALUES
  ('platform_info', '{"name":"家政共创平台","version":"2.0.0"}', '平台基本信息'),
  ('commission_defaults', '{"creator_rate":30,"maintainer_rate":20,"referrer_rate":50}', '佣金分账默认比例'),
  ('credit_rules', '{"initial_score":1000,"min_score":0,"blacklist_threshold":300}', '诚信分规则')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. contracts 种子数据：插入 pending_approval 状态合同
-- ============================================================
DO $$ 
DECLARE
  admin_id VARCHAR(36);
  agent_id VARCHAR(36);
  recruiter_id VARCHAR(36);
BEGIN
  -- 取现有用户
  SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;
  SELECT id INTO agent_id FROM users WHERE role = 'agent' LIMIT 1;
  SELECT id INTO recruiter_id FROM users WHERE role = 'recruiter' LIMIT 1;

  -- 插入 pending_approval 合同（管理员审批场景A05-A06）
  IF admin_id IS NOT NULL AND agent_id IS NOT NULL THEN
    INSERT INTO contracts (id, title, type, party_a_id, party_b_id, party_b_name, party_b_phone, status, price, start_date, created_at)
    VALUES (
      'contract_pending_001',
      '经纪代理合同-审核中',
      'platform-agent',
      admin_id,
      agent_id,
      '张丽华',
      '13600001234',
      'pending_approval',
      500.00,
      '2026-07-01',
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET status = 'pending_approval';
  END IF;

  -- 插入第2个 pending_approval 合同
  IF admin_id IS NOT NULL AND recruiter_id IS NOT NULL THEN
    INSERT INTO contracts (id, title, type, party_a_id, party_b_id, party_b_name, party_b_phone, status, price, start_date, created_at)
    VALUES (
      'contract_pending_002',
      '招生合作协议-待审核',
      'platform-recruiter',
      admin_id,
      recruiter_id,
      '陈招生',
      '13500003456',
      'pending_approval',
      300.00,
      '2026-07-15',
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET status = 'pending_approval';
  END IF;
END $$;

-- ============================================================
-- 8. 确保 order_signings 表存在
-- ============================================================
CREATE TABLE IF NOT EXISTS order_signings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR(36) NOT NULL REFERENCES orders(id),
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  worker_salary INTEGER,
  work_start_date VARCHAR(20),
  contract_start_date VARCHAR(20),
  contract_end_date VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  replace_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS order_signings_order_id_idx ON order_signings(order_id);
CREATE INDEX IF NOT EXISTS order_signings_worker_id_idx ON order_signings(worker_id);
CREATE INDEX IF NOT EXISTS order_signings_status_idx ON order_signings(status);

-- ============================================================
-- 9. 更新 workers 中旧的状态值 (idle → available)
-- ============================================================
UPDATE workers SET status = 'available' WHERE status = 'idle';

-- ============================================================
-- 完成
-- ============================================================
SELECT 'P0 migration completed successfully!' AS result;

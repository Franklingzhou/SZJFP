-- ============================================================
-- 家政共创平台 — 全量建表SQL（26张表）
-- 执行环境: Supabase SQL Editor
-- 生成时间: 2026-06-18
-- ============================================================

-- ============================================================
-- 基础表：按依赖顺序创建
-- ============================================================

-- 1. 用户表（所有角色共用）
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL,
  review_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  wechat_openid VARCHAR(64),
  wechat_unionid VARCHAR(64),
  is_active BOOLEAN NOT NULL DEFAULT true,
  reviewed_by VARCHAR(36),
  reviewed_at TIMESTAMPTZ,
  register_source VARCHAR(20) DEFAULT 'self',
  avatar VARCHAR(500),
  credit_score INT DEFAULT 1000,
  points INT DEFAULT 0,
  deposit DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_review_status_idx ON users(review_status);
CREATE INDEX IF NOT EXISTS users_wechat_openid_idx ON users(wechat_openid);
CREATE INDEX IF NOT EXISTS users_register_source_idx ON users(register_source);

-- 2. 阿姨简历表
CREATE TABLE IF NOT EXISTS workers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(20),
  age INTEGER,
  gender VARCHAR(4),
  origin VARCHAR(64),
  photo TEXT,
  id_card VARCHAR(18),
  id_card_front VARCHAR(500),
  id_card_back VARCHAR(500),
  job_types TEXT,
  experience_years INTEGER DEFAULT 0,
  specialties TEXT,
  certifications TEXT,
  expected_salary_min INTEGER DEFAULT 0,
  expected_salary_max INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'idle',
  work_status VARCHAR(20) DEFAULT 'available',
  available_date VARCHAR(20),
  creator_id VARCHAR(36) NOT NULL REFERENCES users(id),
  creator_role VARCHAR(20) NOT NULL,
  creator_commission_rate NUMERIC(5,2) DEFAULT '30.00',
  maintainer_id VARCHAR(36) REFERENCES users(id),
  maintainer_commission_rate NUMERIC(5,2),
  referrer_id VARCHAR(36) REFERENCES users(id),
  referrer_commission_rate NUMERIC(5,2),
  credit_score INTEGER NOT NULL DEFAULT 1000,
  deposit NUMERIC(10,2) DEFAULT '0',
  points INTEGER NOT NULL DEFAULT 0,
  resume_review_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  change_summary TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS workers_user_id_idx ON workers(user_id);
CREATE INDEX IF NOT EXISTS workers_creator_id_idx ON workers(creator_id);
CREATE INDEX IF NOT EXISTS workers_status_idx ON workers(status);
CREATE INDEX IF NOT EXISTS workers_job_types_idx ON workers(job_types);
CREATE INDEX IF NOT EXISTS workers_credit_score_idx ON workers(credit_score);

-- 3. 阿姨照片/视频相册
CREATE TABLE IF NOT EXISTS worker_media (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_media_worker_id_idx ON worker_media(worker_id);
CREATE INDEX IF NOT EXISTS worker_media_type_idx ON worker_media(type);

-- 4. 阿姨工作经验表
CREATE TABLE IF NOT EXISTS worker_work_experience (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  period VARCHAR(50) NOT NULL,
  employer VARCHAR(128),
  job_type VARCHAR(50),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS worker_work_experience_worker_id_idx ON worker_work_experience(worker_id);

-- 5. 客户表
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  requirement TEXT,
  address VARCHAR(255),
  credit_score INTEGER NOT NULL DEFAULT 1000,
  level VARCHAR(20) DEFAULT 'normal',
  source VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);

-- 6. 客户跟进记录表
CREATE TABLE IF NOT EXISTS customer_followups (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id VARCHAR(36) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  content TEXT,
  result VARCHAR(20),
  follow_up_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_followups_customer_id_idx ON customer_followups(customer_id);
CREATE INDEX IF NOT EXISTS customer_followups_follow_up_by_idx ON customer_followups(follow_up_by);

-- 7. 招生线索表
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  gender VARCHAR(4),
  age INTEGER,
  origin VARCHAR(64),
  job_types TEXT,
  expected_salary INTEGER,
  intention VARCHAR(100),
  source VARCHAR(50),
  level VARCHAR(2) DEFAULT 'C',
  is_public BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  creator_id VARCHAR(36) NOT NULL REFERENCES users(id),
  creator_role VARCHAR(20) NOT NULL,
  referrer_id VARCHAR(36) REFERENCES users(id),
  referrer_role VARCHAR(20),
  note TEXT,
  recruiter_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS leads_recruiter_id_idx ON leads(recruiter_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads(phone);

-- 8. 线索跟进记录
CREATE TABLE IF NOT EXISTS lead_follow_ups (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lead_id VARCHAR(36) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT,
  result VARCHAR(20),
  follow_up_by VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_follow_ups_lead_id_idx ON lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS lead_follow_ups_follow_up_by_idx ON lead_follow_ups(follow_up_by);

-- 9. 培训课程表
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(128) NOT NULL,
  instructor_id VARCHAR(36) NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  max_students INTEGER NOT NULL DEFAULT 30,
  current_students INTEGER NOT NULL DEFAULT 0,
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  hours INTEGER DEFAULT 0,
  price NUMERIC(10,2) NOT NULL DEFAULT '0',
  description TEXT,
  location VARCHAR(128),
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming',
  approved_by VARCHAR(36) REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS courses_instructor_id_idx ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS courses_status_idx ON courses(status);
CREATE INDEX IF NOT EXISTS courses_type_idx ON courses(type);

-- 10. 学员报名/培训记录
CREATE TABLE IF NOT EXISTS enrollments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR(36) NOT NULL REFERENCES courses(id),
  student_id VARCHAR(36) NOT NULL REFERENCES users(id),
  student_name VARCHAR(64),
  enrolled_by VARCHAR(36) REFERENCES users(id),
  score INTEGER,
  passed BOOLEAN,
  certificate VARCHAR(128),
  status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enrollments_course_id_idx ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS enrollments_status_idx ON enrollments(status);

-- 11. 订单表
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(128) NOT NULL,
  job_type VARCHAR(20) NOT NULL,
  salary_min INTEGER DEFAULT 0,
  salary_max INTEGER DEFAULT 0,
  location VARCHAR(128),
  description TEXT,
  agent_id VARCHAR(36) NOT NULL REFERENCES users(id),
  worker_id VARCHAR(36) REFERENCES users(id),
  customer_id VARCHAR(36) REFERENCES users(id),
  recommender_id VARCHAR(36) REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'created',
  service_fee NUMERIC(10,2) DEFAULT '0',
  commission_rate NUMERIC(5,2) DEFAULT '30.00',
  service_type VARCHAR(50),
  amount NUMERIC(10,2),
  start_date VARCHAR(20),
  reviewed BOOLEAN DEFAULT false,
  salary_type VARCHAR(20),
  work_duration VARCHAR(50),
  contact_name VARCHAR(64),
  contact_phone VARCHAR(20),
  signed_worker_id VARCHAR(36) REFERENCES workers(id),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_agent_id_idx ON orders(agent_id);
CREATE INDEX IF NOT EXISTS orders_worker_id_idx ON orders(worker_id);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON orders(customer_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at);

-- 12. 订单签约记录表
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

-- 13. 佣金规则表
CREATE TABLE IF NOT EXISTS commission_rules (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(64) NOT NULL,
  type VARCHAR(30) NOT NULL,
  description TEXT,
  role VARCHAR(20) NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS commission_rules_type_idx ON commission_rules(type);
CREATE INDEX IF NOT EXISTS commission_rules_role_idx ON commission_rules(role);

-- 14. 分账记录表
CREATE TABLE IF NOT EXISTS settlements (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR(36) NOT NULL REFERENCES orders(id),
  type VARCHAR(30) NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  recipient_id VARCHAR(36) NOT NULL REFERENCES users(id),
  recipient_role VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS settlements_order_id_idx ON settlements(order_id);
CREATE INDEX IF NOT EXISTS settlements_recipient_id_idx ON settlements(recipient_id);
CREATE INDEX IF NOT EXISTS settlements_status_idx ON settlements(status);

-- 15. 合同表（通用）
CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(128) NOT NULL,
  type VARCHAR(30) NOT NULL,
  party_a_id VARCHAR(36) NOT NULL REFERENCES users(id),
  party_b_id VARCHAR(36) REFERENCES users(id),
  party_b_name VARCHAR(64) NOT NULL,
  party_b_id_card VARCHAR(18),
  party_b_phone VARCHAR(20),
  course_id VARCHAR(36) REFERENCES courses(id),
  price NUMERIC(10,2),
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  approved_by VARCHAR(36) REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS contracts_party_a_id_idx ON contracts(party_a_id);
CREATE INDEX IF NOT EXISTS contracts_party_b_id_idx ON contracts(party_b_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts(status);
CREATE INDEX IF NOT EXISTS contracts_course_id_idx ON contracts(course_id);

-- 16. 培训合同表（招生发起，培训主管确认）
CREATE TABLE IF NOT EXISTS training_contracts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(200),
  lead_id VARCHAR(36) REFERENCES leads(id),
  course_id VARCHAR(36) REFERENCES courses(id),
  student_id VARCHAR(36) REFERENCES users(id),
  party_a_id VARCHAR(36) NOT NULL REFERENCES users(id),
  party_a_name VARCHAR(100),
  party_b_name VARCHAR(100) NOT NULL,
  party_b_phone VARCHAR(20),
  party_b_id_card VARCHAR(18),
  amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  status VARCHAR(20) DEFAULT 'draft',
  agent_confirmed_at TIMESTAMPTZ,
  agent_confirm_note TEXT,
  supervisor_confirmed_at TIMESTAMPTZ,
  supervisor_confirm_note TEXT,
  reject_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by VARCHAR(36) REFERENCES users(id),
  activated_at TIMESTAMPTZ,
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS training_contracts_lead_id_idx ON training_contracts(lead_id);
CREATE INDEX IF NOT EXISTS training_contracts_party_a_id_idx ON training_contracts(party_a_id);
CREATE INDEX IF NOT EXISTS training_contracts_status_idx ON training_contracts(status);

-- 17. 中介合同表（经纪人发起，经纪人自己确认）
CREATE TABLE IF NOT EXISTS agency_contracts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(200),
  order_id VARCHAR(36) REFERENCES orders(id),
  party_a_id VARCHAR(36) REFERENCES users(id),
  party_a_name VARCHAR(100),
  party_b_id VARCHAR(36) REFERENCES workers(id),
  party_b_name VARCHAR(100),
  party_b_phone VARCHAR(20),
  party_b_id_card VARCHAR(18),
  party_c_id VARCHAR(36) REFERENCES customers(id),
  party_c_name VARCHAR(100),
  party_c_phone VARCHAR(20),
  amount DECIMAL(10,2),
  service_fee DECIMAL(10,2),
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  status VARCHAR(20) DEFAULT 'draft',
  agent_confirmed_at TIMESTAMPTZ,
  agent_confirm_note TEXT,
  worker_confirmed_at TIMESTAMPTZ,
  worker_confirm_note TEXT,
  reject_reason TEXT,
  rejected_at TIMESTAMPTZ,
  rejected_by VARCHAR(36) REFERENCES users(id),
  activated_at TIMESTAMPTZ,
  worker_work_status VARCHAR(20),
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agency_contracts_order_id_idx ON agency_contracts(order_id);
CREATE INDEX IF NOT EXISTS agency_contracts_party_a_id_idx ON agency_contracts(party_a_id);
CREATE INDEX IF NOT EXISTS agency_contracts_party_b_id_idx ON agency_contracts(party_b_id);
CREATE INDEX IF NOT EXISTS agency_contracts_status_idx ON agency_contracts(status);

-- 18. 诚信记录表
CREATE TABLE IF NOT EXISTS credit_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event VARCHAR(128) NOT NULL,
  score_change INTEGER NOT NULL,
  related_order_id VARCHAR(36) REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_records_user_id_idx ON credit_records(user_id);
CREATE INDEX IF NOT EXISTS credit_records_created_at_idx ON credit_records(created_at);

-- 19. 积分记录表
CREATE TABLE IF NOT EXISTS point_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL,
  points INTEGER NOT NULL,
  related_order_id VARCHAR(36) REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS point_records_user_id_idx ON point_records(user_id);
CREATE INDEX IF NOT EXISTS point_records_created_at_idx ON point_records(created_at);

-- 20. 保证金记录表
CREATE TABLE IF NOT EXISTS deposits (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  amount NUMERIC(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'paid',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deposits_user_id_idx ON deposits(user_id);
CREATE INDEX IF NOT EXISTS deposits_status_idx ON deposits(status);

-- 21. 评价表
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  target_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  reviewer_id VARCHAR(36) NOT NULL REFERENCES users(id),
  reviewer_role VARCHAR(20) NOT NULL,
  order_id VARCHAR(36) REFERENCES orders(id),
  rating INTEGER NOT NULL,
  content TEXT,
  hidden BOOLEAN NOT NULL DEFAULT false,
  target_role VARCHAR(20),
  target_type VARCHAR(20),
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_target_user_id_idx ON reviews(target_user_id);
CREATE INDEX IF NOT EXISTS reviews_reviewer_id_idx ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS reviews_order_id_idx ON reviews(order_id);
CREATE INDEX IF NOT EXISTS reviews_target_role_idx ON reviews(target_role);

-- 22. 推荐记录表
CREATE TABLE IF NOT EXISTS recommendations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR(36) REFERENCES orders(id),
  recommender_id VARCHAR(36) NOT NULL REFERENCES users(id),
  recommender_role VARCHAR(20) NOT NULL,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  creator_id VARCHAR(36) REFERENCES users(id),
  creator_commission_rate NUMERIC(5,2),
  maintainer_id VARCHAR(36) REFERENCES users(id),
  maintainer_commission_rate NUMERIC(5,2),
  referrer_id VARCHAR(36) REFERENCES users(id),
  referrer_commission_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS recommendations_order_id_idx ON recommendations(order_id);
CREATE INDEX IF NOT EXISTS recommendations_recommender_id_idx ON recommendations(recommender_id);
CREATE INDEX IF NOT EXISTS recommendations_worker_id_idx ON recommendations(worker_id);
CREATE INDEX IF NOT EXISTS recommendations_status_idx ON recommendations(status);

-- 23. 简历审核记录表
CREATE TABLE IF NOT EXISTS resume_reviews (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  type VARCHAR(20) NOT NULL,
  changes TEXT,
  review_type VARCHAR(20) DEFAULT 'create_resume',
  old_data TEXT,
  new_data TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reviewer_id VARCHAR(36) REFERENCES users(id),
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resume_reviews_worker_id_idx ON resume_reviews(worker_id);
CREATE INDEX IF NOT EXISTS resume_reviews_status_idx ON resume_reviews(status);

-- 24. 合同模板表
CREATE TABLE IF NOT EXISTS contract_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS contract_templates_type_idx ON contract_templates(type);
CREATE INDEX IF NOT EXISTS contract_templates_is_active_idx ON contract_templates(is_active);

-- 25. 字段级权限配置表
CREATE TABLE IF NOT EXISTS field_permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  visible_fields TEXT[],
  editable_fields TEXT[],
  enabled BOOLEAN DEFAULT false,
  description VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS field_permissions_role_idx ON field_permissions(role);
CREATE INDEX IF NOT EXISTS field_permissions_module_idx ON field_permissions(module);

-- 26. 系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB,
  description VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 插入8个测试账号（完整）
-- ============================================================

INSERT INTO users (id, name, phone, password_hash, role, review_status, is_active, register_source, reviewed_by, reviewed_at, wechat_openid) VALUES
  ('w001', '王秀兰', '13800005678', '$2a$10$dummyhashfordev', 'worker', 'approved', true, 'admin', 'w001', NOW(), 'dev_wx_worker'),
  ('a001', '张丽华', '13600001234', '$2a$10$dummyhashfordev', 'agent', 'approved', true, 'admin', 'a001', NOW(), 'dev_wx_agent'),
  ('r001', '陈招生', '13500003456', '$2a$10$dummyhashfordev', 'recruiter', 'approved', true, 'admin', 'r001', NOW(), 'dev_wx_recruiter'),
  ('i001', '李敏', '13700007890', '$2a$10$dummyhashfordev', 'instructor', 'approved', true, 'admin', 'i001', NOW(), 'dev_wx_instructor'),
  ('c001', '刘女士', '13900009876', '$2a$10$dummyhashfordev', 'customer', 'approved', true, 'admin', 'c001', NOW(), 'dev_wx_customer'),
  ('admin001', '管理员', '13000000001', '$2a$10$dummyhashfordev', 'admin', 'approved', true, 'admin', 'admin001', NOW(), 'dev_wx_admin'),
  ('ts001', '赵主管', '13100001111', '$2a$10$dummyhashfordev', 'training_supervisor', 'approved', true, 'admin', 'ts001', NOW(), 'dev_wx_training_supervisor'),
  ('wo001', '周运营', '13200002222', '$2a$10$dummyhashfordev', 'worker_operator', 'approved', true, 'admin', 'wo001', NOW(), 'dev_wx_worker_operator')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 插入系统初始配置
-- ============================================================

INSERT INTO system_settings (key, value, description) VALUES
  ('platform_info', '{"name":"家政共创平台","version":"2.0.0","description":"连接阿姨、经纪人、招生、讲师、客户的完整家政服务生态"}', '平台基本信息'),
  ('commission_defaults', '{"creator_rate":30,"maintainer_rate":20,"referrer_rate":50}', '佣金分账默认比例'),
  ('credit_rules', '{"initial_score":1000,"min_score":0,"blacklist_threshold":300}', '诚信分规则')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 完成！全部26张表 + 索引 + 测试数据已创建
-- ============================================================
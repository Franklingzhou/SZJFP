-- ============================================================
-- 家政共创平台 — 全量初始化SQL（全新数据库）
-- 执行环境: Supabase SQL Editor
-- 生成时间: 2026-06-13
-- 说明: 适用于全新数据库，按外键依赖顺序创建所有表
-- ============================================================

-- ============================================================
-- 1. 健康检查表
-- ============================================================
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. 用户表（所有角色共用）
-- ============================================================
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_review_status_idx ON users(review_status);
CREATE INDEX IF NOT EXISTS users_wechat_openid_idx ON users(wechat_openid);
CREATE INDEX IF NOT EXISTS users_register_source_idx ON users(register_source);

-- ============================================================
-- 3. 阿姨（Worker）
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  name VARCHAR(64) NOT NULL,
  age INTEGER,
  gender VARCHAR(4),
  origin VARCHAR(64),
  photo TEXT,
  id_card VARCHAR(18),
  job_types TEXT,
  experience_years INTEGER DEFAULT 0,
  specialties TEXT,
  certifications TEXT,
  expected_salary_min INTEGER DEFAULT 0,
  expected_salary_max INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'idle',
  available_date VARCHAR(20),
  creator_id VARCHAR(36) NOT NULL REFERENCES users(id),
  creator_role VARCHAR(20) NOT NULL,
  creator_commission_rate NUMERIC(5,2) DEFAULT 30.00,
  maintainer_id VARCHAR(36) REFERENCES users(id),
  maintainer_commission_rate NUMERIC(5,2),
  referrer_id VARCHAR(36) REFERENCES users(id),
  referrer_commission_rate NUMERIC(5,2),
  credit_score INTEGER NOT NULL DEFAULT 1000,
  deposit NUMERIC(10,2) DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  resume_review_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS workers_user_id_idx ON workers(user_id);
CREATE INDEX IF NOT EXISTS workers_creator_id_idx ON workers(creator_id);
CREATE INDEX IF NOT EXISTS workers_status_idx ON workers(status);
CREATE INDEX IF NOT EXISTS workers_job_types_idx ON workers(job_types);
CREATE INDEX IF NOT EXISTS workers_credit_score_idx ON workers(credit_score);

-- ============================================================
-- 4. 阿姨照片/视频相册
-- ============================================================
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

-- ============================================================
-- 5. 阿姨工作经验
-- ============================================================
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

-- ============================================================
-- 6. 客户表
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  requirement TEXT,
  address VARCHAR(255),
  credit_score INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS customers_user_id_idx ON customers(user_id);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);

-- ============================================================
-- 7. 客户跟进记录
-- ============================================================
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

-- ============================================================
-- 8. 招生线索
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  age INTEGER,
  origin VARCHAR(64),
  intention VARCHAR(100),
  source VARCHAR(50),
  gender VARCHAR(4),
  level VARCHAR(2) DEFAULT 'C',
  is_public BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  note TEXT,
  recruiter_id VARCHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS leads_recruiter_id_idx ON leads(recruiter_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads(phone);

-- ============================================================
-- 9. 线索跟进记录
-- ============================================================
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

-- ============================================================
-- 10. 培训课程
-- ============================================================
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
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
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

-- ============================================================
-- 11. 学员报名/培训记录
-- ============================================================
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

-- ============================================================
-- 12. 订单表
-- ============================================================
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
  status VARCHAR(20) NOT NULL DEFAULT 'created',
  service_fee NUMERIC(10,2) DEFAULT 0,
  commission_rate NUMERIC(5,2) DEFAULT 30.00,
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

-- ============================================================
-- 13. 订单签约记录
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
-- 14. 佣金规则
-- ============================================================
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

-- ============================================================
-- 15. 分账记录
-- ============================================================
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

-- ============================================================
-- 16. 合同表
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(128) NOT NULL,
  type VARCHAR(30) NOT NULL,
  party_a_id VARCHAR(36) NOT NULL REFERENCES users(id),
  party_b_id VARCHAR(36) NOT NULL REFERENCES users(id),
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

-- ============================================================
-- 17. 诚信记录
-- ============================================================
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

-- ============================================================
-- 18. 积分记录
-- ============================================================
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

-- ============================================================
-- 19. 保证金记录
-- ============================================================
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

-- ============================================================
-- 20. 评价表
-- ============================================================
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
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reviews_target_user_id_idx ON reviews(target_user_id);
CREATE INDEX IF NOT EXISTS reviews_reviewer_id_idx ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS reviews_order_id_idx ON reviews(order_id);
CREATE INDEX IF NOT EXISTS reviews_target_role_idx ON reviews(target_role);

-- ============================================================
-- 21. 推荐记录
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id VARCHAR(36) REFERENCES orders(id),
  recommender_id VARCHAR(36) NOT NULL REFERENCES users(id),
  recommender_role VARCHAR(20) NOT NULL,
  worker_id VARCHAR(36) NOT NULL REFERENCES workers(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS recommendations_order_id_idx ON recommendations(order_id);
CREATE INDEX IF NOT EXISTS recommendations_recommender_id_idx ON recommendations(recommender_id);
CREATE INDEX IF NOT EXISTS recommendations_worker_id_idx ON recommendations(worker_id);
CREATE INDEX IF NOT EXISTS recommendations_status_idx ON recommendations(status);

-- ============================================================
-- 22. 简历审核记录
-- ============================================================
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

-- ============================================================
-- 23. 合同模板
-- ============================================================
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

-- ============================================================
-- 24. 短信验证码表
-- ============================================================
CREATE TABLE IF NOT EXISTS sms_codes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sms_codes_phone_idx ON sms_codes(phone);

-- ============================================================
-- 完成！共创建24张表+所有索引
-- ============================================================

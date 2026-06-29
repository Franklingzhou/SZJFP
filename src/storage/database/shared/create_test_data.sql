-- ============================================================
-- 家政共创平台业务测试数据
-- 执行环境：Supabase SQL Editor
-- 需要先执行 create_all_tables.sql 和 create_missing_tables.sql
-- ============================================================

-- ============================================================
-- 1. 客户数据（测试用）
-- ============================================================
INSERT INTO users (id, name, phone, password_hash, role, review_status, is_active, register_source, reviewed_by, reviewed_at, wechat_openid) VALUES
  ('c001', '刘女士', '13900009876', '$2a$10$dummyhashfordev', 'customer', 'approved', true, 'admin', 'admin001', NOW(), 'dev_wx_customer1'),
  ('c002', '张女士', '13900001111', '$2a$10$dummyhashfordev', 'customer', 'approved', true, 'admin', 'admin001', NOW(), 'dev_wx_customer2'),
  ('c003', '李女士', '13900002222', '$2a$10$dummyhashfordev', 'customer', 'approved', true, 'admin', 'admin001', NOW(), 'dev_wx_customer3')
ON CONFLICT (id) DO NOTHING;

-- 创建customers表记录
INSERT INTO customers (id, user_id, name, phone, requirement, address, status, agent_id, created_at) VALUES
  ('cust001', 'c001', '刘女士', '13900009876', '需要育婴师', '北京市朝阳区', 'converted', 'a001', NOW()),
  ('cust002', 'c002', '张女士', '13900001111', '需要保洁服务', '北京市海淀区', 'matching', 'a001', NOW()),
  ('cust003', 'c003', '李女士', '13900002222', '需要月嫂', '北京市西城区', 'following', 'a001', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. 订单数据（不同状态）
-- ============================================================
INSERT INTO orders (id, title, job_type, salary_min, salary_max, location, description, agent_id, worker_id, customer_id, recommender_id, status, service_fee, commission_rate, service_type, amount, start_date, reviewed, salary_type, work_duration, contact_name, contact_phone, signed_worker_id, signed_at, created_at, updated_at) VALUES
  ('o001', '朝阳区保洁服务', '保洁', 4000, 4500, '北京市朝阳区', '日常保洁，每周两次', 'a001', NULL, 'c001', NULL, 'created', 400, 30, 'monthly', 4000, '2026-07-01', false, 'monthly', '每周2次', '张女士', '13900009876', NULL, NULL, NOW(), NOW()),
  ('o002', '海淀区育婴师', '育婴', 6000, 7000, '北京市海淀区', '照顾2岁宝宝，需要有经验', 'a001', 'w001', 'c002', 'a001', 'signed', 600, 30, 'monthly', 6500, '2026-06-15', false, 'monthly', '全天', '李女士', '13900002222', 'w001', NOW(), NOW(), NOW()),
  ('o003', '西城区月嫂', '月嫂', 12000, 15000, '北京市西城区', '新生儿护理，26天', 'a001', NULL, 'c003', NULL, 'open', 1200, 30, 'daily', 13800, '2026-08-01', false, 'daily', '26天', '王女士', '13900001111', NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. 线索数据
-- ============================================================
INSERT INTO leads (id, name, phone, gender, age, origin, job_types, expected_salary, status, creator_id, creator_role, referrer_id, referrer_role, recruiter_id, created_at, updated_at) VALUES
  ('l001', '李小红', '13800001111', '女', 30, '安徽', '保洁,育婴', 4500, 'registered', 'r001', 'recruiter', NULL, NULL, 'r001', NOW(), NOW()),
  ('l002', '王小花', '13800002222', '女', 38, '河南', '月嫂', 12000, 'signed', 'r001', 'recruiter', 'a001', 'agent', 'r001', NOW(), NOW()),
  ('l003', '赵小芳', '13800003333', '女', 28, '山东', '育婴', 5000, 'signed', 'r001', 'recruiter', NULL, NULL, 'r001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. 中介合同数据
-- ============================================================
INSERT INTO agency_contracts (id, order_id, title, party_a_id, party_a_name, party_b_id, party_b_name, party_b_phone, party_c_id, party_c_name, party_c_phone, amount, service_fee, start_date, end_date, status, agent_confirmed_at, worker_confirmed_at, activated_at, created_by, created_at, updated_at) VALUES
  ('ac001', 'o002', '育婴服务合同', 'a001', '经纪人张三', 'w001', '王秀兰', '13800005678', 'c002', '李女士', '13900002222', 6500, 600, '2026-06-15', '2027-06-14', 'active', NOW(), NOW(), NOW(), 'a001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. 训练合同数据
-- ============================================================
INSERT INTO training_contracts (id, lead_id, title, party_a_id, party_a_name, party_b_name, party_b_phone, amount, paid_amount, start_date, end_date, status, supervisor_confirmed_at, activated_at, created_by, created_at) VALUES
  ('tc001', 'l002', '月嫂培训合同', 'r001', '招生李四', '王小花', '13800002222', 3000, 3000, '2026-06-20', '2026-07-20', 'active', NOW(), NOW(), 'r001', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. 推荐记录数据
-- ============================================================
INSERT INTO recommendations (id, order_id, recommender_id, recommender_role, worker_id, status, creator_id, creator_commission_rate, maintainer_id, maintainer_commission_rate, referrer_id, referrer_commission_rate, created_at, updated_at) VALUES
  ('rec001', 'o002', 'a001', 'agent', 'w001', 'confirmed', 'a001', 30, 'a001', 20, 'a001', 50, NOW(), NOW()),
  ('rec002', 'o003', 'a001', 'agent', 'w001', 'pending', 'a001', 30, NULL, NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. 评价数据
-- ============================================================
INSERT INTO reviews (id, target_user_id, reviewer_id, reviewer_role, order_id, rating, content, hidden, target_role, target_type, updated_at, created_at) VALUES
  ('rev001', 'w001', 'c002', 'customer', 'o002', 5, '王阿姨服务非常好，很专业，宝宝很喜欢她', false, 'worker', 'worker', NOW(), NOW()),
  ('rev002', 'a001', 'c001', 'customer', NULL, 4, '经纪人服务态度很好，很耐心', false, 'agent', 'agent', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. 课程数据（补充）
-- ============================================================
INSERT INTO courses (id, name, description, type, hours, price, instructor_id, status, max_students, created_at, updated_at) VALUES
  ('c001', '月嫂初级培训', '新生儿护理基础课程', '月嫂', 48, 3000, 'i001', 'active', 20, NOW(), NOW()),
  ('c002', '育婴师培训', '0-3岁婴幼儿护理', '育婴', 36, 2000, 'i001', 'active', 15, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. 报名数据
-- ============================================================
INSERT INTO enrollments (id, course_id, worker_id, student_name, status, enrolled_by, created_at) VALUES
  ('e001', 'c001', 'w001', '王秀兰', 'completed', 'r001', NOW()),
  ('e002', 'c002', 'w001', '王秀兰', 'in_progress', 'r001', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. 佣金记录数据
-- ============================================================
INSERT INTO commission_records (id, order_id, recommendation_id, creator_id, maintainer_id, recommender_id, creator_amount, maintainer_amount, recommender_amount, total_amount, status, settled_at, created_at, updated_at) VALUES
  ('cr001', 'o002', 'rec001', 'a001', 'a001', 'a001', 585, 390, 975, 1950, 'pending', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. 平台费用数据
-- ============================================================
INSERT INTO platform_fees (id, order_id, contract_id, contract_type, amount, status, paid_at, created_at, updated_at) VALUES
  ('pf001', 'o002', 'ac001', 'agency', 600, 'pending', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. 通知数据
-- ============================================================
INSERT INTO notifications (id, user_id, type, title, content, related_id, related_type, is_read, created_at) VALUES
  ('n001', 'a001', 'order', '新订单通知', '您有一个新订单待处理：朝阳区保洁服务', 'o001', 'order', false, NOW()),
  ('n002', 'w001', 'review', '简历审核通过', '您的简历已审核通过，可以开始接单了', 'w001', 'worker', true, NOW()),
  ('n003', 'admin001', 'system', '系统通知', '本月新增3个线索，请关注跟进情况', NULL, NULL, false, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 完成！已插入业务测试数据
-- ============================================================

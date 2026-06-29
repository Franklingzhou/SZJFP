-- 家政共创平台 - 测试账号数据
-- 在执行此脚本前，请确保已执行 supabase-init.sql 创建表结构

-- ============================================
-- 测试用户数据
-- ============================================

INSERT INTO users (phone, name, role, status) VALUES
-- 管理员
('13800138001', '超级管理员', 'admin', 'active'),
-- 经纪人
('13800138002', '张经纪人', 'agent', 'active'),
-- 招聘者
('13800138003', '李招聘', 'recruiter', 'active'),
-- 培训师
('13800138004', '王培训师', 'instructor', 'active'),
-- 客户
('13800138005', '赵女士', 'customer', 'active'),
-- 阿姨
('13800138006', '孙阿姨', 'worker', 'active'),
-- 培训主管
('13800138007', '周主管', 'training_supervisor', 'active'),
-- 阿姨操作员
('13800138008', '吴操作员', 'worker_operator', 'active')
ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

-- ============================================
-- 测试阿姨数据（关联到阿姨用户）
-- ============================================

INSERT INTO workers (user_id, worker_no, name, gender, age, service_types, service_area, experience, salary_expectation, skills, certificates, introduction, status, work_status, review_status)
SELECT 
    u.id,
    'WK' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || LPAD((SELECT COUNT(*) FROM workers)::TEXT + 1, 4, '0'),
    u.name,
    '女',
    45,
    ARRAY['保洁', '做饭'],
    '北京市朝阳区',
    8,
    6000.00,
    ARRAY['打扫卫生', '做饭', '照顾老人'],
    ARRAY['身份证', '健康证'],
    '本人从事家政服务8年，工作认真负责，擅长日常保洁和家庭烹饪。',
    'active',
    'available',
    'approved'
FROM users u WHERE u.phone = '13800138006'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 测试客户数据（关联到客户用户）
-- ============================================

INSERT INTO customers (user_id, name, phone, address, preferred_service_types)
SELECT 
    u.id,
    u.name,
    u.phone,
    '北京市海淀区中关村大街1号',
    ARRAY['保洁', '育儿']
FROM users u WHERE u.phone = '13800138005'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 测试短信验证码（用于登录测试）
-- 验证码有效期2小时
-- ============================================

INSERT INTO sms_codes (phone, code, type, expires_at, used) VALUES
('13800138001', '123456', 'login', NOW() + INTERVAL '2 hours', false),
('13800138002', '123456', 'login', NOW() + INTERVAL '2 hours', false),
('13800138003', '123456', 'login', NOW() + INTERVAL '2 hours', false),
('13800138004', '123456', 'login', NOW() + INTERVAL '2 hours', false),
('13800138005', '123456', 'login', NOW() + INTERVAL '2 hours', false),
('13800138006', '123456', 'login', NOW() + INTERVAL '2 hours', false),
('13800138007', '123456', 'login', NOW() + INTERVAL '2 hours', false),
('13800138008', '123456', 'login', NOW() + INTERVAL '2 hours', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- 测试订单数据
-- ============================================

INSERT INTO orders (order_no, customer_id, worker_id, service_type, service_area, service_address, start_date, end_date, duration, unit_price, total_amount, status, priority)
SELECT
    'DD' || LPAD(EXTRACT(YEAR FROM NOW())::TEXT, 4, '0') || LPAD(EXTRACT(MONTH FROM NOW())::TEXT, 2, '0') || LPAD(EXTRACT(DAY FROM NOW())::TEXT, 2, '0') || '001',
    c.id,
    w.id,
    '日常保洁',
    '北京市海淀区',
    '北京市海淀区中关村大街1号',
    NOW(),
    NOW() + INTERVAL '1 day',
    4,
    50.00,
    200.00,
    'pending',
    'normal'
FROM customers c, workers w
WHERE c.user_id = (SELECT id FROM users WHERE phone = '13800138005')
AND w.user_id = (SELECT id FROM users WHERE phone = '13800138006')
ON CONFLICT (order_no) DO NOTHING;

-- ============================================
-- 测试线索数据
-- ============================================

INSERT INTO leads (name, phone, source, service_intent, budget_range, status, intent_level) VALUES
('刘女士', '13900139001', '微信公众号', '日常保洁', '1000-3000', 'new', 'high'),
('陈先生', '13900139002', '朋友推荐', '育儿嫂', '5000-8000', 'following', 'medium'),
('杨女士', '13900139003', '小程序', '月嫂', '8000-12000', 'converted', 'high')
ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- 测试培训课程数据
-- ============================================

INSERT INTO courses (course_no, name, description, category, duration_hours, price, status) VALUES
('COURSE001', '家政服务基础培训', '学习家政服务的基本技能和礼仪规范', '基础培训', 24, 0.00, 'active'),
('COURSE002', '育儿嫂专业培训', '掌握婴幼儿护理、早教等专业技能', '专业培训', 48, 1200.00, 'active'),
('COURSE003', '月嫂高级培训', '产妇护理、新生儿护理等高级技能', '专业培训', 72, 2000.00, 'active')
ON CONFLICT (course_no) DO NOTHING;

-- ============================================
-- 测试团队数据
-- ============================================

INSERT INTO teams (name, leader_id, member_count)
SELECT
    '金牌家政团队',
    u.id,
    1
FROM users u WHERE u.phone = '13800138002'
ON CONFLICT DO NOTHING;

-- ============================================
-- 测试团队成员数据
-- ============================================

INSERT INTO team_members (team_id, user_id, role)
SELECT
    t.id,
    u.id,
    'member'
FROM teams t, users u
WHERE t.name = '金牌家政团队'
AND u.phone = '13800138006'
ON CONFLICT DO NOTHING;

-- ============================================
-- 测试评价数据
-- ============================================

INSERT INTO reviews (order_id, worker_id, customer_id, rating, content, tags, status)
SELECT
    o.id,
    w.id,
    c.id,
    5,
    '服务非常满意，阿姨打扫得很干净，态度也很好！',
    ARRAY['认真负责', '干净整洁'],
    'published'
FROM orders o, workers w, customers c
WHERE o.order_no LIKE 'DD%001'
AND w.user_id = (SELECT id FROM users WHERE phone = '13800138006')
AND c.user_id = (SELECT id FROM users WHERE phone = '13800138005')
ON CONFLICT DO NOTHING;

-- ============================================
-- 测试系统设置数据
-- ============================================

INSERT INTO settings (key, value, description) VALUES
('platform_name', '"家政共创平台"', '平台名称'),
('service_types', '["日常保洁", "深度清洁", "做饭阿姨", "育儿嫂", "月嫂", "老人护理"]', '服务类型列表'),
('worker_min_age', '20', '阿姨最小年龄'),
('worker_max_age', '60', '阿姨最大年龄'),
('service_fee_rate', '0.1', '平台服务费比例')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

SELECT '测试数据插入完成！' as result;

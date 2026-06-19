-- 家政共创平台 数据库表结构
-- Supabase (PostgreSQL)

-- ============================================
-- 1. 用户与认证相关
-- ============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'worker', -- admin, agent, recruiter, instructor, customer, worker, training_supervisor, worker_operator
    name VARCHAR(100),
    avatar VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active', -- active, paused, blacklisted
    credit_score INT DEFAULT 100, -- 诚信分
    points INT DEFAULT 0, -- 积分
    deposit DECIMAL(10,2) DEFAULT 0, -- 保证金
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 微信用户绑定表
CREATE TABLE IF NOT EXISTS wechat_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    openid VARCHAR(100) UNIQUE,
    unionid VARCHAR(100),
    session_key VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 短信验证码表
CREATE TABLE IF NOT EXISTS sms_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    type VARCHAR(20) DEFAULT 'login', -- login, register, reset_password
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 阿姨管理
-- ============================================

-- 阿姨表（扩展用户信息）
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    worker_no VARCHAR(50) UNIQUE, -- 阿姨编号
    
    -- 基本信息
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    age INT,
    id_card VARCHAR(18),
    id_card_front VARCHAR(500), -- 身份证正面
    id_card_back VARCHAR(500), -- 身份证背面
    
    -- 服务信息
    service_types TEXT[], -- 服务类型：保洁、月嫂、育儿等
    service_area VARCHAR(200), -- 服务区域
    experience INT, -- 工作经验年限
    salary_expectation DECIMAL(10,2), -- 期望薪资
    
    -- 简历信息
    resume VARCHAR(500), -- 简历文件URL
    skills TEXT[], -- 技能标签
    certificates TEXT[], -- 证书
    introduction TEXT, -- 个人介绍
    photos TEXT[], -- 照片集
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, paused, blacklisted
    work_status VARCHAR(20) DEFAULT 'available', -- available, busy, off
    
    -- 审核
    review_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 客户管理
-- ============================================

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(10),
    address VARCHAR(500),
    address_lat DECIMAL(10,8),
    address_lng DECIMAL(11,8),
    
    -- 客户等级
    level VARCHAR(20) DEFAULT 'normal', -- normal, vip
    source VARCHAR(50), -- 客户来源
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, blacklisted
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 客户跟进记录
CREATE TABLE IF NOT EXISTS customer_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- 跟进人
    type VARCHAR(50), -- call, visit, message
    content TEXT,
    next_followup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 订单管理
-- ============================================

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(50) UNIQUE NOT NULL,
    
    customer_id UUID REFERENCES customers(id),
    worker_id UUID REFERENCES workers(id),
    
    -- 服务信息
    service_type VARCHAR(50) NOT NULL,
    service_content TEXT,
    service_address VARCHAR(500),
    service_start_time TIMESTAMPTZ,
    service_end_time TIMESTAMPTZ,
    service_duration INT, -- 时长（小时）
    
    -- 价格
    original_price DECIMAL(10,2),
    final_price DECIMAL(10,2),
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending', -- pending, matched, signed, in_progress, completed, cancelled
    matching_type VARCHAR(20), -- auto, manual
    
    -- 签约
    signed_at TIMESTAMPTZ,
    sign_confirmed BOOLEAN DEFAULT FALSE,
    
    -- 备注
    remarks TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 订单推荐记录
CREATE TABLE IF NOT EXISTS order_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    responded_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 线索管理
-- ============================================

-- 线索表
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_no VARCHAR(50) UNIQUE NOT NULL,
    
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(10),
    
    -- 意向信息
    intent_level VARCHAR(10) DEFAULT 'B', -- A, B, C, D
    interest_type VARCHAR(50), -- 感兴趣的服务类型
    budget DECIMAL(10,2),
    
    -- 来源
    source VARCHAR(50), -- 地推, 转介绍, 广告, 线上
    assigned_to UUID REFERENCES users(id), -- 分配给招生专员
    
    -- 公海机制
    is_public BOOLEAN DEFAULT FALSE, -- 是否在公海
    last_contact_at TIMESTAMPTZ,
    no_contact_days INT DEFAULT 0, -- 未联系天数
    
    -- 状态
    status VARCHAR(20) DEFAULT 'new', -- new, following, contacted, converted, closed
    
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 线索跟进记录
CREATE TABLE IF NOT EXISTS lead_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    content TEXT,
    next_followup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 培训管理
-- ============================================

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_no VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES users(id),
    
    -- 课程信息
    type VARCHAR(50), -- 岗前培训, 技能提升, 考证
    duration INT, -- 课程时长（小时）
    price DECIMAL(10,2),
    max_students INT,
    min_students INT DEFAULT 1,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    review_status VARCHAR(20) DEFAULT 'pending',
    
    location VARCHAR(200), -- 上课地点
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 套餐课程
CREATE TABLE IF NOT EXISTS course_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    validity_days INT, -- 有效期天数
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 套餐子课程关联
CREATE TABLE IF NOT EXISTS course_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES course_packages(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0
);

-- 排课表
CREATE TABLE IF NOT EXISTS course_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(200),
    teacher_id UUID REFERENCES users(id),
    
    -- 容量
    max_students INT,
    enrolled_count INT DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    review_status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 学员表
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    student_no VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(10),
    age INT,
    id_card VARCHAR(18),
    
    -- 来源
    source VARCHAR(50), -- 招生, 转化
    recruiter_id UUID REFERENCES users(id),
    
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 报名表
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_schedule_id UUID REFERENCES course_schedules(id),
    
    -- 费用
    package_id UUID REFERENCES course_packages(id),
    original_price DECIMAL(10,2),
    actual_price DECIMAL(10,2),
    paid DECIMAL(10,2) DEFAULT 0,
    
    -- 状态
    status VARCHAR(20) DEFAULT 'enrolled', -- enrolled, studying, completed, dropped
    enrollment_date DATE,
    
    -- 考勤
    attendance_records JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 考核成绩
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    score DECIMAL(5,2),
    exam_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 证书表
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_no VARCHAR(50) UNIQUE NOT NULL,
    student_id UUID REFERENCES students(id),
    course_id UUID REFERENCES courses(id),
    
    certificate_type VARCHAR(50),
    issue_date DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'issued',
    
    file_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. 合同管理
-- ============================================

-- 合同模板
CREATE TABLE IF NOT EXISTS contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50), -- service, training, lead
    content TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 合同表
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_no VARCHAR(50) UNIQUE NOT NULL,
    template_id UUID REFERENCES contract_templates(id),
    type VARCHAR(50), -- service, training, lead
    
    -- 签约方
    party_a_name VARCHAR(200),
    party_a_phone VARCHAR(20),
    party_b_name VARCHAR(200),
    party_b_phone VARCHAR(20),
    
    -- 内容
    content JSONB,
    attachments TEXT[],
    
    -- 签署
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending, signed, cancelled
    signed_at TIMESTAMPTZ,
    
    -- 关联ID
    order_id UUID REFERENCES orders(id),
    student_id UUID REFERENCES students(id),
    lead_id UUID REFERENCES leads(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. 佣金与结算
-- ============================================

-- 佣金规则
CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50), -- order, enrollment, referral
    
    -- 规则配置
    rule_config JSONB NOT NULL, -- {rate: 0.1, min_amount: 100, max_amount: 1000}
    
    status VARCHAR(20) DEFAULT 'active',
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 佣金记录
CREATE TABLE IF NOT EXISTS commission_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES commission_rules(id),
    
    user_id UUID REFERENCES users(id), -- 受益人
    type VARCHAR(50), -- order, enrollment, referral
    
    -- 关联
    order_id UUID REFERENCES orders(id),
    enrollment_id UUID REFERENCES enrollments(id),
    
    -- 金额
    order_amount DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, settled, withdrawn
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);

-- 分账记录
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_no VARCHAR(50) UNIQUE NOT NULL,
    
    user_id UUID REFERENCES users(id),
    type VARCHAR(50), -- worker, agent, recruiter
    
    -- 金额
    total_orders INT DEFAULT 0,
    total_amount DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    actual_amount DECIMAL(10,2),
    
    -- 状态
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, rejected
    paid_at TIMESTAMPTZ,
    
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. 评价管理
-- ============================================

-- 评价表
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id),
    customer_id UUID REFERENCES customers(id),
    
    rating INT CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    tags TEXT[],
    
    reply TEXT,
    replied_at TIMESTAMPTZ,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, published, hidden
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 简历审核
CREATE TABLE IF NOT EXISTS resume_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES workers(id),
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    notes TEXT,
    
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. 系统设置
-- ============================================

-- 系统设置
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description VARCHAR(200),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 消息通知
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    type VARCHAR(50), -- system, order, review
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    data JSONB, -- 额外数据
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 平台费用配置
CREATE TABLE IF NOT EXISTS platform_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- order, enrollment
    fee_rate DECIMAL(5,4), -- 费率
    fixed_fee DECIMAL(10,2), -- 固定费用
    min_fee DECIMAL(10,2),
    max_fee DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. 团队管理
-- ============================================

-- 团队表
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    leader_id UUID REFERENCES users(id),
    parent_id UUID REFERENCES teams(id),
    
    member_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 团队成员
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    
    joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. 阿姨申请
-- ============================================

CREATE TABLE IF NOT EXISTS worker_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    id_card VARCHAR(18),
    
    service_types TEXT[],
    experience INT,
    introduction TEXT,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    notes TEXT,
    
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_worker_id ON orders(worker_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_intent_level ON leads(intent_level);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- RLS 策略 (Row Level Security)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 管理员可以访问所有数据
CREATE POLICY "Admin full access" ON users FOR ALL USING (true) WITH CHECK (true);

-- 用户只能访问自己的数据
CREATE POLICY "Users own data" ON users FOR ALL USING (auth.uid() = id);

-- 其他表的RLS策略（简化版）
CREATE POLICY "Authenticated access" ON workers FOR ALL USING (true);
CREATE POLICY "Authenticated access" ON customers FOR ALL USING (true);
CREATE POLICY "Authenticated access" ON orders FOR ALL USING (true);
CREATE POLICY "Authenticated access" ON leads FOR ALL USING (true);
CREATE POLICY "Authenticated access" ON courses FOR ALL USING (true);
CREATE POLICY "Authenticated access" ON students FOR ALL USING (true);
CREATE POLICY "Authenticated access" ON enrollments FOR ALL USING (true);
CREATE POLICY "Authenticated access" ON reviews FOR ALL USING (true);
CREATE POLICY "Users notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

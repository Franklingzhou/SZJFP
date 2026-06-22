import {
  pgTable, varchar, text, timestamp, boolean, integer,
  numeric, index, serial, jsonb,
} from "drizzle-orm/pg-core";

// ============================================================
// 系统表（禁止删除）
// ============================================================
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============================================================
// 用户与角色
// ============================================================

/** 用户表 — 所有角色共用，通过 role 区分身份 */
export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    password_hash: varchar("password_hash", { length: 255 }),  // 密码哈希（预留）
    role: varchar("role", { length: 20 }).notNull(),          // worker / agent / recruiter / instructor / customer / admin / training_supervisor / worker_operator
    review_status: varchar("review_status", { length: 20 }).notNull().default("pending"),  // pending / approved / rejected
    wechat_openid: varchar("wechat_openid", { length: 64 }),   // 微信OpenID，自动登录
    wechat_unionid: varchar("wechat_unionid", { length: 64 }),   // 微信UnionID（多应用联合）
    is_active: boolean("is_active").default(true).notNull(),
    reviewed_by: varchar("reviewed_by", { length: 36 }),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    register_source: varchar("register_source", { length: 20 }).default("self"),  // admin/self
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("users_phone_idx").on(table.phone),
    index("users_role_idx").on(table.role),
    index("users_review_status_idx").on(table.review_status),
    index("users_wechat_openid_idx").on(table.wechat_openid),
  ]
);

// ============================================================
// 阿姨（Worker）
// ============================================================

/** 阿姨简历表 */
export const workers = pgTable(
  "workers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).references(() => users.id),  // 可空：预注册时user_id=null，用户登录后认领绑定
    name: varchar("name", { length: 64 }).notNull(),
    phone: varchar("phone", { length: 20 }),               // 手机号（签约时写入，用于去重）
    age: integer("age"),
    gender: varchar("gender", { length: 4 }),
    origin: varchar("origin", { length: 64 }),            // 籍贯
    photo: text("photo"),                                  // 头像 URL
    id_card: varchar("id_card", { length: 18 }),          // 身份证号
    job_types: text("job_types"),                          // 逗号分隔: 保姆,月嫂,育儿嫂
    experience_years: integer("experience_years").default(0),
    specialties: text("specialties"),                      // 逗号分隔特长
    certifications: text("certifications"),                // 逗号分隔证书
    expected_salary_min: integer("expected_salary_min").default(0),
    expected_salary_max: integer("expected_salary_max").default(0),
    status: varchar("status", { length: 20 }).notNull().default("pending"),  // pending / available / busy / inactive
    available_date: varchar("available_date", { length: 20 }),
    creator_id: varchar("creator_id", { length: 36 }).notNull().references(() => users.id),  // 录入人
    creator_role: varchar("creator_role", { length: 20 }).notNull(),       // agent / recruiter / instructor
    creator_commission_rate: numeric("creator_commission_rate", { precision: 5, scale: 2 }).default("30.00"),
    maintainer_id: varchar("maintainer_id", { length: 36 }).references(() => users.id),
    maintainer_commission_rate: numeric("maintainer_commission_rate", { precision: 5, scale: 2 }),
    referrer_id: varchar("referrer_id", { length: 36 }).references(() => users.id),
    referrer_commission_rate: numeric("referrer_commission_rate", { precision: 5, scale: 2 }),
    lead_id: varchar("lead_id", { length: 36 }).references(() => leads.id, { onDelete: "set null" }),  // 来源线索
    credit_score: integer("credit_score").notNull().default(1000),         // 诚信分
    deposit: numeric("deposit", { precision: 10, scale: 2 }).default("0"), // 保证金
    points: integer("points").notNull().default(0),                        // 积分
    resume_review_status: varchar("resume_review_status", { length: 20 }).notNull().default("draft"),  // draft / pending / approved / rejected
    remark: text("remark"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("workers_user_id_idx").on(table.user_id),
    index("workers_creator_id_idx").on(table.creator_id),
    index("workers_status_idx").on(table.status),
    index("workers_phone_idx").on(table.phone),
    index("workers_lead_id_idx").on(table.lead_id),
    index("workers_job_types_idx").on(table.job_types),
    index("workers_credit_score_idx").on(table.credit_score),
  ]
);

/** 阿姨照片/视频相册 */
export const worker_media = pgTable(
  "worker_media",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    worker_id: varchar("worker_id", { length: 36 }).notNull().references(() => workers.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),      // photo / video
    category: varchar("category", { length: 50 }),        // 生活照/工作照/做饭/保洁/育儿/养老/月嫂/才艺/视频
    url: text("url").notNull(),
    sort_order: integer("sort_order").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("worker_media_worker_id_idx").on(table.worker_id),
    index("worker_media_type_idx").on(table.type),
  ]
);

/** 阿姨工作经验表 */
export const worker_work_experience = pgTable(
  "worker_work_experience",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    worker_id: varchar("worker_id", { length: 36 }).notNull().references(() => workers.id, { onDelete: "cascade" }),
    period: varchar("period", { length: 50 }).notNull(),    // 工作时间段: 2020-2023
    employer: varchar("employer", { length: 128 }),          // 雇主/公司
    job_type: varchar("job_type", { length: 50 }),          // 工种
    description: text("description"),                         // 工作描述
    sort_order: integer("sort_order").default(0),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("worker_work_experience_worker_id_idx").on(table.worker_id),
  ]
);

// ============================================================
// 客户
// ============================================================

/** 客户表 */
export const customers = pgTable(
  "customers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    name: varchar("name", { length: 64 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    requirement: text("requirement"),                       // 客户需求
    address: varchar("address", { length: 255 }),          // 地址
    credit_score: integer("credit_score").notNull().default(1000),
    status: varchar("status", { length: 20 }).notNull().default("new"),  // new / matching / signed / lost
    source: varchar("source", { length: 50 }),             // 客户来源
    agent_id: varchar("agent_id", { length: 36 }).references(() => users.id), // 归属经纪人
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("customers_user_id_idx").on(table.user_id),
    index("customers_phone_idx").on(table.phone),
    index("customers_status_idx").on(table.status),
    index("customers_agent_id_idx").on(table.agent_id),
  ]
);

// ============================================================
// 招生线索
// ============================================================

/** 招生线索表 */
export const leads = pgTable(
  "leads",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    age: integer("age"),
    origin: varchar("origin", { length: 64 }),              // 籍贯
    intention: varchar("intention", { length: 100 }),         // 求职意向（工种）
    source: varchar("source", { length: 50 }),               // 来源：58同城/赶集/转介绍等
    gender: varchar("gender", { length: 4 }),                // 性别
    level: varchar("level", { length: 2 }).default("C"),     // 线索等级: A/B/C/D
    is_public: boolean("is_public").default(false),          // 是否在公海库
    status: varchar("status", { length: 20 }).notNull().default("new"),  // new / following / signed / lost（2.0: 签约自动创建worker）
    note: text("note"),
    recruiter_id: varchar("recruiter_id", { length: 36 }).notNull().references(() => users.id),
    signed_at: timestamp("signed_at", { withTimezone: true }),         // 签约时间
    signed_by: varchar("signed_by", { length: 36 }).references(() => users.id), // 签约操作人
    sign_worker_id: varchar("sign_worker_id", { length: 36 }),         // 签约后生成的worker_id
    want_training: boolean("want_training").default(false),            // 是否想培训
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("leads_recruiter_id_idx").on(table.recruiter_id),
    index("leads_status_idx").on(table.status),
    index("leads_phone_idx").on(table.phone),
    index("leads_signed_by_idx").on(table.signed_by),
    index("leads_sign_worker_id_idx").on(table.sign_worker_id),
  ]
);

/** 线索跟进记录 */
export const lead_follow_ups = pgTable(
  "lead_follow_ups",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    lead_id: varchar("lead_id", { length: 36 }).notNull().references(() => leads.id, { onDelete: "cascade" }),
    content: text("content"),                                 // 跟进内容
    result: varchar("result", { length: 20 }),                // 跟进结果：有意向/跟进中/已成交/流失
    follow_up_by: varchar("follow_up_by", { length: 36 }).notNull().references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("lead_follow_ups_lead_id_idx").on(table.lead_id),
    index("lead_follow_ups_follow_up_by_idx").on(table.follow_up_by),
  ]
);

// ============================================================
// 培训
// ============================================================

/** 培训课程表 */
export const courses = pgTable(
  "courses",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    instructor_id: varchar("instructor_id", { length: 36 }).notNull().references(() => users.id),
    type: varchar("type", { length: 20 }).notNull(),          // 新手入行 / 技能提升
    max_students: integer("max_students").notNull().default(30),
    current_students: integer("current_students").notNull().default(0),
    start_date: varchar("start_date", { length: 20 }),
    end_date: varchar("end_date", { length: 20 }),
    hours: integer("hours").default(0),                      // 课时
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    description: text("description"),
    location: varchar("location", { length: 128 }),
    course_type: varchar("course_type", { length: 20 }).notNull().default("single"),  // single / package
    status: varchar("status", { length: 20 }).notNull().default("upcoming"),  // draft / pending_approval / upcoming / ongoing / completed / cancelled
    approved_by: varchar("approved_by", { length: 36 }).references(() => users.id),  // 审批人（培训主管）
    approved_at: timestamp("approved_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("courses_instructor_id_idx").on(table.instructor_id),
    index("courses_status_idx").on(table.status),
    index("courses_type_idx").on(table.type),
    index("courses_course_type_idx").on(table.course_type),
  ]
);

/** 课程套餐包含的单课列表 */
export const coursePackageItems = pgTable(
  "course_package_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    packageCourseId: varchar("package_course_id", { length: 36 }).notNull().references(() => courses.id, { onDelete: "cascade" }),
    itemCourseId: varchar("item_course_id", { length: 36 }).notNull().references(() => courses.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("course_package_items_package_idx").on(table.packageCourseId),
    index("course_package_items_item_idx").on(table.itemCourseId),
  ]
);

/** 学员报名/培训记录 — 2.0: student_id → worker_id，关联workers表 */
export const enrollments = pgTable(
  "enrollments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    course_id: varchar("course_id", { length: 36 }).notNull().references(() => courses.id),
    worker_id: varchar("worker_id", { length: 36 }).notNull().references(() => workers.id),  // 2.0: 关联阿姨
    student_name: varchar("student_name", { length: 64 }),     // 冗余，报名时的阿姨名
    enrolled_by: varchar("enrolled_by", { length: 36 }).references(() => users.id),  // 报名操作人
    score: integer("score"),                                  // 培训得分
    passed: boolean("passed"),                                // 是否通过
    certificate: varchar("certificate", { length: 128 }),     // 证书名称
    status: varchar("status", { length: 20 }).notNull().default("enrolled"),  // enrolled / attending / qualified / failed
    completed_at: timestamp("completed_at", { withTimezone: true }),
    grade: varchar("grade", { length: 20 }),                 // 结课考核等级
    graded_by: varchar("graded_by", { length: 36 }).references(() => users.id),  // 打分人
    graded_at: timestamp("graded_at", { withTimezone: true }),  // 打分时间
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("enrollments_course_id_idx").on(table.course_id),
    index("enrollments_worker_id_idx").on(table.worker_id),
    index("enrollments_status_idx").on(table.status),
  ]
);

// ============================================================
// 订单
// ============================================================

/** 订单表 */
export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    title: varchar("title", { length: 128 }).notNull(),
    job_type: varchar("job_type", { length: 20 }).notNull(),  // 保姆/月嫂/育儿嫂/老人护理/钟点工
    salary_min: integer("salary_min").default(0),
    salary_max: integer("salary_max").default(0),
    location: varchar("location", { length: 128 }),
    description: text("description"),
    agent_id: varchar("agent_id", { length: 36 }).notNull().references(() => users.id),
    worker_id: varchar("worker_id", { length: 36 }).references(() => users.id),
    customer_id: varchar("customer_id", { length: 36 }).references(() => users.id),
    status: varchar("status", { length: 20 }).notNull().default("open"),  // open/interviewing/signed/completed/cancelled（2.0对齐）
    service_fee: numeric("service_fee", { precision: 10, scale: 2 }).default("0"),
    commission_rate: numeric("commission_rate", { precision: 5, scale: 2 }).default("30.00"),
    service_type: varchar("service_type", { length: 50 }),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    start_date: varchar("start_date", { length: 20 }),
    reviewed: boolean("reviewed").default(false),
    salary_type: varchar("salary_type", { length: 20 }),           // 薪资类型：月薪/日薪/计件
    work_duration: varchar("work_duration", { length: 50 }),       // 工作时长：住家/白班/钟点
    contact_name: varchar("contact_name", { length: 64 }),         // 联系人姓名
    contact_phone: varchar("contact_phone", { length: 20 }),       // 联系人电话
    signed_worker_id: varchar("signed_worker_id", { length: 36 }).references(() => workers.id),  // 签约阿姨ID
    signed_at: timestamp("signed_at", { withTimezone: true }),     // 签约时间
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("orders_agent_id_idx").on(table.agent_id),
    index("orders_worker_id_idx").on(table.worker_id),
    index("orders_customer_id_idx").on(table.customer_id),
    index("orders_status_idx").on(table.status),
    index("orders_created_at_idx").on(table.created_at),
  ]
);

// ============================================================
// 订单签约记录
// ============================================================

/** 订单签约记录表 — 记录订单每次签约/换人历史 */
export const order_signings = pgTable(
  "order_signings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    order_id: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
    worker_id: varchar("worker_id", { length: 36 }).notNull().references(() => workers.id),
    worker_salary: integer("worker_salary"),                                        // 阿姨薪资（单位：元）
    work_start_date: varchar("work_start_date", { length: 20 }),                    // 实际上岗日期
    contract_start_date: varchar("contract_start_date", { length: 20 }),            // 合同开始日期
    contract_end_date: varchar("contract_end_date", { length: 20 }),                // 合同结束日期
    status: varchar("status", { length: 20 }).notNull().default("active"),          // active / replaced / cancelled
    replace_reason: text("replace_reason"),                                         // 换人原因（如已换人）
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("order_signings_order_id_idx").on(table.order_id),
    index("order_signings_worker_id_idx").on(table.worker_id),
    index("order_signings_status_idx").on(table.status),
  ]
);

// ============================================================
// 佣金与分账
// ============================================================

/** 佣金规则表 */
export const commission_rules = pgTable(
  "commission_rules",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    type: varchar("type", { length: 30 }).notNull(),          // service_fee / agency_fee / training_fee
    description: text("description"),
    role: varchar("role", { length: 20 }).notNull(),         // agent / recruiter / instructor / platform
    rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),  // 百分比
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("commission_rules_type_idx").on(table.type),
    index("commission_rules_role_idx").on(table.role),
  ]
);

/** 分账记录表 */
export const settlements = pgTable(
  "settlements",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    order_id: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
    type: varchar("type", { length: 30 }).notNull(),          // service_fee / agency_fee / training_fee
    total_amount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    recipient_id: varchar("recipient_id", { length: 36 }).notNull().references(() => users.id),
    recipient_role: varchar("recipient_role", { length: 20 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 5, scale: 2 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),  // pending / completed
    settled_at: timestamp("settled_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("settlements_order_id_idx").on(table.order_id),
    index("settlements_recipient_id_idx").on(table.recipient_id),
    index("settlements_status_idx").on(table.status),
  ]
);

// ============================================================
// 合同
// ============================================================

/** 合同表 */
export const contracts = pgTable(
  "contracts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    title: varchar("title", { length: 128 }).notNull(),
    type: varchar("type", { length: 30 }).notNull(),          // platform-agent / platform-recruiter / platform-instructor / recruiter-student
    party_a_id: varchar("party_a_id", { length: 36 }).notNull().references(() => users.id),  // 甲方
    party_b_id: varchar("party_b_id", { length: 36 }).notNull().references(() => users.id),  // 乙方
    party_b_name: varchar("party_b_name", { length: 64 }).notNull(),
    party_b_id_card: varchar("party_b_id_card", { length: 18 }),  // 身份证号
    party_b_phone: varchar("party_b_phone", { length: 20 }),      // 签约手机号
    course_id: varchar("course_id", { length: 36 }).references(() => courses.id),  // 关联课程（招生-学员合同）
    price: numeric("price", { precision: 10, scale: 2 }),
    start_date: varchar("start_date", { length: 20 }),
    end_date: varchar("end_date", { length: 20 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),  // draft / pending_approval / signed / active / expired / terminated
    approved_by: varchar("approved_by", { length: 36 }).references(() => users.id),  // 审批人（培训主管）
    approved_at: timestamp("approved_at", { withTimezone: true }),
    signed_at: timestamp("signed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("contracts_party_a_id_idx").on(table.party_a_id),
    index("contracts_party_b_id_idx").on(table.party_b_id),
    index("contracts_status_idx").on(table.status),
    index("contracts_course_id_idx").on(table.course_id),
  ]
);

// ============================================================
// 诚信与积分
// ============================================================

/** 诚信记录表 */
export const credit_records = pgTable(
  "credit_records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    event: varchar("event", { length: 128 }).notNull(),      // 事件描述
    score_change: integer("score_change").notNull(),          // 分数变化（正/负）
    related_order_id: varchar("related_order_id", { length: 36 }).references(() => orders.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("credit_records_user_id_idx").on(table.user_id),
    index("credit_records_created_at_idx").on(table.created_at),
  ]
);

/** 积分记录表 */
export const point_records = pgTable(
  "point_records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 64 }).notNull(),     // 行为描述
    points: integer("points").notNull(),                      // 积分变化（正/负）
    related_order_id: varchar("related_order_id", { length: 36 }).references(() => orders.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("point_records_user_id_idx").on(table.user_id),
    index("point_records_created_at_idx").on(table.created_at),
  ]
);

/** 保证金记录表 */
export const deposits = pgTable(
  "deposits",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    user_id: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(),          // pay / refund
    status: varchar("status", { length: 20 }).notNull().default("paid"),  // paid / refunded
    note: text("note"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("deposits_user_id_idx").on(table.user_id),
    index("deposits_status_idx").on(table.status),
  ]
);

/** 退款申请表（对齐业务规则2.0方案） */
export const refunds = pgTable(
  "refunds",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    refund_type: varchar("refund_type", { length: 50 }).notNull(),    // training_fee | agency_fee | deposit
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // 退款金额（元）
    reason: text("reason"),                                            // 退款原因
    related_type: varchar("related_type", { length: 50 }).notNull(),   // lead_contract | contract | order | worker
    related_id: varchar("related_id", { length: 36 }).notNull(),       // 关联记录ID
    related_name: varchar("related_name", { length: 128 }),            // 关联名称（冗余，方便展示）
    requester_id: varchar("requester_id", { length: 36 }).notNull().references(() => users.id), // 发起人
    requester_role: varchar("requester_role", { length: 20 }),         // 发起人角色（冗余）
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | completed | rejected
    approver_id: varchar("approver_id", { length: 36 }).references(() => users.id), // 审核人
    review_comment: text("review_comment"),                            // 审核意见
    approved_at: timestamp("approved_at", { withTimezone: true }),     // 审批通过时间
    completed_at: timestamp("completed_at", { withTimezone: true }),   // 线下打款确认时间
    remark: text("remark"),                                            // 备注
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("refunds_status_idx").on(table.status),
    index("refunds_related_type_idx").on(table.related_type),
    index("refunds_requester_idx").on(table.requester_id),
  ]
);

// ============================================================
// 评价
// ============================================================

/** 评价表 */
export const reviews = pgTable(
  "reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    target_user_id: varchar("target_user_id", { length: 36 }).notNull().references(() => users.id),  // 被评价人
    reviewer_id: varchar("reviewer_id", { length: 36 }).notNull().references(() => users.id),       // 评价人
    reviewer_role: varchar("reviewer_role", { length: 20 }).notNull(),                              // 评价人角色
    order_id: varchar("order_id", { length: 36 }).references(() => orders.id),
    rating: integer("rating").notNull(),                      // 1-5
    content: text("content"),
    hidden: boolean("hidden").default(false).notNull(),       // 是否隐藏
    target_role: varchar("target_role", { length: 20 }),                              // 被评价人角色
    updated_at: timestamp("updated_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("reviews_target_user_id_idx").on(table.target_user_id),
    index("reviews_reviewer_id_idx").on(table.reviewer_id),
    index("reviews_order_id_idx").on(table.order_id),
    index("reviews_target_role_idx").on(table.target_role),
  ]
);

// ============================================================
// 推荐记录
// ============================================================

/** 推荐记录表 */
export const recommendations = pgTable(
  "recommendations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    order_id: varchar("order_id", { length: 36 }).references(() => orders.id),
    recommender_id: varchar("recommender_id", { length: 36 }).notNull().references(() => users.id),
    recommender_role: varchar("recommender_role", { length: 20 }).notNull(),
    worker_id: varchar("worker_id", { length: 36 }).notNull().references(() => workers.id),
    status: varchar("status", { length: 20 }).notNull().default("pending"),  // pending / accepted / rejected
    notes: text("notes"),
    rejection_reason: text("rejection_reason"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("recommendations_order_id_idx").on(table.order_id),
    index("recommendations_recommender_id_idx").on(table.recommender_id),
    index("recommendations_worker_id_idx").on(table.worker_id),
    index("recommendations_status_idx").on(table.status),
  ]
);

// ============================================================
// 简历审核
// ============================================================

/** 简历审核记录表 */
export const resume_reviews = pgTable(
  "resume_reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    worker_id: varchar("worker_id", { length: 36 }).notNull().references(() => workers.id),
    type: varchar("type", { length: 20 }).notNull(),          // create / update
    changes: text("changes"),                                 // 修改内容描述
    review_type: varchar("review_type", { length: 20 }).default("create_resume"),  // 审核类型：create_resume / update_resume
    old_data: text("old_data"),                               // 旧数据JSON快照
    new_data: text("new_data"),                               // 新数据JSON快照
    proposed_data: jsonb("proposed_data"),                    // 提议的新值（结构化JSONB）
    original_data: jsonb("original_data"),                    // 原值快照（结构化JSONB）
    changed_fields: text("changed_fields").array(),           // 变更字段名列表
    status: varchar("status", { length: 20 }).notNull().default("pending"),  // pending / approved / rejected
    reviewer_id: varchar("reviewer_id", { length: 36 }).references(() => users.id),
    review_note: text("review_note"),                          // 审核备注
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("resume_reviews_worker_id_idx").on(table.worker_id),
    index("resume_reviews_status_idx").on(table.status),
  ]
);

// ============================================================
// 合同模板
// ============================================================

/** 合同模板表 — 管理员维护，签约时选用 */
export const contract_templates = pgTable(
  "contract_templates",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),           // 模板名称
    type: varchar("type", { length: 30 }).notNull(),            // 合同类型：platform-agent / platform-recruiter / platform-instructor / recruiter-student / order-service
    content: text("content").notNull(),                         // 模板内容（富文本/Markdown）
    description: text("description"),                           // 模板说明
    is_active: boolean("is_active").default(true).notNull(),    // 是否启用
    sort_order: integer("sort_order").default(0),               // 排序
    created_by: varchar("created_by", { length: 36 }).references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("contract_templates_type_idx").on(table.type),
    index("contract_templates_is_active_idx").on(table.is_active),
  ]
);

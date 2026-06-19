import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).unique(),
  password: varchar('password', { length: 255 }),
  role: varchar('role', { length: 50 }).default('worker').notNull(),
  name: varchar('name', { length: 100 }),
  avatar: varchar('avatar', { length: 500 }),
  status: varchar('status', { length: 20 }).default('active'),
  creditScore: integer('credit_score').default(100),
  points: integer('points').default(0),
  deposit: decimal('deposit', { precision: 10, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const wechatUsers = pgTable('wechat_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  openid: varchar('openid', { length: 100 }).unique(),
  unionid: varchar('unionid', { length: 100 }),
  sessionKey: varchar('session_key', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const smsCodes = pgTable('sms_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: varchar('phone', { length: 20 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  type: varchar('type', { length: 20 }).default('login'),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const workers = pgTable('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  workerNo: varchar('worker_no', { length: 50 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  gender: varchar('gender', { length: 10 }),
  age: integer('age'),
  idCard: varchar('id_card', { length: 18 }),
  idCardFront: varchar('id_card_front', { length: 500 }),
  idCardBack: varchar('id_card_back', { length: 500 }),
  serviceTypes: text('service_types').array(),
  serviceArea: varchar('service_area', { length: 200 }),
  experience: integer('experience'),
  salaryExpectation: decimal('salary_expectation', { precision: 10, scale: 2 }),
  resume: varchar('resume', { length: 500 }),
  skills: text('skills').array(),
  certificates: text('certificates').array(),
  introduction: text('introduction'),
  photos: text('photos').array(),
  status: varchar('status', { length: 20 }).default('pending'),
  workStatus: varchar('work_status', { length: 20 }).default('available'),
  reviewStatus: varchar('review_status', { length: 20 }).default('pending'),
  reviewNotes: text('review_notes'),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  gender: varchar('gender', { length: 10 }),
  address: varchar('address', { length: 500 }),
  addressLat: decimal('address_lat', { precision: 10, scale: 8 }),
  addressLng: decimal('address_lng', { precision: 11, scale: 8 }),
  level: varchar('level', { length: 20 }).default('normal'),
  source: varchar('source', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const customerFollowups = pgTable('customer_followups', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }),
  content: text('content'),
  nextFollowupAt: timestamp('next_followup_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNo: varchar('order_no', { length: 50 }).unique().notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  workerId: uuid('worker_id').references(() => workers.id),
  serviceType: varchar('service_type', { length: 50 }).notNull(),
  serviceContent: text('service_content'),
  serviceAddress: varchar('service_address', { length: 500 }),
  serviceStartTime: timestamp('service_start_time'),
  serviceEndTime: timestamp('service_end_time'),
  serviceDuration: integer('service_duration'),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  finalPrice: decimal('final_price', { precision: 10, scale: 2 }),
  depositPaid: decimal('deposit_paid', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('pending'),
  matchingType: varchar('matching_type', { length: 20 }),
  signedAt: timestamp('signed_at'),
  signConfirmed: boolean('sign_confirmed').default(false),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orderRecommendations = pgTable('order_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  workerId: uuid('worker_id').references(() => workers.id),
  status: varchar('status', { length: 20 }).default('pending'),
  respondedAt: timestamp('responded_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadNo: varchar('lead_no', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  gender: varchar('gender', { length: 10 }),
  intentLevel: varchar('intent_level', { length: 10 }).default('B'),
  interestType: varchar('interest_type', { length: 50 }),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  source: varchar('source', { length: 50 }),
  assignedTo: uuid('assigned_to').references(() => users.id),
  isPublic: boolean('is_public').default(false),
  lastContactAt: timestamp('last_contact_at'),
  noContactDays: integer('no_contact_days').default(0),
  status: varchar('status', { length: 20 }).default('new'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const leadFollowups = pgTable('lead_followups', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  content: text('content'),
  nextFollowupAt: timestamp('next_followup_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseNo: varchar('course_no', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  teacherId: uuid('teacher_id').references(() => users.id),
  type: varchar('type', { length: 50 }),
  duration: integer('duration'),
  price: decimal('price', { precision: 10, scale: 2 }),
  maxStudents: integer('max_students'),
  minStudents: integer('min_students').default(1),
  status: varchar('status', { length: 20 }).default('draft'),
  reviewStatus: varchar('review_status', { length: 20 }).default('pending'),
  location: varchar('location', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const coursePackages = pgTable('course_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }),
  validityDays: integer('validity_days'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const coursePackageItems = pgTable('course_package_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id').references(() => coursePackages.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
});

export const courseSchedules = pgTable('course_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  location: varchar('location', { length: 200 }),
  teacherId: uuid('teacher_id').references(() => users.id),
  maxStudents: integer('max_students'),
  enrolledCount: integer('enrolled_count').default(0),
  status: varchar('status', { length: 20 }).default('scheduled'),
  reviewStatus: varchar('review_status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  studentNo: varchar('student_no', { length: 50 }).unique(),
  name: varchar('name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  gender: varchar('gender', { length: 10 }),
  age: integer('age'),
  idCard: varchar('id_card', { length: 18 }),
  source: varchar('source', { length: 50 }),
  recruiterId: uuid('recruiter_id').references(() => users.id),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').references(() => students.id, { onDelete: 'cascade' }),
  courseScheduleId: uuid('course_schedule_id').references(() => courseSchedules.id),
  packageId: uuid('package_id').references(() => coursePackages.id),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }),
  actualPrice: decimal('actual_price', { precision: 10, scale: 2 }),
  paid: decimal('paid', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('enrolled'),
  enrollmentDate: timestamp('enrollment_date'),
  attendanceRecords: jsonb('attendance_records').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const grades = pgTable('grades', {
  id: uuid('id').primaryKey().defaultRandom(),
  enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'cascade' }),
  score: decimal('score', { precision: 5, scale: 2 }),
  examDate: timestamp('exam_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  certificateNo: varchar('certificate_no', { length: 50 }).unique().notNull(),
  studentId: uuid('student_id').references(() => students.id),
  courseId: uuid('course_id').references(() => courses.id),
  certificateType: varchar('certificate_type', { length: 50 }),
  issueDate: timestamp('issue_date'),
  expiryDate: timestamp('expiry_date'),
  status: varchar('status', { length: 20 }).default('issued'),
  fileUrl: varchar('file_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }),
  content: text('content'),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractNo: varchar('contract_no', { length: 50 }).unique().notNull(),
  templateId: uuid('template_id').references(() => contractTemplates.id),
  type: varchar('type', { length: 50 }),
  partyAName: varchar('party_a_name', { length: 200 }),
  partyAPhone: varchar('party_a_phone', { length: 20 }),
  partyBName: varchar('party_b_name', { length: 200 }),
  partyBPhone: varchar('party_b_phone', { length: 20 }),
  content: jsonb('content'),
  attachments: text('attachments').array(),
  status: varchar('status', { length: 20 }).default('draft'),
  signedAt: timestamp('signed_at'),
  orderId: uuid('order_id').references(() => orders.id),
  studentId: uuid('student_id').references(() => students.id),
  leadId: uuid('lead_id').references(() => leads.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const commissionRules = pgTable('commission_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  type: varchar('type', { length: 50 }),
  ruleConfig: jsonb('rule_config').notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const commissionRecords = pgTable('commission_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => commissionRules.id),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }),
  orderId: uuid('order_id').references(() => orders.id),
  enrollmentId: uuid('enrollment_id').references(() => enrollments.id),
  orderAmount: decimal('order_amount', { precision: 10, scale: 2 }),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  settledAt: timestamp('settled_at'),
});

export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  settlementNo: varchar('settlement_no', { length: 50 }).unique().notNull(),
  userId: uuid('user_id').references(() => users.id),
  type: varchar('type', { length: 50 }),
  totalOrders: integer('total_orders').default(0),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }),
  actualAmount: decimal('actual_amount', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).default('pending'),
  paidAt: timestamp('paid_at'),
  bankName: varchar('bank_name', { length: 100 }),
  bankAccount: varchar('bank_account', { length: 50 }),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  workerId: uuid('worker_id').references(() => workers.id),
  customerId: uuid('customer_id').references(() => customers.id),
  rating: integer('rating'),
  content: text('content'),
  tags: text('tags').array(),
  reply: text('reply'),
  repliedAt: timestamp('replied_at'),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const resumeReviews = pgTable('resume_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  workerId: uuid('worker_id').references(() => workers.id),
  status: varchar('status', { length: 20 }).default('pending'),
  notes: text('notes'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).unique().notNull(),
  value: jsonb('value'),
  description: varchar('description', { length: 200 }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  type: varchar('type', { length: 50 }),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const platformFees = pgTable('platform_fees', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(),
  feeRate: decimal('fee_rate', { precision: 5, scale: 4 }),
  fixedFee: decimal('fixed_fee', { precision: 10, scale: 2 }),
  minFee: decimal('min_fee', { precision: 10, scale: 2 }),
  maxFee: decimal('max_fee', { precision: 10, scale: 2 }),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Teams table with self-reference
const teamsTable = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  leaderId: uuid('leader_id').references(() => users.id),
  parentId: uuid('parent_id').references((): any => teamsTable.id),
  memberCount: integer('member_count').default(0),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teamsTable.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('member'),
  joinedAt: timestamp('joined_at').defaultNow(),
});

export { teamsTable as teams };

export const workerApplications = pgTable('worker_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicantName: varchar('applicant_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  idCard: varchar('id_card', { length: 18 }),
  serviceTypes: text('service_types').array(),
  experience: integer('experience'),
  introduction: text('introduction'),
  status: varchar('status', { length: 20 }).default('pending'),
  notes: text('notes'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 字段级权限配置表
export const fieldPermissions = pgTable('field_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: varchar('role', { length: 50 }).notNull(),
  module: varchar('module', { length: 50 }).notNull(),
  // 可见字段列表（JSON数组）
  visibleFields: text('visible_fields').array(),
  // 可编辑字段列表（JSON数组）
  editableFields: text('editable_fields').array(),
  // 是否启用自定义配置（false时使用默认全部字段）
  enabled: boolean('enabled').default(false),
  description: varchar('description', { length: 200 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 中介合同表（经纪人发起，用于订单签约）
export const agencyContracts = pgTable('agency_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  // 合同基本信息
  title: varchar('title', { length: 200 }),
  // 关联的订单
  orderId: uuid('order_id').references(() => orders.id),
  // 甲方（经纪人）
  partyAId: uuid('party_a_id').references(() => users.id),
  partyAName: varchar('party_a_name', { length: 100 }),
  // 乙方（阿姨）
  partyBId: uuid('party_b_id').references(() => workers.id),
  partyBName: varchar('party_b_name', { length: 100 }),
  partyBPhone: varchar('party_b_phone', { length: 20 }),
  partyBIdCard: varchar('party_b_id_card', { length: 18 }),
  // 丙方（客户，可选）
  partyCId: uuid('party_c_id').references(() => customers.id),
  partyCName: varchar('party_c_name', { length: 100 }),
  partyCPhone: varchar('party_c_phone', { length: 20 }),
  // 合同金额
  amount: decimal('amount', { precision: 10, scale: 2 }),
  serviceFee: decimal('service_fee', { precision: 10, scale: 2 }),
  // 合同期限
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  // 状态：draft(草稿) -> signed(已签约) -> active(生效) / rejected(驳回)
  status: varchar('status', { length: 20 }).default('draft'),
  // 经纪人确认信息
  agentConfirmedAt: timestamp('agent_confirmed_at'),
  agentConfirmNote: text('agent_confirm_note'),
  // 阿姨确认信息
  workerConfirmedAt: timestamp('worker_confirmed_at'),
  workerConfirmNote: text('worker_confirm_note'),
  // 驳回原因
  rejectReason: text('reject_reason'),
  rejectedAt: timestamp('rejected_at'),
  rejectedBy: uuid('rejected_by').references(() => users.id),
  // 生效信息
  activatedAt: timestamp('activated_at'),
  // 签约确认后阿姨的工作状态
  workerWorkStatus: varchar('worker_work_status', { length: 20 }),
  // 创建人
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
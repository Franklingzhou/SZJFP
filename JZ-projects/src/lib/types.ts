// 角色枚举
export type Role = 'worker' | 'agent' | 'recruiter' | 'instructor' | 'customer' | 'admin' | 'training_supervisor' | 'worker_operator';

export const ROLE_LABELS: Record<Role, string> = {
  worker: '阿姨',
  agent: '经纪人',
  recruiter: '招生',
  instructor: '讲师',
  customer: '客户',
  admin: '平台管理员',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
};

// 阿姨状态: idle(空闲) → working(在户) → paused(暂停)
export type WorkerStatus = 'idle' | 'working' | 'paused' | 'blacklisted';
export const WORKER_STATUS_LABELS: Record<WorkerStatus, string> = {
  idle: '空闲',
  working: '在户',
  paused: '暂停',
  blacklisted: '黑名单',
};

// 工种
export type JobType = '保姆' | '月嫂' | '育儿嫂' | '老人护理' | '钟点工' | '护工' | '催乳师' | '早教' | '厨娘' | '收纳师' | '厨师' | '其他';
export const JOB_TYPES: JobType[] = ['保姆', '月嫂', '育儿嫂', '老人护理', '钟点工', '护工', '催乳师', '早教', '厨娘', '收纳师', '厨师', '其他'];

// 审核状态
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'resigned';
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
  resigned: '已离职',
};

// 简历审核状态
export type ResumeReviewStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export const RESUME_REVIEW_STATUS_LABELS: Record<ResumeReviewStatus, string> = {
  draft: '草稿',
  pending: '待审核',
  approved: '已通过',
  rejected: '已驳回',
};

// 简历审核记录
export interface ResumeReviewRecord {
  id: string;
  workerId: string;
  workerName: string;
  type: 'create' | 'update'; // 新建 or 修改
  changes?: string; // 修改内容描述
  submittedAt: string;
  reviewedAt?: string;
  reviewerName?: string;
  reviewNote?: string; // 审核备注
  status: ResumeReviewStatus;
}

// 订单状态: created(待匹配) → open(已发布) → interviewing(面试中) → signed(已签约) → completed(已完成) → closed(已关闭)
export type OrderStatus = 'created' | 'open' | 'interviewing' | 'signed' | 'completed' | 'closed';
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  created: '待匹配',
  open: '已发布',
  interviewing: '面试中',
  signed: '已签约',
  completed: '已完成',
  closed: '已关闭',
};

// 评价来源角色分类
export type ReviewSourceRole = 'customer' | 'agent' | 'recruiter' | 'instructor' | 'worker' | 'worker_operator';
export const REVIEW_SOURCE_LABELS: Record<ReviewSourceRole, string> = {
  customer: '客户评价',
  agent: '经纪人评价',
  recruiter: '招生评价',
  instructor: '讲师评价',
  worker: '阿姨评价',
  worker_operator: '阿姨运营评价',
};

// 各角色可见的评价分类
export const ROLE_REVIEW_CATEGORIES: Record<string, ReviewSourceRole[]> = {
  worker: ['customer', 'agent', 'recruiter', 'instructor'],
  agent: ['customer', 'agent', 'recruiter', 'instructor', 'worker'],
  recruiter: ['agent', 'worker', 'instructor'],
  instructor: ['agent', 'recruiter', 'worker'],
  customer: ['worker', 'agent'],
  worker_operator: ['customer', 'agent', 'worker'],
};

// 阿姨与角色关系类型
export type WorkerRelationType = 'creator' | 'maintainer' | 'referrer';
export const WORKER_RELATION_LABELS: Record<WorkerRelationType, string> = {
  creator: '录入人',
  maintainer: '维护人',
  referrer: '推荐人',
};

// 阿姨简历
export interface WorkerProfile {
  id: string;
  name: string;
  age: number;
  gender: '女' | '男';
  origin: string; // 籍贯
  photo: string;
  phone: string;
  idCard: string;
  jobTypes: JobType[];
  experienceYears: number;
  specialties: string[];
  certifications: string[];
  expectedSalaryMin: number;
  expectedSalaryMax: number;
  status: WorkerStatus;
  availableDate: string;
  creatorId: string; // 录入人ID（1年保护期）
  creatorName: string; // 录入人名称
  creatorRole: 'agent' | 'recruiter' | 'instructor' | 'customer'; // 录入人角色
  creatorCommissionRate: number; // 录入人佣金比例(%)
  maintainerId?: string; // 维护人ID
  maintainerName?: string; // 维护人名称
  maintainerCommissionRate?: number; // 维护人佣金比例(%)
  referrerId?: string; // 推荐人ID
  referrerName?: string; // 推荐人名称
  referrerCommissionRate?: number; // 推荐人佣金比例(%)
  user_id?: string; // 关联用户ID
  creditScore: number; // 诚信分
  creditRecords: CreditRecord[];
  deposit: number; // 保证金
  points: number; // 积分
  trainingRecords: TrainingRecord[];
  reviews: Review[];
  resumeReviewStatus: ResumeReviewStatus; // 简历审核状态
  changeSummary?: string; // 变更摘要（修改了哪些字段）
  skills?: string[]; // 技能特长
  remark?: string; // 备注
  workExperience?: WorkExperience[]; // 工作经验
  certificates?: CertificateOption[]; // 证书（讲师填写）
  createdAt: string;
  updatedAt: string;
}

// 工作经验
// 工作经验 - 定义在下方

// 评价
export interface Review {
  id: string;
  targetId?: string; // 被评价对象ID（阿姨/课程等）
  targetName?: string; // 被评价对象名称
  targetType?: 'worker' | 'course' | 'instructor'; // 被评价对象类型
  type: ReviewSourceRole; // 评价来源角色（兼容字段）
  sourceRole: ReviewSourceRole; // 评价来源角色
  reviewerName: string;
  reviewerRole: string; // 显示用的角色名
  rating: number; // 1-5
  content: string;
  hidden: boolean; // 是否隐藏
  createdAt: string;
}

// 诚信记录
export interface CreditRecord {
  id: string;
  event: string;
  scoreChange: number;
  createdAt: string;
}

// 培训记录
export interface TrainingRecord {
  id: string;
  courseName: string;
  instructorName: string;
  score: number;
  passed: boolean;
  completedAt: string;
}

// 经纪人/招生
export interface AgentProfile {
  id: string;
  name: string;
  phone: string;
  role: 'agent' | 'recruiter' | 'training_supervisor' | 'worker_operator';
  reviewStatus: ReviewStatus;
  experience: string;
  performance: string;
  creditScore: number;
  deposit: number;
  points: number;
  workerCount: number; // 归属阿姨数
  orderCount: number; // 成交单数
  commissionRate?: number; // 佣金比例
  createdAt: string;
}

// 讲师
export interface InstructorProfile {
  id: string;
  name: string;
  phone: string;
  reviewStatus: ReviewStatus;
  qualifications: string[];
  creditScore: number;
  deposit: number;
  points: number;
  courseCount: number;
  studentCount: number;
  commissionRate?: number; // 佣金比例
  createdAt: string;
}

// 客户
export interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  requirement?: string; // 客户需求
  address?: string; // 地址
  creditScore: number;
  orderCount: number;
  createdAt: string;
}

// 订单
export interface Order {
  id: string;
  title: string;
  jobType: JobType;
  salaryMin: number;
  salaryMax: number;
  location: string;
  description: string;
  agentId: string;
  agentName: string;
  workerId?: string;
  workerName?: string;
  customerId?: string;
  customerName?: string;
  status: OrderStatus;
  serviceFee: number;
  commissionRate: number;
  serviceType?: string; // 服务类型
  amount?: number; // 订单金额
  startDate?: string; // 服务开始日期
  reviewed?: boolean; // 是否已评价
  createdAt: string;
  updatedAt: string;
}

// 推荐记录 — 签约后自动归属佣金
export interface ReferralRecord {
  id: string;
  orderId: string;
  orderTitle: string;
  workerId: string;
  workerName: string;
  referrerId: string;       // 推荐人ID
  referrerName: string;     // 推荐人名称
  referrerRole: 'agent' | 'recruiter' | 'instructor' | 'training_supervisor' | 'worker_operator'; // 推荐人角色
  commissionRate: number;   // 推荐佣金比例(%)
  commissionAmount: number; // 推荐佣金金额
  status: 'pending' | 'settled'; // 待结算 / 已结算
  settledAt?: string;
  createdAt: string;
}

// 招生线索: new(新线索) → contacted(已联系) → signed(已签约) → training(培训中) → qualified(已合格) → converted(已转简历) / lost(已流失)
export type LeadStatus = 'new' | 'contacted' | 'signed' | 'training' | 'qualified' | 'converted' | 'lost';
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: '新线索',
  contacted: '已联系',
  signed: '已签约',
  training: '培训中',
  qualified: '已合格',
  converted: '已转简历',
  lost: '已流失',
};

// 线索等级
export type LeadLevel = 'A' | 'B' | 'C' | 'D';

// 客户状态: new(新客户) → following(跟进中) → ordered(已下单) → serving(服务中) → completed(已完成) / lost(已流失)
export type CustomerStatus = 'new' | 'following' | 'ordered' | 'serving' | 'completed' | 'lost';
export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  new: '新客户',
  following: '跟进中',
  ordered: '已下单',
  serving: '服务中',
  completed: '已完成',
  lost: '已流失',
};

// 推荐状态: pending(待审核) → accepted(已通过) / rejected(已拒绝) / signed(已签约)
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | 'signed';
export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  pending: '待审核',
  accepted: '已通过',
  rejected: '已拒绝',
  signed: '已签约',
};

// 签约记录状态: active(生效中) → replaced(已替换)
export type OrderSigningStatus = 'active' | 'replaced';
export const ORDER_SIGNING_STATUS_LABELS: Record<OrderSigningStatus, string> = {
  active: '生效中',
  replaced: '已替换',
};

// 学员/报名状态: enrolled(已报名) → in_training(培训中) → completed(已结课) → passed(已通过) / failed(未通过) / dropped(已退学)
export type EnrollmentStatus = 'enrolled' | 'in_training' | 'completed' | 'passed' | 'failed' | 'dropped';
export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  enrolled: '已报名',
  in_training: '培训中',
  completed: '已结课',
  passed: '已通过',
  failed: '未通过',
  dropped: '已退学',
};

export interface WorkExperience {
  id: string;
  period: string;       // 工作时间段: 2020-2023
  employer: string;     // 雇主/公司
  jobType: JobType;     // 工种
  description: string;  // 工作描述
}
export const LEAD_LEVEL_LABELS: Record<LeadLevel, string> = {
  A: 'A级-高意向',
  B: 'B级-中意向',
  C: 'C级-低意向',
  D: 'D级-无意向',
};

// 线索来源（管理员可配置）
export type LeadSource = '58同城' | 'BOSS直聘' | '朋友圈' | '转介绍' | '线下推广' | '其他';
export const LEAD_SOURCES: LeadSource[] = ['58同城', 'BOSS直聘', '朋友圈', '转介绍', '线下推广', '其他'];

// 证书选项（管理员可配置）
export type CertificateOption = '家政服务员证' | '育婴师证' | '月嫂证' | '养老护理员证' | '健康管理师证' | '公共营养师证' | '中式烹调师证' | '中式面点师证' | '保育员证' | '其他';
export const CERTIFICATE_OPTIONS: CertificateOption[] = ['家政服务员证', '育婴师证', '月嫂证', '养老护理员证', '健康管理师证', '公共营养师证', '中式烹调师证', '中式面点师证', '保育员证', '其他'];

export interface Lead {
  id: string;
  name: string;
  phone: string;
  age: number;
  gender: '女' | '男';
  origin: string; // 籍贯
  intention: string; // 求职意向
  level: LeadLevel; // 等级标签
  source: LeadSource; // 来源
  status: LeadStatus;
  note: string;
  recruiterId: string;
  recruiterName: string;
  inPublicPool: boolean; // 是否在公海库
  createdAt: string;
  updatedAt: string;
}

// 培训课程
export interface TrainingCourse {
  id: string;
  name: string;
  instructorId: string;
  instructorName: string;
  type: '新手入行' | '技能提升';
  courseType: 'single' | 'package'; // 单课/套餐
  maxStudents: number;
  currentStudents: number;
  startDate: string;
  endDate: string;
  price: number;
  hours: number; // 课时
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'pending_approval' | 'rejected'; // pending_approval: 待主管审批, rejected: 已驳回
  certificateOptions: string[]; // 可选证书列表
  createdAt: string;
}

// 合同审批状态
export type ContractApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'signed';

// 仪表盘统计
export interface DashboardStats {
  totalAgents: number;
  totalWorkers: number;
  totalOrders: number;
  totalRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
  pendingReviews: number;
  avgCreditScore: number;
}

// 分账记录
export interface SettlementRecord {
  id: string;
  orderId: string;
  type: 'service_fee' | 'agency_fee' | 'training_fee';
  totalAmount: number;
  items: SettlementItem[];
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface SettlementItem {
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  amount: number;
  rate: number;
}

// ==================== 系统设置 ====================

// 模块开关
export interface ModuleConfig {
  id: string;
  name: string;
  label?: string;         // 显示名称（可选，默认用name）
  description?: string;
  enabled: boolean;
  category?: 'pc' | 'miniapp' | 'both';
  role?: string;          // 关联角色
  path?: string;          // 路由路径
}

// 佣金规则
export interface CommissionRate {
  role: string;
  rate: number;
  description: string;
}

export interface CommissionRule {
  id: string;
  name: string;
  type: string;              // service_fee | agency_fee | training_fee
  description: string;
  rates: CommissionRate[];   // 分账比例明细
  active: boolean;
  createdAt: string;
}

// 积分规则
export interface PointRule {
  id: string;
  action: string;          // 行为描述
  points: number;          // 积分值（正数获取，负数扣除）
  targetRole: Role;        // 适用角色
  active: boolean;
  enabled?: boolean;       // 是否启用（可选，兼容旧数据）
}

// 诚信分规则
export interface CreditRule {
  id: string;
  event: string;           // 事件描述
  scoreChange: number;     // 诚信分变化（正数加分，负数扣分）
  active: boolean;
  action?: string;         // 动作标识
  score?: number;          // 分值（兼容旧数据）
  description?: string;   // 描述
  enabled?: boolean;       // 是否启用（可选）
}

// 文字配置项
export interface TextConfig {
  id: string;
  key: string;
  label: string;
  value: string;
  group: string;          // 分组
  category?: string;        // 分类：平台/角色/模块
}

// 平台基本信息
export interface PlatformInfo {
  name: string;
  description: string;
  contactPhone?: string;
  contactEmail?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  icpNumber?: string;       // ICP备案号
  icp?: string;              // ICP备案号（简写）
}

// 系统设置总类型
export interface SystemSettings {
  platformInfo: PlatformInfo;
  commissionRules: CommissionRule[];
  pointRules: PointRule[];
  creditRules: CreditRule[];
  modules: ModuleConfig[];
  texts: TextConfig[];
}

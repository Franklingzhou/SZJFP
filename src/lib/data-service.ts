'use client';

import type {
  WorkerProfile,
  AgentProfile,
  CustomerProfile,
  Order,
  TrainingCourse,
  Review,
  ReferralRecord,
  WorkerStatus,
  ResumeReviewStatus,
  JobType,
  OrderStatus,
  ReviewSourceRole,
} from './types';
import type { RecruiterLead } from './mock-data';
import {
  mockWorkers,
  mockAgents,
  mockCustomers,
  mockRecruiterLeads,
  mockOrders,
  mockCourses,
  mockHallOrders,
  mockReferrals,
  mockReviews,
} from './mock-data';

// Re-export all mock data and utilities so pages import from data-service instead of mock-data
// This ensures initDataFromApi's replaceArray updates are visible to all consumers
export {
  mockWorkers,
  mockAgents,
  mockCustomers,
  mockRecruiterLeads,
  mockOrders,
  mockCourses,
  mockHallOrders,
  mockReferrals,
  mockReviews,
  convertLeadToResume,
} from './mock-data';
export type { RecruiterLead } from './mock-data';

// ===== 动态数据层 =====
// 核心策略：从API加载数据后，直接修改mock数组内容（splice+push）
// 因为ES module export是引用绑定，所有import了这些数组的页面会自动看到新数据

let loading = false;
let loaded = false;

// snake_case → camelCase 转换
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toCamel(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[toCamelCase(key)] = toCamel(value);
    }
    return result;
  }
  return obj;
}

// 从API获取数据并转换格式
async function fetchAndConvert<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) return null;
    const json = await res.json();
    const payload = json.data !== undefined ? json.data : json;
    return toCamel(payload) as T;
  } catch (err) {
    console.error(`[data-service] fetch ${url} failed:`, err);
    return null;
  }
}

// 原地替换数组内容
function replaceArray<T>(target: T[], source: T[]): void {
  target.splice(0, target.length, ...source);
}

// 安全类型断言
function asStr(v: unknown, fallback = ''): string {
  return (typeof v === 'string' && v) ? v : fallback;
}
function asNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback;
}
function splitStr(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((s): s is string => typeof s === 'string');
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// 转换数据库阿姨数据为前端WorkerProfile格式
function mapWorkerFromDb(db: Record<string, unknown>): WorkerProfile {
  const creatorRole = asStr(db.creator_role || db.creatorRole, 'agent');
  const validCreatorRole = (['agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator'] as const).includes(creatorRole as WorkerProfile['creatorRole'])
    ? creatorRole as WorkerProfile['creatorRole'] : 'agent';
  return {
    id: asStr(db.id),
    name: asStr(db.name),
    age: asNum(db.age),
    gender: (asStr(db.gender, '女') === '男' ? '男' : '女') as '女' | '男',
    origin: asStr(db.origin),
    photo: asStr(db.photo) || '',
    phone: asStr(db.phone) || '',
    idCard: '',
    jobTypes: splitStr(db.job_types || db.jobTypes) as JobType[],
    experienceYears: asNum(db.experience_years || db.experienceYears),
    specialties: splitStr(db.specialties),
    certifications: splitStr(db.certifications),
    expectedSalaryMin: asNum(db.expected_salary_min || db.expectedSalaryMin),
    expectedSalaryMax: asNum(db.expected_salary_max || db.expectedSalaryMax),
    status: asStr(db.status, 'pending') as WorkerStatus,
    availableDate: asStr(db.available_date || db.availableDate) || '',
    creatorId: asStr(db.creator_id || db.creatorId),
    creatorName: asStr(db.creator_name || db.creatorName) || '',
    creatorRole: validCreatorRole,
    creatorCommissionRate: asNum(db.creator_commission_rate || db.creatorCommissionRate),
    creditScore: asNum(db.credit_score || db.creditScore, 1000),
    creditRecords: [],
    deposit: asNum(db.deposit),
    points: asNum(db.points),
    trainingRecords: [],
    reviews: [],
    resumeReviewStatus: asStr(db.resume_review_status || db.resumeReviewStatus, 'pending') as ResumeReviewStatus,
    changeSummary: asStr(db.change_summary || db.changeSummary, ''),
    createdAt: (db.created_at || db.createdAt) ? asStr(db.created_at || db.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    updatedAt: (db.updated_at || db.updatedAt) ? asStr(db.updated_at || db.updatedAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// 转换数据库线索数据为RecruiterLead格式（mock-data.ts定义的类型）
function mapLeadFromDb(db: Record<string, unknown>): RecruiterLead {
  const status = asStr(db.status, 'new');
  const validStatus = (['new', 'following', 'signed', 'converted', 'lost'] as const).includes(status as RecruiterLead['status'])
    ? status as RecruiterLead['status'] : 'new';
  const level = asStr(db.level, 'C');
  const validLevel = (['A', 'B', 'C', 'D'] as const).includes(level as RecruiterLead['level'])
    ? level as RecruiterLead['level'] : 'C';
  return {
    id: asStr(db.id),
    name: asStr(db.name),
    phone: asStr(db.phone),
    age: asNum(db.age) || undefined,
    gender: (asStr(db.gender) === '男' ? '男' : asStr(db.gender) === '女' ? '女' : undefined) as '女' | '男' | undefined,
    origin: asStr(db.origin) || undefined,
    intention: asStr(db.intention) || undefined,
    level: validLevel,
    source: asStr(db.source),
    status: validStatus,
    recruiterId: asStr(db.recruiter_id || db.recruiterId),
    recruiterName: asStr(db.recruiter_name || db.recruiterName) || '',
    remark: asStr(db.note) || asStr(db.remark) || '',
    createdAt: (db.created_at || db.createdAt) ? asStr(db.created_at || db.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// 转换数据库课程数据
function mapCourseFromDb(db: Record<string, unknown>): TrainingCourse {
  const courseType = asStr(db.type, '技能提升');
  const validType = (['新手入行', '技能提升'] as const).includes(courseType as TrainingCourse['type'])
    ? courseType as TrainingCourse['type'] : '技能提升';
  const status = asStr(db.status, 'upcoming');
  const validStatus = (['upcoming', 'ongoing', 'completed', 'pending_approval', 'rejected'] as const).includes(status as TrainingCourse['status'])
    ? status as TrainingCourse['status'] : 'upcoming';
  return {
    id: asStr(db.id),
    name: asStr(db.name),
    instructorId: asStr(db.instructor_id || db.instructorId),
    instructorName: asStr(db.instructor_name || db.instructorName) || '',
    type: validType,
    courseType: (asStr(db.course_type || db.courseType, 'single') === 'package' ? 'package' : 'single') as TrainingCourse['courseType'],
    maxStudents: asNum(db.max_students || db.maxStudents),
    currentStudents: asNum(db.current_students || db.currentStudents),
    startDate: asStr(db.start_date || db.startDate),
    endDate: asStr(db.end_date || db.endDate),
    hours: asNum(db.hours),
    price: asNum(db.price),
    location: asStr(db.location),
    status: validStatus,
    certificateOptions: [],
    createdAt: (db.created_at || db.createdAt) ? asStr(db.created_at || db.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// 转换数据库订单数据（2.0: open/interviewing/signed/completed/cancelled；2.9+ 兼容 created 作为待匹配）
function mapOrderFromDb(db: Record<string, unknown>): Order {
  const status = asStr(db.status, 'open');
  const validStatus: OrderStatus = ['open', 'interviewing', 'signed', 'completed', 'cancelled'].includes(status)
    ? status as OrderStatus : 'open';
  return {
    id: asStr(db.id),
    title: asStr(db.title),
    jobType: asStr(db.job_type || db.jobType) as JobType,
    salaryMin: asNum(db.salary_min || db.salaryMin),
    salaryMax: asNum(db.salary_max || db.salaryMax),
    location: asStr(db.location),
    description: asStr(db.description),
    agentId: asStr(db.agent_id || db.agentId),
    agentName: asStr(db.agent_name || db.agentName) || '',
    workerId: (db.worker_id || db.workerId) ? asStr(db.worker_id || db.workerId) : undefined,
    workerName: (db.worker_name || db.workerName) ? asStr(db.worker_name || db.workerName) : undefined,
    customerId: (db.customer_id || db.customerId) ? asStr(db.customer_id || db.customerId) : undefined,
    customerName: (db.customer_name || db.customerName) ? asStr(db.customer_name || db.customerName) : undefined,
    status: validStatus,
    serviceFee: asNum(db.service_fee || db.serviceFee),
    commissionRate: asNum(db.commission_rate || db.commissionRate),
    serviceType: asStr(db.service_type || db.serviceType) || undefined,
    amount: asNum(db.amount) || undefined,
    startDate: asStr(db.start_date || db.startDate) || undefined,
    reviewed: !!(db.reviewed),
    createdAt: (db.created_at || db.createdAt) ? asStr(db.created_at || db.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
    updatedAt: (db.updated_at || db.updatedAt) ? asStr(db.updated_at || db.updatedAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// 转换数据库评价数据
function mapReviewFromDb(db: Record<string, unknown>): Review {
  const role = asStr(db.reviewer_role || db.reviewerRole, 'customer');
  const validRole = (['customer', 'agent', 'recruiter', 'instructor', 'worker', 'worker_operator'] as const).includes(role as ReviewSourceRole)
    ? role as ReviewSourceRole : 'customer';
  return {
    id: asStr(db.id),
    targetId: asStr(db.target_user_id || db.targetUserId),
    targetName: asStr(db.target_name || db.targetName) || '',
    targetType: undefined,
    type: validRole,
    sourceRole: validRole,
    reviewerName: asStr(db.reviewer_name || db.reviewerName) || '',
    reviewerRole: role,
    rating: asNum(db.rating, 5),
    content: asStr(db.content),
    hidden: !!db.hidden,
    createdAt: (db.created_at || db.createdAt) ? asStr(db.created_at || db.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// 转换为AgentProfile格式（types.ts定义）
function mapAgentFromDb(db: Record<string, unknown>): AgentProfile {
  const role = asStr(db.role, 'agent');
  const validRole = (['agent', 'recruiter', 'training_supervisor', 'worker_operator'] as const).includes(role as AgentProfile['role'])
    ? role as AgentProfile['role'] : 'agent';
  const reviewStatus = asStr(db.review_status || db.reviewStatus, 'pending');
  const validReviewStatus = (['pending', 'approved', 'rejected', 'resigned'] as const).includes(reviewStatus as AgentProfile['reviewStatus'])
    ? reviewStatus as AgentProfile['reviewStatus'] : 'pending';
  return {
    id: asStr(db.id),
    name: asStr(db.name),
    phone: asStr(db.phone),
    role: validRole,
    reviewStatus: validReviewStatus,
    experience: '',
    performance: '',
    creditScore: asNum(db.credit_score || db.creditScore, 1000),
    deposit: asNum(db.deposit),
    points: asNum(db.points),
    workerCount: 0,
    orderCount: 0,
    createdAt: (db.created_at || db.createdAt) ? asStr(db.created_at || db.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// 转换为CustomerProfile格式（types.ts定义）
function mapCustomerFromDb(db: Record<string, unknown>): CustomerProfile {
  return {
    id: asStr(db.id),
    name: asStr(db.name),
    phone: asStr(db.phone),
    requirement: asStr(db.requirement) || undefined,
    address: asStr(db.address) || undefined,
    creditScore: asNum(db.credit_score || db.creditScore, 1000),
    orderCount: 0,
    createdAt: (db.created_at || db.createdAt) ? asStr(db.created_at || db.createdAt).split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

// 转换为ReferralRecord格式（types.ts定义）
function mapReferralFromLead(lead: Record<string, unknown>, idx: number): ReferralRecord {
  const status = asStr(lead.status) === 'signed' ? 'settled' as const : 'pending' as const;
  return {
    id: `ref_${idx}`,
    orderId: '',
    orderTitle: '',
    workerId: '',
    workerName: asStr(lead.name),
    referrerId: asStr(lead.recruiterId),
    referrerName: asStr(lead.recruiterName) || '招生代理',
    referrerRole: 'recruiter',
    commissionRate: 10,
    commissionAmount: status === 'settled' ? 100 : 0,
    status,
    createdAt: new Date().toISOString().split('T')[0],
  };
}

/** 从订单生成推荐记录（合单大厅推荐阿姨后产生） */
function mapReferralFromOrder(order: Record<string, unknown>, workers: Array<Record<string, unknown>>, users: Array<Record<string, unknown>>, idx: number): ReferralRecord {
  const workerId = asStr(order.workerId);
  const worker = workers.find(w => asStr(w.id) === workerId);
  const workerName = worker ? asStr(worker.name) : '未知阿姨';
  const referrerId = asStr(order.recommenderId);
  const referrer = users.find(u => asStr(u.id) === referrerId);
  const referrerName = referrer ? asStr(referrer.name) : '推荐人';
  const referrerRole = (referrer ? asStr(referrer.role) : 'agent') as ReferralRecord['referrerRole'];
  const salary = Number(order.salaryMax || order.salaryMin || 0);
  const commissionRate = referrerRole === 'recruiter' ? 15 : 30;
  return {
    id: `ref_order_${idx}`,
    orderId: asStr(order.id),
    orderTitle: asStr(order.title) || asStr(order.jobType) || '家政订单',
    workerId,
    workerName,
    referrerId,
    referrerName,
    referrerRole,
    commissionRate,
    commissionAmount: salary > 0 ? Math.round(salary * commissionRate / 100) : 0,
    status: asStr(order.status) === 'completed' ? 'settled' as const : 'pending' as const,
    createdAt: asStr(order.createdAt) || new Date().toISOString().split('T')[0],
  };
}

// ===== 公开接口 =====

/** 初始化：从API拉取所有数据，直接覆盖mock数组 */
export async function initDataFromApi(): Promise<void> {
  if (loading || loaded) return;
  loading = true;

  try {
    const [workersData, leadsData, coursesData, ordersData, reviewsData, usersData] = await Promise.all([
      fetchAndConvert<Array<Record<string, unknown>>>('/api/workers'),
      fetchAndConvert<Array<Record<string, unknown>>>('/api/leads'),
      fetchAndConvert<Array<Record<string, unknown>>>('/api/courses'),
      fetchAndConvert<Array<Record<string, unknown>>>('/api/orders'),
      fetchAndConvert<Array<Record<string, unknown>>>('/api/reviews'),
      fetchAndConvert<Array<Record<string, unknown>>>('/api/users'),
    ]);

    // 转换并覆盖阿姨数据
    if (workersData && workersData.length > 0) {
      const workers = workersData.map(w => mapWorkerFromDb(w));
      // 关联评价
      if (reviewsData) {
        const reviews = reviewsData.map(r => mapReviewFromDb(r));
        workers.forEach(w => {
          w.reviews = reviews.filter(r => r.targetId === w.id);
        });
      }
      replaceArray(mockWorkers, workers);
    }

    // 转换并覆盖线索数据
    if (leadsData && leadsData.length > 0) {
      const leads = leadsData.map(l => mapLeadFromDb(l));
      replaceArray(mockRecruiterLeads, leads);
    }

    // 转换并覆盖课程数据
    if (coursesData && coursesData.length > 0) {
      const courses = coursesData.map(c => mapCourseFromDb(c));
      replaceArray(mockCourses, courses);
    }

    // 转换并覆盖订单数据
    if (ordersData && ordersData.length > 0) {
      const orders = ordersData.map(o => mapOrderFromDb(o));
      replaceArray(mockOrders, orders);
      replaceArray(mockHallOrders, orders);
    }

    // 转换并覆盖评价数据
    if (reviewsData && reviewsData.length > 0) {
      const reviews = reviewsData.map(r => mapReviewFromDb(r));
      replaceArray(mockReviews, reviews);
    }

    // 从用户数据提取agent/customer列表
    if (usersData && usersData.length > 0) {
      const agents = usersData
        .filter(u => ['agent', 'recruiter', 'training_supervisor', 'worker_operator'].includes(asStr(u.role)))
        .map(u => mapAgentFromDb(u));
      if (agents.length > 0) replaceArray(mockAgents, agents);

      const customers = usersData
        .filter(u => asStr(u.role) === 'customer')
        .map(u => mapCustomerFromDb(u));
      if (customers.length > 0) replaceArray(mockCustomers, customers);

      // 生成推荐记录：优先从orders中有recommenderId的记录生成，补充leads中converted的记录
      const allRefs: ReferralRecord[] = [];
      const usersForRef = usersData || [];
      if (ordersData && ordersData.length > 0) {
        const workersForRef = workersData || [];
        ordersData
          .filter(o => asStr(o.recommenderId))
          .forEach((o, i) => { allRefs.push(mapReferralFromOrder(o, workersForRef, usersForRef, i)); });
      }
      if (leadsData && leadsData.length > 0) {
        leadsData
          .filter(l => asStr(l.status) === 'signed')
          .forEach((l, i) => { allRefs.push(mapReferralFromLead(l, i + 100)); });
      }
      if (allRefs.length > 0) replaceArray(mockReferrals, allRefs);
    }

    loaded = true;
    console.log('[data-service] 数据初始化完成，从API加载');
  } catch (err) {
    console.error('[data-service] 初始化失败，使用mock数据:', err);
  } finally {
    loading = false;
  }
}

/** 刷新：重新从API拉取 */
export async function refreshData(): Promise<void> {
  loaded = false;
  loading = false;
  await initDataFromApi();
}

export function isDataLoaded(): boolean {
  return loaded;
}

// ===== 写操作API =====
// 统一的API写入函数，写成功后自动刷新共享数据

export type WriteMethod = 'POST' | 'PUT' | 'DELETE';

interface WriteResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** 通用API读取，返回data数组 */
export async function fetchData<T = unknown[]>(resource: string, query?: string): Promise<T> {
  const url = query ? `/api/${resource}?${query}` : `/api/${resource}`;
  const res = await fetch(url, { headers: authHeaders() });
  const json = await res.json();
  return (json.data ?? json) as T;
}

/** 获取当前登录token */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
}

/** 构建带认证的headers */
function authHeaders(base?: Record<string, string>): Record<string, string> {
  const headers = { ...(base || {}) };
  const token = getAuthToken();
  if (token) {
    headers['x-session'] = token;
  }
  return headers;
}

/** 统一API写入：发送请求→成功后刷新共享数据 */
export async function writeApi(
  url: string,
  body: Record<string, unknown>,
  method: WriteMethod = 'PUT',
): Promise<WriteResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });

    // 401未登录 → 清除token并提示
    if (res.status === 401) {
      localStorage.removeItem('miniapp_token');
      localStorage.removeItem('auth_token');
      return { success: false, error: '登录已过期，请重新登录' };
    }

    const json = await res.json();

    if (!res.ok || json.error) {
      const errMsg = json.error || `请求失败 (${res.status})`;
      console.error(`[writeApi] ${method} ${url} failed:`, errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, data: json.data };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '网络请求失败';
    console.error(`[writeApi] ${method} ${url} error:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/** 便捷：PUT更新 */
export async function updateRecord(
  resource: string,
  idOrData: string | Record<string, unknown>,
  updates?: Record<string, unknown>,
): Promise<WriteResult> {
  if (typeof idOrData === 'string') {
    return writeApi(`/api/${resource}`, { id: idOrData, ...updates }, 'PUT');
  }
  return writeApi(`/api/${resource}`, idOrData, 'PUT');
}

/** 便捷：POST创建 */
export async function createRecord(
  resource: string,
  data: Record<string, unknown>,
): Promise<WriteResult> {
  return writeApi(`/api/${resource}`, data, 'POST');
}

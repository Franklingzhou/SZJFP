// 数据权限管理工具函数

// 数据可见范围类型
export type DataVisibility = 'all' | 'own' | 'team' | 'hidden';

// ============================================================
// 各模块字段配置
// ============================================================

export interface FieldConfig {
  key: string;           // 字段名
  label: string;          // 中文标签
  editable?: boolean;     // 是否可编辑（默认false）
}

export const moduleFields: Record<string, FieldConfig[]> = {
  workers: [
    { key: 'name', label: '姓名' },
    { key: 'gender', label: '性别' },
    { key: 'age', label: '年龄' },
    { key: 'phone', label: '手机号' },
    { key: 'id_card', label: '身份证号', editable: true },
    { key: 'service_types', label: '服务类型' },
    { key: 'service_area', label: '服务区域' },
    { key: 'experience', label: '工作经验' },
    { key: 'salary_expectation', label: '薪资期望', editable: true },
    { key: 'skills', label: '技能证书' },
    { key: 'certificates', label: '证书' },
    { key: 'introduction', label: '自我介绍', editable: true },
    { key: 'photos', label: '照片' },
    { key: 'status', label: '状态' },
    { key: 'work_status', label: '工作状态' },
    { key: 'credit_score', label: '诚信分' },
    { key: 'points', label: '积分' },
    { key: 'review_status', label: '审核状态' },
    { key: 'created_at', label: '创建时间' },
  ],
  orders: [
    { key: 'title', label: '标题' },
    { key: 'job_type', label: '工种' },
    { key: 'service_type', label: '服务类型' },
    { key: 'salary_min', label: '最低薪资' },
    { key: 'salary_max', label: '最高薪资' },
    { key: 'salary_type', label: '薪资类型' },
    { key: 'work_duration', label: '工作周期' },
    { key: 'location', label: '地址' },
    { key: 'description', label: '描述', editable: true },
    { key: 'contact_name', label: '联系人' },
    { key: 'contact_phone', label: '联系电话' },
    { key: 'status', label: '状态' },
    { key: 'amount', label: '订单金额' },
    { key: 'service_fee', label: '服务费' },
    { key: 'commission_rate', label: '佣金比例' },
    { key: 'start_date', label: '开始日期' },
    { key: 'created_at', label: '创建时间' },
  ],
  customers: [
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'gender', label: '性别' },
    { key: 'address', label: '地址' },
    { key: 'level', label: '等级' },
    { key: 'source', label: '来源' },
    { key: 'status', label: '状态' },
    { key: 'created_at', label: '创建时间' },
  ],
  leads: [
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'gender', label: '性别' },
    { key: 'age', label: '年龄' },
    { key: 'origin', label: '来源' },
    { key: 'intention', label: '意向' },
    { key: 'source', label: '渠道' },
    { key: 'level', label: '等级' },
    { key: 'is_public', label: '是否公开' },
    { key: 'status', label: '状态' },
    { key: 'note', label: '备注', editable: true },
    { key: 'created_at', label: '创建时间' },
  ],
  students: [
    { key: 'name', label: '姓名' },
    { key: 'phone', label: '手机号' },
    { key: 'gender', label: '性别' },
    { key: 'age', label: '年龄' },
    { key: 'source', label: '来源' },
    { key: 'status', label: '状态' },
    { key: 'graduated_at', label: '毕业时间' },
    { key: 'created_at', label: '创建时间' },
  ],
  courses: [
    { key: 'name', label: '课程名称' },
    { key: 'type', label: '类型' },
    { key: 'course_type', label: '课程类型' },
    { key: 'instructor_id', label: '讲师' },
    { key: 'max_students', label: '最大人数' },
    { key: 'current_students', label: '当前人数' },
    { key: 'start_date', label: '开始日期' },
    { key: 'end_date', label: '结束日期' },
    { key: 'hours', label: '课时' },
    { key: 'price', label: '价格', editable: true },
    { key: 'description', label: '描述', editable: true },
    { key: 'location', label: '地点' },
    { key: 'status', label: '状态' },
    { key: 'created_at', label: '创建时间' },
  ],
  contracts: [
    { key: 'title', label: '合同标题' },
    { key: 'type', label: '类型' },
    { key: 'party_a_id', label: '甲方' },
    { key: 'party_b_id', label: '乙方' },
    { key: 'party_b_name', label: '乙方姓名' },
    { key: 'party_b_phone', label: '乙方电话' },
    { key: 'party_b_id_card', label: '乙方身份证' },
    { key: 'course_id', label: '课程' },
    { key: 'price', label: '价格', editable: true },
    { key: 'start_date', label: '开始日期' },
    { key: 'end_date', label: '结束日期' },
    { key: 'status', label: '状态' },
    { key: 'created_at', label: '创建时间' },
  ],
  recommendations: [
    { key: 'order_id', label: '订单' },
    { key: 'worker_id', label: '阿姨' },
    { key: 'recommender_id', label: '推荐人' },
    { key: 'status', label: '状态' },
    { key: 'reason', label: '理由', editable: true },
    { key: 'confirmed_at', label: '确认时间' },
    { key: 'created_at', label: '创建时间' },
  ],
  reviews: [
    { key: 'target_user_id', label: '被评价人' },
    { key: 'order_id', label: '订单' },
    { key: 'rating', label: '评分' },
    { key: 'content', label: '评价内容' },
    { key: 'tags', label: '标签' },
    { key: 'reply', label: '回复', editable: true },
    { key: 'status', label: '状态' },
    { key: 'created_at', label: '创建时间' },
  ],
};

// ============================================================
// 默认字段权限配置
// ============================================================

// 敏感字段（默认对非admin隐藏）
const sensitiveFields: Record<string, string[]> = {
  workers: ['id_card'],
  customers: [],
  leads: ['phone'],
  orders: [],
};

// 默认角色可见字段（不配置则全可见）
const defaultFieldVisibility: Record<string, Record<string, string[]>> = {
  // 经纪人
  agent: {
    workers: ['name', 'gender', 'age', 'service_types', 'service_area', 'experience', 'skills', 'status', 'work_status'],
    customers: ['name', 'gender', 'address', 'level', 'source', 'status'],
    orders: ['title', 'job_type', 'salary_min', 'salary_max', 'location', 'status', 'amount'],
  },
  // 阿姨
  worker: {
    workers: ['name', 'gender', 'age', 'service_types', 'service_area'],
    customers: ['name', 'address', 'level'],
    orders: ['title', 'job_type', 'salary_min', 'salary_max', 'location', 'status', 'contact_name', 'contact_phone'],
    reviews: ['rating', 'content', 'tags', 'created_at'],
  },
  // 客户
  customer: {
    workers: ['name', 'gender', 'service_types', 'service_area', 'experience', 'skills', 'introduction'],
    orders: ['title', 'job_type', 'salary', 'location', 'status'],
    reviews: ['rating', 'content', 'created_at'],
  },
  // 招生代理
  recruiter: {
    leads: ['name', 'gender', 'age', 'origin', 'intention', 'level', 'status', 'note'],
  },
};

// ============================================================
// 字段级权限工具函数
// ============================================================

// 获取某角色在某模块可见的字段列表
export function getVisibleFields(role: string, module: string): string[] {
  // 管理员看所有字段
  if (role === 'admin') {
    return moduleFields[module]?.map(f => f.key) || [];
  }

  // 服务端环境：直接返回默认配置
  if (typeof window === 'undefined') {
    return defaultFieldVisibility[role]?.[module] || moduleFields[module]?.map(f => f.key) || [];
  }

  // 客户端环境：先检查 localStorage 缓存
  const saved = localStorage.getItem('field_permissions');
  if (saved) {
    try {
      const configs = JSON.parse(saved);
      const config = configs[`${role}_${module}`];
      if (config?.enabled && config?.visibleFields) {
        return config.visibleFields;
      }
    } catch {
      // 解析失败
    }
  }

  // 使用默认配置
  return defaultFieldVisibility[role]?.[module] || moduleFields[module]?.map(f => f.key) || [];
}

// 获取某角色在某模块可编辑的字段列表
export function getEditableFields(role: string, module: string): string[] {
  // 管理员可编辑所有
  if (role === 'admin') {
    return moduleFields[module]?.filter(f => f.editable).map(f => f.key) || [];
  }

  // 服务端环境：直接返回默认配置
  if (typeof window === 'undefined') {
    return moduleFields[module]?.filter(f => f.editable).map(f => f.key) || [];
  }

  // 客户端环境：先检查 localStorage 缓存
  const saved = localStorage.getItem('field_permissions');
  if (saved) {
    try {
      const configs = JSON.parse(saved);
      const config = configs[`${role}_${module}`];
      if (config?.enabled && config?.editableFields) {
        return config.editableFields;
      }
    } catch {
      // 解析失败
    }
  }

  // 使用默认配置（从 moduleFields 提取）
  return moduleFields[module]?.filter(f => f.editable).map(f => f.key) || [];
}

// 检查某字段是否可见
export function isFieldVisible(role: string, module: string, field: string): boolean {
  const visibleFields = getVisibleFields(role, module);
  return visibleFields.includes(field);
}

// 检查某字段是否可编辑
export function isFieldEditable(role: string, module: string, field: string): boolean {
  if (!isFieldVisible(role, module, field)) return false;
  const editableFields = getEditableFields(role, module);
  return editableFields.includes(field);
}

// 过滤数据，只返回可见字段
export function filterFieldsByPermission<T extends Record<string, unknown>>(
  data: T,
  role: string,
  module: string
): Partial<T> {
  const visibleFields = getVisibleFields(role, module);
  const result: Partial<T> = {};
  
  for (const key of visibleFields) {
    if (key in data) {
      (result as Record<string, unknown>)[key] = data[key];
    }
  }
  
  return result;
}

// 过滤数据数组
export function filterDataFields<T extends Record<string, unknown>>(
  data: T[],
  role: string,
  module: string
): Partial<T>[] {
  return data.map(item => filterFieldsByPermission(item, role, module));
}

// 根据配置过滤敏感字段
export function filterSensitiveFields<T extends Record<string, unknown>>(
  data: T,
  role: string,
  module: string
): Partial<T> {
  // 管理员不过滤
  if (role === 'admin') return data;
  
  const sensitive = sensitiveFields[module] || [];
  const result = { ...data };
  
  for (const field of sensitive) {
    if (field in result) {
      // 对敏感字段进行脱敏
      const value = result[field];
      if (typeof value === 'string' && value.length > 7) {
        (result as Record<string, unknown>)[field] = value.slice(0, 3) + '****' + value.slice(-4);
      }
    }
  }
  
  return result;
}

// ============================================================
// 默认数据权限配置
// ============================================================
const defaultDataPermissions: Record<string, Record<string, DataVisibility>> = {
  admin: {
    workers: 'all',
    orders: 'all',
    hall: 'all',
    customers: 'all',
    leads: 'all',
    students: 'all',
    courses: 'all',
    contracts: 'all',
    recommendations: 'all',
    reviews: 'all',
  },
  agent: {
    workers: 'all',  // 经纪人可看所有简历库
    orders: 'own',
    hall: 'all',
    customers: 'own',
    leads: 'hidden',
    students: 'hidden',
    courses: 'hidden',
    contracts: 'all',  // 经纪人有中介合同
    recommendations: 'all',
    reviews: 'own',
  },
  worker: {
    workers: 'hidden',
    orders: 'own',
    hall: 'all',
    customers: 'hidden',
    leads: 'hidden',
    students: 'own',
    courses: 'all',
    contracts: 'all',  // 阿姨有培训+中介合同
    recommendations: 'own',
    reviews: 'own',
  },
  customer: {
    workers: 'hidden',
    orders: 'own',
    hall: 'hidden',
    customers: 'hidden',
    leads: 'hidden',
    students: 'hidden',
    courses: 'hidden',
    contracts: 'all',  // 客户有中介合同
    recommendations: 'hidden',
    reviews: 'own',
  },
  recruiter: {
    workers: 'all',  // 招生可看所有简历库
    orders: 'hidden',
    hall: 'all',
    customers: 'hidden',
    leads: 'own',
    students: 'all',  // 招生可看所有学员
    courses: 'all',
    contracts: 'all',  // 招生有培训合同
    recommendations: 'own',
    reviews: 'own',
  },
  instructor: {
    workers: 'all',  // 讲师可看所有简历库
    orders: 'hidden',
    hall: 'all',
    customers: 'hidden',
    leads: 'hidden',
    students: 'all',  // 讲师可看所有学员
    courses: 'own',
    contracts: 'all',  // 讲师有培训合同
    recommendations: 'own',
    reviews: 'own',
  },
  training_supervisor: {
    workers: 'all',
    orders: 'all',
    hall: 'all',
    customers: 'hidden',
    leads: 'all',
    students: 'all',
    courses: 'all',
    contracts: 'all',
    recommendations: 'all',
    reviews: 'all',
  },
  worker_operator: {
    workers: 'all',  // 阿姨运营可看所有简历库
    orders: 'all',
    hall: 'all',
    customers: 'hidden',
    leads: 'own',
    students: 'hidden',
    courses: 'hidden',
    contracts: 'hidden',
    recommendations: 'all',
    reviews: 'own',
  },
};

// 从API获取数据权限配置（异步）
export async function getDataPermissions(): Promise<Record<string, Record<string, DataVisibility>>> {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (!token) {
    return defaultDataPermissions;
  }

  try {
    const res = await fetch('/api/settings?key=data_permissions', {
      headers: { 'x-session': token }
    });
    const data = await res.json();
    if (data?.ok && data?.data?.value && typeof data.data.value === 'object') {
      return data.data.value as Record<string, Record<string, DataVisibility>>;
    }
  } catch {
    // 使用默认值
  }

  return defaultDataPermissions;
}

// 获取当前角色在某个模块的数据可见范围
export async function getDataVisibility(role: string, moduleId: string): Promise<DataVisibility> {
  const permissions = await getDataPermissions();
  return permissions[role]?.[moduleId] || 'hidden';
}

// 同步版本（使用默认值，用于客户端快速判断）
export function getDataVisibilitySync(role: string, moduleId: string): DataVisibility {
  // 服务端环境：直接返回默认值
  if (typeof window === 'undefined') {
    return defaultDataPermissions[role]?.[moduleId] || 'hidden';
  }

  // 客户端环境：优先从 localStorage 读取自定义权限
  const savedPermissions = localStorage.getItem('data_permissions');
  if (savedPermissions) {
    try {
      const permissions = JSON.parse(savedPermissions);
      if (permissions[role]?.[moduleId]) {
        return permissions[role][moduleId] as DataVisibility;
      }
    } catch {
      // 解析失败，使用默认值
    }
  }

  return defaultDataPermissions[role]?.[moduleId] || 'hidden';
}

// 检查角色是否能看到某个模块的数据列表
export function canViewDataList(role: string, moduleId: string): boolean {
  const visibility = getDataVisibilitySync(role, moduleId);
  return visibility !== 'hidden';
}

// 根据数据权限过滤数据
export function filterDataByPermission<T extends Record<string, unknown>>(
  data: T[],
  role: string,
  moduleId: string,
  userId: string,
  teamId?: string
): T[] {
  const visibility = getDataVisibilitySync(role, moduleId);

  if (visibility === 'all') {
    return data;
  }

  if (visibility === 'hidden') {
    return [];
  }

  if (visibility === 'own') {
    // 根据模块类型过滤
    switch (moduleId) {
      case 'workers':
        return data.filter(item => 
          item.created_by === userId || item.maintained_by === userId
        );
      case 'orders':
        return data.filter(item => 
          item.agent_id === userId || item.worker_id === userId
        );
      case 'customers':
        return data.filter(item => item.agent_id === userId);
      case 'leads':
        return data.filter(item => item.recruiter_id === userId);
      case 'students':
        return data.filter(item => 
          item.recruiter_id === userId || item.instructor_id === userId
        );
      case 'courses':
        return data.filter(item => 
          item.instructor_id === userId || item.created_by === userId
        );
      case 'contracts':
        return data.filter(item => 
          item.agent_id === userId || item.recruiter_id === userId || item.worker_id === userId
        );
      case 'recommendations':
        return data.filter(item => 
          item.recommender_id === userId || item.agent_id === userId || item.worker_id === userId
        );
      case 'reviews':
        return data.filter(item => 
          item.worker_id === userId || item.agent_id === userId || item.reviewer_id === userId
        );
      default:
        return data;
    }
  }

  if (visibility === 'team') {
    // 团队过滤（需要teamId）
    if (!teamId) return data;
    return data.filter(item => item.team_id === teamId);
  }

  return data;
}

// 获取当前用户ID
export function getCurrentUserId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('miniapp_userid') || localStorage.getItem('auth_userid') || '';
}

// 获取当前角色
export function getCurrentRole(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_role') || localStorage.getItem('miniapp_role') || '';
}
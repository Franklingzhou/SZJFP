'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlatformInfo, CommissionRule, PointRule, CreditRule, ModuleConfig, TextConfig, ReferralConfig, ReferralType, ReviewWorkflowConfig, ReviewWorkflowItem, WorkerTier, CreditConfig, Role } from '@/lib/types';
import { ROLE_LABELS as ALL_ROLE_LABELS } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type TabKey = 'platform' | 'commission' | 'points' | 'modules' | 'texts' | 'page_access' | 'certificate' | 'reminder' | 'referral' | 'review_workflow' | 'worker_tiers';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'platform', label: '基本设置' },
  { key: 'commission', label: '佣金配置' },
  { key: 'points', label: '积分规则' },
  { key: 'referral', label: '推荐配置' },
  { key: 'worker_tiers', label: '等级体系' },
  { key: 'review_workflow', label: '审核流程' },
  { key: 'modules', label: '模块管理' },
  { key: 'texts', label: '文字管理' },
  { key: 'certificate', label: '证书设置' },
  { key: 'reminder', label: '提醒设置' },
  { key: 'page_access', label: '页面权限' },
];

// 默认配置（API不可用时的回退）
const defaultPlatformInfo: PlatformInfo = {
  name: '家政共创平台',
  description: '连接阿姨、经纪人、招生代理、培训讲师和客户的多角色协作系统',
  phone: '400-888-9999',
  email: 'contact@jiazheng.com',
  address: '北京市朝阳区建国路88号',
  icp: '京ICP备2024XXXXXX号',
};

const defaultCommissionRules: CommissionRule[] = [
  { id: 'cr1', name: '服务费分账', type: 'service_fee', description: '经纪人推荐阿姨上户的服务费分账', rates: [{ role: 'agent', rate: 40, description: '经纪人' }, { role: 'recruiter', rate: 15, description: '招生' }, { role: 'platform', rate: 45, description: '平台' }], active: true, createdAt: '2024-01-01' },
  { id: 'cr2', name: '培训费分账', type: 'training_fee', description: '招生推荐阿姨培训的学费分账', rates: [{ role: 'recruiter', rate: 20, description: '招生' }, { role: 'instructor', rate: 40, description: '讲师' }, { role: 'platform', rate: 40, description: '平台' }], active: true, createdAt: '2024-01-01' },
  { id: 'cr3', name: '中介费分账', type: 'agency_fee', description: '经纪人匹配客户的中介费分账', rates: [{ role: 'agent', rate: 50, description: '经纪人' }, { role: 'platform', rate: 50, description: '平台' }], active: true, createdAt: '2024-01-01' },
];

const defaultPointRules: PointRule[] = [
  { id: 'pr1', action: '完成订单', points: 50, targetRole: 'worker', active: true, enabled: true },
  { id: 'pr2', action: '获得好评', points: 20, targetRole: 'worker', active: true, enabled: true },
  { id: 'pr3', action: '推荐新阿姨', points: 100, targetRole: 'agent', active: true, enabled: true },
  { id: 'pr4', action: '成功匹配', points: 30, targetRole: 'agent', active: true, enabled: true },
  { id: 'pr5', action: '推荐学员', points: 50, targetRole: 'recruiter', active: true, enabled: true },
  { id: 'pr6', action: '课程好评', points: 20, targetRole: 'instructor', active: true, enabled: true },
  { id: 'pr7', action: '每日签到', points: 5, targetRole: 'worker', active: true, enabled: true },
];

const defaultCreditRules: CreditRule[] = [
  { id: 'cdr1', event: '违约退出', scoreChange: -200, active: true, action: 'breach', score: -200, description: '提前退出订单', enabled: true },
  { id: 'cdr2', event: '虚假信息', scoreChange: -100, active: true, action: 'fake_info', score: -100, description: '提供虚假简历信息', enabled: true },
  { id: 'cdr3', event: '完成订单', scoreChange: 50, active: true, action: 'complete_order', score: 50, description: '正常完成服务订单', enabled: true },
  { id: 'cdr4', event: '获得好评', scoreChange: 20, active: true, action: 'good_review', score: 20, description: '获得客户好评', enabled: true },
  { id: 'cdr5', event: '投诉成立', scoreChange: -150, active: true, action: 'complaint', score: -150, description: '客户投诉经核实成立', enabled: true },
];

const defaultModules: ModuleConfig[] = [
  { id: 'dashboard', name: '数据看板', role: 'admin', enabled: true },
  { id: 'reviews', name: '角色审核', role: 'admin', enabled: true },
  { id: 'workers', name: '阿姨库', role: 'admin', enabled: true },
  { id: 'commission', name: '佣金配置', role: 'admin', enabled: true },
  { id: 'settlement', name: '分账管理', role: 'admin', enabled: true },
  { id: 'credit', name: '诚信分', role: 'admin', enabled: true },
  { id: 'deposit', name: '保证金', role: 'admin', enabled: true },
  { id: 'points', name: '积分系统', role: 'admin', enabled: true },
  { id: 'orders', name: '订单管理', role: 'admin', enabled: true },
  { id: 'training', name: '培训管理', role: 'admin', enabled: true },
  { id: 'venues', name: '场地管理', role: 'admin', enabled: true },
  { id: 'contracts', name: '合同管理', role: 'admin', enabled: true },
  { id: 'reports', name: '数据报表', role: 'admin', enabled: true },
  { id: 'settings', name: '系统设置', role: 'admin', enabled: true },
  { id: 'worker_home', name: '阿姨首页', role: 'worker', enabled: true },
  { id: 'worker_jobs', name: '接单大厅', role: 'worker', enabled: true },
  { id: 'agent_home', name: '经纪人首页', role: 'agent', enabled: true },
  { id: 'agent_workers', name: '阿姨管理', role: 'agent', enabled: true },
  { id: 'recruiter_home', name: '招生首页', role: 'recruiter', enabled: true },
  { id: 'recruiter_leads', name: '线索管理', role: 'recruiter', enabled: true },
  { id: 'instructor_home', name: '讲师首页', role: 'instructor', enabled: true },
  { id: 'instructor_courses', name: '课程管理', role: 'instructor', enabled: true },
  { id: 'customer_home', name: '客户端首页', role: 'customer', enabled: true },
  { id: 'training_home', name: '培训主管首页', role: 'training_supervisor', enabled: true },
  { id: 'worker_ops_home', name: '阿姨运营首页', role: 'worker_operator', enabled: true },
  { id: 'worker_ops_hall', name: '合单大厅', role: 'worker_operator', enabled: true },
];

const allRolesList: Role[] = ['admin', 'agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator', 'worker', 'customer'];

const defaultReferralConfig: ReferralConfig = {
  types: [
    {
      id: 'refer_worker', name: '推荐当阿姨', description: '推荐人选成为阿姨，进入线索池待签约',
      target_pool: 'leads', enabled: true,
      allowed_roles: ['agent', 'recruiter', 'instructor', 'training_supervisor', 'worker_operator'],
      reward: { type: 'commission', commission_percent: 5, points: 0, trigger: 'on_sign' },
    },
    {
      id: 'refer_customer', name: '推荐找阿姨', description: '推荐有需求的客户，进入客户公海库',
      target_pool: 'customer_leads', enabled: true,
      allowed_roles: ['agent', 'worker', 'customer', 'recruiter'],
      reward: { type: 'points', commission_percent: 0, points: 50, trigger: 'on_complete' },
    },
  ],
  global_settings: { max_pending_per_user: 10, auto_approve: true },
};

const defaultReviewWorkflow: ReviewWorkflowConfig = {
  workflows: [
    { id: 'worker_resume', name: '阿姨简历审核', description: '阿姨提交/修改简历后需要审核', enabled: true, reviewer_roles: ['admin', 'training_supervisor', 'worker_operator'] },
    { id: 'course_publish', name: '课程发布审核', description: '讲师发布课程后需要审核', enabled: true, reviewer_roles: ['admin', 'training_supervisor'] },
    { id: 'contract_sign', name: '合同签约审核', description: '合同签约需要审核确认', enabled: true, reviewer_roles: ['admin', 'training_supervisor'] },
    { id: 'course_schedule', name: '排课审核', description: '排课计划需要审核', enabled: true, reviewer_roles: ['admin', 'training_supervisor'] },
    { id: 'certificate_issue', name: '证书颁发审核', description: '证书颁发是否需要管理员确认', enabled: false, reviewer_roles: ['admin'] },
    { id: 'lead_claim', name: '公海线索认领审核', description: '公海线索被经纪人认领是否需要审核', enabled: false, reviewer_roles: ['admin'] },
  ],
};

const defaultCreditConfig: CreditConfig = {
  initial_score: 1000, min_score: 0, blacklist_threshold: 300, restore_days: 30,
};

const defaultTexts: TextConfig[] = [
  { id: 't1', key: 'worker_welcome', label: '阿姨欢迎语', group: 'worker', value: '欢迎回来，今天也要加油哦！' },
  { id: 't2', key: 'agent_welcome', label: '经纪人欢迎语', group: 'agent', value: '新的一天，新的匹配机会！' },
  { id: 't3', key: 'recruiter_welcome', label: '招生欢迎语', group: 'recruiter', value: '欢迎回来，继续推荐优质阿姨！' },
  { id: 't4', key: 'instructor_welcome', label: '讲师欢迎语', group: 'instructor', value: '欢迎回来，今天有新的学员等你！' },
  { id: 't5', key: 'customer_welcome', label: '客户欢迎语', group: 'customer', value: '您好，为您推荐优质家政服务！' },
  { id: 't6', key: 'ts_welcome', label: '培训主管欢迎语', group: 'training_supervisor', value: '欢迎回来，今天有新的审批待处理！' },
  { id: 't7', key: 'wo_welcome', label: '阿姨运营欢迎语', group: 'worker_operator', value: '欢迎回来，一起为阿姨们创造更多机会！' },
  { id: 't8', key: 'order_confirm', label: '下单确认提示', group: 'order', value: '确认下单后，经纪人将在30分钟内为您匹配阿姨' },
  { id: 't9', key: 'credit_warning', label: '诚信分警告', group: 'credit', value: '您的诚信分较低，请保持良好的服务记录' },
  { id: 't10', key: 'deposit_notice', label: '保证金缴纳提醒', group: 'deposit', value: '请及时缴纳保证金，以保障服务质量' },
  { id: 't11', key: 'review_reminder', label: '评价提醒', group: 'review', value: '服务已完成，请对阿姨进行评价' },
  { id: 't12', key: 'training_reminder', label: '培训提醒', group: 'training', value: '您有新的培训课程即将开始' },
  { id: 't13', key: 'commission_rule', label: '佣金说明', group: 'commission', value: '佣金将在服务完成后7个工作日内结算' },
];

// 通用保存到API的函数
async function saveSetting(key: string, value: unknown): Promise<boolean> {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['x-session'] = token;
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ key, value }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// 通用从API加载的函数
async function loadSettingsFromAPI(): Promise<Record<string, unknown> | null> {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    const headers: Record<string, string> = {};
    if (token) headers['x-session'] = token;
    const res = await fetch('/api/settings', { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 加载 worker_tiers
async function loadWorkerTiersFromAPI(): Promise<WorkerTier[] | null> {
  try {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
    const headers: Record<string, string> = {};
    if (token) headers['x-session'] = token;
    const res = await fetch('/api/worker-tiers', { headers });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('platform');
  const [loading, setLoading] = useState(true);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({ ...defaultPlatformInfo });
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>(defaultCommissionRules.map(r => ({ ...r, rates: r.rates.map(rt => ({ ...rt })) })));
  const [pointRules, setPointRules] = useState<PointRule[]>(defaultPointRules.map(r => ({ ...r })));
  const [creditRules, setCreditRules] = useState<CreditRule[]>(defaultCreditRules.map(r => ({ ...r })));
  const [modules, setModules] = useState<ModuleConfig[]>(defaultModules.map(m => ({ ...m })));
  const [texts, setTexts] = useState<TextConfig[]>(defaultTexts.map(t => ({ ...t })));
  const [pageAccess, setPageAccess] = useState<Record<string, string[]>>({});
  const [reminderSettings, setReminderSettings] = useState({
    lead_unfollowed_hours: 24,
    order_unmatched_hours: 48,
    worker_inactive_days: 30,
    contract_unsigned_hours: 72,
    enrollment_unscheduled_days: 7,
  });
  const [referralConfig, setReferralConfig] = useState<ReferralConfig>(JSON.parse(JSON.stringify(defaultReferralConfig)));
  const [reviewWorkflow, setReviewWorkflow] = useState<ReviewWorkflowConfig>(JSON.parse(JSON.stringify(defaultReviewWorkflow)));
  const [workerTiers, setWorkerTiers] = useState<WorkerTier[]>([]);
  const [creditConfig, setCreditConfig] = useState<CreditConfig>({ ...defaultCreditConfig });

  // 从API加载设置
  const loadSettings = useCallback(async () => {
    try {
      const raw = await loadSettingsFromAPI();
      if (!raw) return;

      // API返回 { ok: true, data: [{ key, value }, ...] }
      // 转换为 { key: value } 的 Map 方便读取
      const items: Array<{ key: string; value: unknown }> = raw.data && Array.isArray(raw.data)
        ? raw.data
        : [];
      const settingsMap: Record<string, unknown> = {};
      for (const item of items) {
        settingsMap[item.key] = item.value;
      }

      if (settingsMap.platform_info) {
        setPlatformInfo({ ...defaultPlatformInfo, ...(settingsMap.platform_info as PlatformInfo) });
      }
      if (settingsMap.commission_rules && Array.isArray(settingsMap.commission_rules)) {
        setCommissionRules(settingsMap.commission_rules as CommissionRule[]);
      }
      if (settingsMap.point_rules && Array.isArray(settingsMap.point_rules)) {
        setPointRules(settingsMap.point_rules as PointRule[]);
      }
      if (settingsMap.credit_rules && Array.isArray(settingsMap.credit_rules)) {
        setCreditRules(settingsMap.credit_rules as CreditRule[]);
      }
      if (settingsMap.modules) {
        const md = settingsMap.modules as Record<string, { id: string; name: string; enabled: boolean }[]>;
        if (md.pc && md.miniapp) {
          const allModules = [
            ...md.pc.map((m) => ({ ...m, role: 'admin' as const })),
            ...md.miniapp.map((m) => ({ ...m, role: 'all' as const })),
          ];
          setModules(allModules.length > 0 ? allModules : defaultModules);
        } else if (Array.isArray(settingsMap.modules)) {
          setModules(settingsMap.modules as ModuleConfig[]);
        }
      }
      if (settingsMap.texts && Array.isArray(settingsMap.texts)) {
        setTexts(settingsMap.texts as TextConfig[]);
      }
      if (settingsMap.page_access && typeof settingsMap.page_access === 'object') {
        setPageAccess(settingsMap.page_access as Record<string, string[]>);
      }
      if (settingsMap.reminder_settings && typeof settingsMap.reminder_settings === 'object') {
        const rem = settingsMap.reminder_settings as Record<string, unknown>;
        setReminderSettings(prev => ({
          lead_unfollowed_hours: typeof rem.lead_unfollowed_hours === 'number' ? rem.lead_unfollowed_hours : prev.lead_unfollowed_hours,
          order_unmatched_hours: typeof rem.order_unmatched_hours === 'number' ? rem.order_unmatched_hours : prev.order_unmatched_hours,
          worker_inactive_days: typeof rem.worker_inactive_days === 'number' ? rem.worker_inactive_days : prev.worker_inactive_days,
          contract_unsigned_hours: typeof rem.contract_unsigned_hours === 'number' ? rem.contract_unsigned_hours : prev.contract_unsigned_hours,
          enrollment_unscheduled_days: typeof rem.enrollment_unscheduled_days === 'number' ? rem.enrollment_unscheduled_days : prev.enrollment_unscheduled_days,
        }));
      }
      if (settingsMap.referral_config && typeof settingsMap.referral_config === 'object') {
        setReferralConfig(settingsMap.referral_config as ReferralConfig);
      }
      if (settingsMap.review_workflow && typeof settingsMap.review_workflow === 'object') {
        setReviewWorkflow(settingsMap.review_workflow as ReviewWorkflowConfig);
      }
      if (settingsMap.credit_config && typeof settingsMap.credit_config === 'object') {
        setCreditConfig({ ...defaultCreditConfig, ...(settingsMap.credit_config as CreditConfig) });
      }
      // worker_tiers 从独立 API 加载
      loadWorkerTiersFromAPI().then(tiers => { if (tiers) setWorkerTiers(tiers); }).catch(() => {});
    } catch {
      // API不可用，使用默认值
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-sm text-slate-500 mt-1">管理平台的基本配置、佣金规则、积分规则、模块开关和文字标签（数据已持久化到数据库）</p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'platform' && <PlatformSettings info={platformInfo} setInfo={setPlatformInfo} />}
      {activeTab === 'commission' && <CommissionSettings rules={commissionRules} setRules={setCommissionRules} />}
      {activeTab === 'points' && <PointsSettings pointRules={pointRules} setPointRules={setPointRules} creditRules={creditRules} setCreditRules={setCreditRules} creditConfig={creditConfig} setCreditConfig={setCreditConfig} />}
      {activeTab === 'modules' && <ModulesSettings modules={modules} setModules={setModules} />}
      {activeTab === 'texts' && <TextsSettings texts={texts} setTexts={setTexts} />}
      {activeTab === 'certificate' && <CertificateSettings />}
      {activeTab === 'reminder' && <ReminderSettings settings={reminderSettings} setSettings={setReminderSettings} />}
      {activeTab === 'page_access' && <PageAccessSettings pageAccess={pageAccess} setPageAccess={setPageAccess} />}
      {activeTab === 'referral' && <ReferralSettings config={referralConfig} setConfig={setReferralConfig} />}
      {activeTab === 'review_workflow' && <ReviewWorkflowSettings config={reviewWorkflow} setConfig={setReviewWorkflow} />}
      {activeTab === 'worker_tiers' && <WorkerTiersSettings tiers={workerTiers} setTiers={setWorkerTiers} />}
    </div>
  );
}

/* ==================== 基本设置 ==================== */
function PlatformSettings({ info, setInfo }: { info: PlatformInfo; setInfo: (v: PlatformInfo) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('platform_info', info);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
        </button>
      </div>
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">平台基本信息</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">平台名称</label>
            <input type="text" value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">ICP备案号</label>
            <input type="text" value={info.icp} onChange={e => setInfo({ ...info, icp: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">联系电话</label>
            <input type="text" value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">联系邮箱</label>
            <input type="text" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">公司地址</label>
            <input type="text" value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">平台简介</label>
            <textarea value={info.description} onChange={e => setInfo({ ...info, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== 佣金配置 ==================== */
function CommissionSettings({ rules, setRules }: { rules: CommissionRule[]; setRules: (v: CommissionRule[]) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('commission_rules', rules);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const updateRate = (ruleId: string, roleKey: string, newRate: number) => {
    setRules(rules.map(r => {
      if (r.id !== ruleId) return r;
      const totalOther = r.rates.reduce((sum, rt) => rt.role !== roleKey ? sum + rt.rate : sum, 0);
      if (newRate + totalOther > 100) return r;
      return { ...r, rates: r.rates.map(rt => rt.role === roleKey ? { ...rt, rate: newRate } : rt) };
    }));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const addRule = () => {
    const newId = 'cr' + Date.now();
    setRules([...rules, {
      id: newId,
      name: '新规则',
      type: 'custom',
      description: '自定义分账规则',
      rates: [{ role: 'platform', rate: 100, description: '平台' }],
      active: true,
      createdAt: new Date().toISOString().slice(0, 10),
    }]);
  };

  const addRateToRule = (ruleId: string) => {
    setRules(rules.map(r => {
      if (r.id !== ruleId) return r;
      return { ...r, rates: [...r.rates, { role: 'new_role', rate: 0, description: '新角色' }] };
    }));
  };

  const removeRateFromRule = (ruleId: string, roleKey: string) => {
    setRules(rules.map(r => {
      if (r.id !== ruleId) return r;
      return { ...r, rates: r.rates.filter(rt => rt.role !== roleKey) };
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button onClick={addRule} className="px-4 py-2 border border-[#1e3a5f] text-[#1e3a5f] rounded-md text-sm hover:bg-slate-50">
          + 新增规则
        </button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
        </button>
      </div>
      {rules.map(rule => (
        <div key={rule.id} className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="font-medium text-slate-800">{rule.name}</h3>
              <span className="text-xs text-slate-400">{rule.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${rule.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {rule.active ? '启用' : '停用'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleRule(rule.id)} className="text-xs px-2 py-1 border rounded hover:bg-slate-50">
                {rule.active ? '停用' : '启用'}
              </button>
              <button onClick={() => deleteRule(rule.id)} className="text-xs px-2 py-1 border rounded text-red-600 hover:bg-red-50">删除</button>
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-3">{rule.description}</p>
          <div className="grid grid-cols-3 gap-3">
            {rule.rates.map(rate => (
              <div key={rate.role} className="bg-slate-50 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <input
                    type="text"
                    value={rate.description || rate.role}
                    onChange={e => setRules(rules.map(r => r.id === rule.id ? { ...r, rates: r.rates.map(rt => rt.role === rate.role ? { ...rt, description: e.target.value } : rt) } : r))}
                    className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#1e3a5f] outline-none w-full"
                  />
                  {rule.rates.length > 1 && (
                    <button onClick={() => removeRateFromRule(rule.id, rate.role)} className="text-xs text-red-400 hover:text-red-600 ml-1">x</button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={rate.rate}
                    onChange={e => updateRate(rule.id, rate.role, Number(e.target.value))}
                    className="w-16 px-2 py-1 border rounded text-sm text-center"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            合计: {rule.rates.reduce((s, r) => s + r.rate, 0)}%
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => addRateToRule(rule.id)} className="text-xs text-blue-600 hover:underline">+ 添加角色</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== 页面权限配置 ==================== */

const ALL_ROLES = ['admin', 'worker_operator', 'training_supervisor', 'agent', 'recruiter', 'instructor', 'worker', 'customer'] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  worker_operator: '阿姨运营',
  training_supervisor: '培训主管',
  agent: '经纪人',
  recruiter: '招生老师',
  instructor: '讲师',
  worker: '阿姨',
  customer: '客户',
};

const ADMIN_PAGES = [
  { id: 'dashboard', label: '仪表盘' },
  { id: 'reviews', label: '角色审核' },
  { id: 'users', label: '用户管理' },
  { id: 'workers', label: '阿姨库管理' },
  { id: 'clients', label: '客户管理' },
  { id: 'leads', label: '线索管理' },
  { id: 'audits', label: '简历审核' },
  { id: 'commission', label: '佣金配置' },
  { id: 'settlement', label: '分账管理' },
  { id: 'hall', label: '订单大厅' },
  { id: 'orders', label: '订单管理' },
  { id: 'recommendations', label: '推荐记录' },
  { id: 'students', label: '学员管理' },
  { id: 'courses', label: '课程管理' },
  { id: 'course-schedules', label: '课表管理' },
  { id: 'course-grading', label: '课程考核' },
  { id: 'notifications', label: '消息通知' },
  { id: 'contracts', label: '合同管理' },
  { id: 'contract-templates', label: '合同模板' },
  { id: 'lead-contracts', label: '学员合同' },
  { id: 'training-contracts', label: '培训合同' },
  { id: 'team', label: '团队管理' },
  { id: 'venues', label: '场地管理' },
  { id: 'settings', label: '系统设置' },
  { id: 'profile-settings', label: '个人设置' },
  { id: 'reset-password', label: '重置密码' },
];

function PageAccessSettings({ pageAccess, setPageAccess }: {
  pageAccess: Record<string, string[]>;
  setPageAccess: (v: Record<string, string[]>) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (pageId: string, role: string) => {
    const current = pageAccess[pageId] || [];
    const next = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    setPageAccess({ ...pageAccess, [pageId]: next });
  };

  const selectAll = (role: string) => {
    const next = { ...pageAccess };
    ADMIN_PAGES.forEach(p => {
      const cur = next[p.id] || [];
      if (!cur.includes(role)) {
        next[p.id] = [...cur, role];
      }
    });
    setPageAccess(next);
  };

  const deselectAll = (role: string) => {
    const next = { ...pageAccess };
    ADMIN_PAGES.forEach(p => {
      const cur = next[p.id] || [];
      next[p.id] = cur.filter(r => r !== role);
    });
    setPageAccess(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('page_access', pageAccess);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存权限配置'}
        </button>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600 sticky left-0 bg-slate-50 min-w-[140px]">页面</th>
              {ALL_ROLES.map(role => (
                <th key={role} className="text-center px-3 py-3 font-medium text-slate-600 min-w-[80px]">
                  <div>{ROLE_LABELS[role] || role}</div>
                  <div className="flex gap-1 justify-center mt-1">
                    <button onClick={() => selectAll(role)} className="text-xs text-blue-500 hover:underline">全选</button>
                    <button onClick={() => deselectAll(role)} className="text-xs text-red-400 hover:underline">清空</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {ADMIN_PAGES.map(page => (
              <tr key={page.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">{page.label}</td>
                {ALL_ROLES.map(role => {
                  const checked = (pageAccess[page.id] || []).includes(role);
                  return (
                    <td key={role} className="text-center px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(page.id, role)}
                        className="w-4 h-4 accent-[#1e3a5f] cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==================== 积分规则 ==================== */
function PointsSettings({ pointRules, setPointRules, creditRules, setCreditRules, creditConfig, setCreditConfig }: {
  pointRules: PointRule[]; setPointRules: (v: PointRule[]) => void;
  creditRules: CreditRule[]; setCreditRules: (v: CreditRule[]) => void;
  creditConfig: CreditConfig; setCreditConfig: (v: CreditConfig) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState<'points' | 'credit'>('points');

  const handleSave = async () => {
    setSaving(true);
    const [ok1, ok2, ok3] = await Promise.all([
      saveSetting('point_rules', pointRules),
      saveSetting('credit_rules', creditRules),
      saveSetting('credit_config', creditConfig),
    ]);
    setSaving(false);
    setSaved(ok1 && ok2 && ok3);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存规则'}
        </button>
      </div>

      <div className="flex gap-4 border-b">
        <button onClick={() => setSubTab('points')} className={`pb-2 text-sm ${subTab === 'points' ? 'border-b-2 border-[#1e3a5f] text-[#1e3a5f] font-medium' : 'text-slate-500'}`}>积分获取规则</button>
        <button onClick={() => setSubTab('credit')} className={`pb-2 text-sm ${subTab === 'credit' ? 'border-b-2 border-[#1e3a5f] text-[#1e3a5f] font-medium' : 'text-slate-500'}`}>诚信分规则</button>
      </div>

      {subTab === 'points' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">行为</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">积分</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">适用角色</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">状态</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pointRules.map(rule => (
                <tr key={rule.id}>
                  <td className="px-4 py-3">{rule.action}</td>
                  <td className="px-4 py-3">
                    <input type="number" value={rule.points} onChange={e => setPointRules(pointRules.map(r => r.id === rule.id ? { ...r, points: Number(e.target.value) } : r))} className="w-16 px-2 py-1 border rounded text-sm text-center" />
                  </td>
                  <td className="px-4 py-3">{rule.targetRole}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rule.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{rule.active ? '启用' : '停用'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPointRules(pointRules.map(r => r.id === rule.id ? { ...r, active: !r.active } : r))} className="text-xs text-blue-600 hover:underline">
                      {rule.active ? '停用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'credit' && (
        <div className="space-y-4">
          {/* 诚信分全局配置 */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-medium text-slate-800 mb-3">全局设置</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">初始分数</label>
                <input type="number" value={creditConfig.initial_score} onChange={e => setCreditConfig({ ...creditConfig, initial_score: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">最低分数</label>
                <input type="number" value={creditConfig.min_score} onChange={e => setCreditConfig({ ...creditConfig, min_score: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">黑名单阈值</label>
                <input type="number" value={creditConfig.blacklist_threshold} onChange={e => setCreditConfig({ ...creditConfig, blacklist_threshold: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">解冻天数</label>
                <input type="number" value={creditConfig.restore_days} onChange={e => setCreditConfig({ ...creditConfig, restore_days: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md text-sm" />
              </div>
            </div>
          </div>
          {/* 事件规则 */}
          <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">事件</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">分值变化</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">描述</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">状态</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creditRules.map(rule => (
                <tr key={rule.id}>
                  <td className="px-4 py-3">{rule.event}</td>
                  <td className="px-4 py-3">
                    <span className={rule.scoreChange > 0 ? 'text-green-600' : 'text-red-600'}>{rule.scoreChange > 0 ? '+' : ''}{rule.scoreChange}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{rule.description}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rule.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{rule.active ? '启用' : '停用'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setCreditRules(creditRules.map(r => r.id === rule.id ? { ...r, active: !r.active } : r))} className="text-xs text-blue-600 hover:underline">
                      {rule.active ? '停用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== 模块管理 ==================== */
function ModulesSettings({ modules, setModules }: { modules: ModuleConfig[]; setModules: (v: ModuleConfig[]) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // 将modules分为pc和miniapp两组存入
    const modulesData = {
      pc: modules.filter(m => m.role === 'admin').map(m => ({ id: m.id, name: m.name, enabled: m.enabled })),
      miniapp: modules.filter(m => m.role !== 'admin').map(m => ({ id: m.id, name: m.name, enabled: m.enabled })),
    };
    const ok = await saveSetting('modules', modulesData);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleModule = (id: string) => {
    setModules(modules.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const roleGroups: { label: string; items: ModuleConfig[] }[] = [
    { label: '管理员后台', items: modules.filter(m => m.role === 'admin') },
    { label: '经纪人', items: modules.filter(m => m.role === 'agent') },
    { label: '招生', items: modules.filter(m => m.role === 'recruiter') },
    { label: '讲师', items: modules.filter(m => m.role === 'instructor') },
    { label: '培训主管', items: modules.filter(m => m.role === 'training_supervisor') },
    { label: '阿姨运营', items: modules.filter(m => m.role === 'worker_operator') },
    { label: '阿姨', items: modules.filter(m => m.role === 'worker') },
    { label: '客户', items: modules.filter(m => m.role === 'customer') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">关闭模块后，对应角色将看不到该功能入口</p>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
        </button>
      </div>
      {roleGroups.filter(g => g.items.length > 0).map(group => (
        <div key={group.label} className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-slate-800 mb-3">{group.label}</h3>
          <div className="space-y-2">
            {group.items.map(mod => (
              <div key={mod.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-slate-50">
                <div>
                  <span className="text-sm text-slate-700">{mod.name}</span>
                </div>
                <button
                  onClick={() => toggleModule(mod.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${mod.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mod.enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== 证书设置（v038：已归入简历） ==================== */
function CertificateSettings() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">证书管理说明</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium mb-2">📜 证书已归入简历范畴</p>
          <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
            <li>内部角色（6个）和阿姨均可上传证书到简历</li>
            <li>证书上传后状态为「待审核」，由管理员在「证书管理」页面审批</li>
            <li>审批通过后，证书在阿姨公开简历页对外展示</li>
            <li>讲师考核仅打分（优秀/合格/不合格），不再自动颁发证书</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-slate-50 rounded-lg p-4 border">
            <h3 className="font-medium text-slate-700 mb-2">🏅 考核打分标准</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>分数 ≥ 80</span><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">优秀</span></div>
              <div className="flex justify-between"><span>60 ≤ 分数 &lt; 80</span><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">合格</span></div>
              <div className="flex justify-between"><span>分数 &lt; 60</span><span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">不合格</span></div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border">
            <h3 className="font-medium text-slate-700 mb-2">📋 证书状态</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>待审核</span><span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">pending</span></div>
              <div className="flex justify-between"><span>已通过</span><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">approved</span></div>
              <div className="flex justify-between"><span>已拒绝</span><span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">rejected</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== 提醒设置 ==================== */
function ReminderSettings({ settings, setSettings }: {
  settings: {
    lead_unfollowed_hours: number;
    order_unmatched_hours: number;
    worker_inactive_days: number;
    contract_unsigned_hours: number;
    enrollment_unscheduled_days: number;
  };
  setSettings: React.Dispatch<React.SetStateAction<typeof settings>>;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof settings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('reminder_settings', settings);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
        </button>
      </div>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">防遗忘提醒配置</h2>
          <p className="text-sm text-slate-500 mt-1">
            设置各类超时提醒的阈值，定时任务会根据这些配置自动发送通知提醒相关人员处理。
          </p>
        </div>

        {/* 线索未跟进 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-700">🔍 线索超时未跟进</h3>
              <p className="text-xs text-slate-400 mt-0.5">线索创建后超过设定小时仍未跟进，提醒招生代理及时处理</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={720}
                value={settings.lead_unfollowed_hours}
                onChange={e => update('lead_unfollowed_hours', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-md text-sm text-center"
              />
              <span className="text-sm text-slate-500">小时</span>
            </div>
          </div>
        </div>

        {/* 订单未匹配 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-700">📦 订单超时未派单</h3>
              <p className="text-xs text-slate-400 mt-0.5">订单创建后超过设定小时仍未分配阿姨，提醒经纪人尽快匹配</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={720}
                value={settings.order_unmatched_hours}
                onChange={e => update('order_unmatched_hours', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-md text-sm text-center"
              />
              <span className="text-sm text-slate-500">小时</span>
            </div>
          </div>
        </div>

        {/* 阿姨不活跃 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-700">😴 阿姨长期未活跃</h3>
              <p className="text-xs text-slate-400 mt-0.5">阿姨超过设定天数无任何订单记录，提醒关联经纪人/招生代理召回</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={settings.worker_inactive_days}
                onChange={e => update('worker_inactive_days', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-md text-sm text-center"
              />
              <span className="text-sm text-slate-500">天</span>
            </div>
          </div>
        </div>

        {/* 合同未确认 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-700">📝 合同超时未确认</h3>
              <p className="text-xs text-slate-400 mt-0.5">合同创建后超过设定小时未确认，提醒相关负责人审核（培训合同→培训主管，中介合同→经纪人）</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={720}
                value={settings.contract_unsigned_hours}
                onChange={e => update('contract_unsigned_hours', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-md text-sm text-center"
              />
              <span className="text-sm text-slate-500">小时</span>
            </div>
          </div>
        </div>

        {/* 报名未排课 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-slate-700">📅 报名后超时未排课</h3>
              <p className="text-xs text-slate-400 mt-0.5">学员报名课程后超过设定天数仍无排课安排，提醒招生代理协调讲师排课</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={90}
                value={settings.enrollment_unscheduled_days}
                onChange={e => update('enrollment_unscheduled_days', parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 border rounded-md text-sm text-center"
              />
              <span className="text-sm text-slate-500">天</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==================== 文字管理 ==================== */
function TextsSettings({ texts, setTexts }: { texts: TextConfig[]; setTexts: (v: TextConfig[]) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchKey, setSearchKey] = useState('');

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('texts', texts);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  const filtered = searchKey ? texts.filter(t => t.key.includes(searchKey) || t.label.includes(searchKey) || t.value.includes(searchKey)) : texts;

  const updateValue = (id: string, value: string) => {
    setTexts(texts.map(t => t.id === id ? { ...t, value } : t));
  };

  const groups = [...new Set(filtered.map(t => t.group))];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input type="text" placeholder="搜索配置项..." value={searchKey} onChange={e => setSearchKey(e.target.value)} className="px-3 py-2 border rounded-md text-sm w-64" />
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存文字'}
        </button>
      </div>
      {groups.map(group => (
        <div key={group} className="bg-white rounded-lg border p-4">
          <h3 className="font-medium text-slate-800 mb-3">{group}</h3>
          <div className="space-y-3">
            {filtered.filter(t => t.group === group).map(text => (
              <div key={text.id} className="grid grid-cols-[200px_1fr] gap-3 items-center">
                <div>
                  <div className="text-sm text-slate-700">{text.label}</div>
                  <div className="text-xs text-slate-400">{text.key}</div>
                </div>
                <input type="text" value={text.value} onChange={e => updateValue(text.id, e.target.value)} className="px-3 py-2 border rounded-md text-sm" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== 推荐配置 ==================== */
function ReferralSettings({ config, setConfig }: { config: ReferralConfig; setConfig: (v: ReferralConfig) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('referral_config', config);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleRole = (typeIdx: number, role: Role) => {
    const newConfig = JSON.parse(JSON.stringify(config)) as ReferralConfig;
    const roles = newConfig.types[typeIdx].allowed_roles;
    if (roles.includes(role)) {
      newConfig.types[typeIdx].allowed_roles = roles.filter((r: Role) => r !== role);
    } else {
      newConfig.types[typeIdx].allowed_roles = [...roles, role];
    }
    setConfig(newConfig);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
        </button>
      </div>
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">全局推荐设置</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">每人最多待处理推荐数</label>
            <input type="number" value={config.global_settings.max_pending_per_user} onChange={e => setConfig({ ...config, global_settings: { ...config.global_settings, max_pending_per_user: Number(e.target.value) } })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={config.global_settings.auto_approve} onChange={e => setConfig({ ...config, global_settings: { ...config.global_settings, auto_approve: e.target.checked } })} className="w-4 h-4 accent-[#1e3a5f]" />
              <span className="text-sm text-slate-600">推荐自动通过（无需审核）</span>
            </label>
          </div>
        </div>
      </div>
      {config.types.map((type, idx) => (
        <div key={type.id} className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{type.name}</h3>
              <p className="text-sm text-slate-500">{type.description}</p>
            </div>
            <button onClick={() => {
              const newConfig = JSON.parse(JSON.stringify(config)) as ReferralConfig;
              newConfig.types[idx].enabled = !type.enabled;
              setConfig(newConfig);
            }} className={`px-3 py-1 text-xs rounded-full ${type.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {type.enabled ? '已启用' : '已停用'}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">允许发起推荐的角色</label>
            <div className="flex flex-wrap gap-2">
              {allRolesList.filter(r => r !== 'admin').map(role => {
                const checked = type.allowed_roles.includes(role);
                return (
                  <label key={role} className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${checked ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#1e3a5f]'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleRole(idx, role)} className="sr-only" />
                    {ALL_ROLE_LABELS[role] || role}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">奖励设置</label>
            <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">奖励类型</label>
                <select value={type.reward.type} onChange={e => {
                  const newConfig = JSON.parse(JSON.stringify(config)) as ReferralConfig;
                  newConfig.types[idx].reward.type = e.target.value as 'commission' | 'points' | 'both';
                  setConfig(newConfig);
                }} className="w-full px-3 py-1.5 border rounded-md text-sm">
                  <option value="commission">佣金</option>
                  <option value="points">积分</option>
                  <option value="both">佣金+积分</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">佣金比例(%)</label>
                <input type="number" value={type.reward.commission_percent} onChange={e => {
                  const newConfig = JSON.parse(JSON.stringify(config)) as ReferralConfig;
                  newConfig.types[idx].reward.commission_percent = Number(e.target.value);
                  setConfig(newConfig);
                }} className="w-full px-3 py-1.5 border rounded-md text-sm" min={0} max={100} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">积分奖励</label>
                <input type="number" value={type.reward.points} onChange={e => {
                  const newConfig = JSON.parse(JSON.stringify(config)) as ReferralConfig;
                  newConfig.types[idx].reward.points = Number(e.target.value);
                  setConfig(newConfig);
                }} className="w-full px-3 py-1.5 border rounded-md text-sm" min={0} />
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs text-slate-500 mb-1">触发条件</label>
              <select value={type.reward.trigger} onChange={e => {
                const newConfig = JSON.parse(JSON.stringify(config)) as ReferralConfig;
                newConfig.types[idx].reward.trigger = e.target.value as 'on_sign' | 'on_complete';
                setConfig(newConfig);
              }} className="w-full px-3 py-1.5 border rounded-md text-sm max-w-xs">
                <option value="on_sign">被推荐人签约即奖励</option>
                <option value="on_complete">被推荐人完单才奖励</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== 审核流程配置 ==================== */
function ReviewWorkflowSettings({ config, setConfig }: { config: ReviewWorkflowConfig; setConfig: (v: ReviewWorkflowConfig) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('review_workflow', config);
    setSaving(false);
    setSaved(ok);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleReviewer = (wfIdx: number, role: Role) => {
    const newConfig = JSON.parse(JSON.stringify(config)) as ReviewWorkflowConfig;
    const roles = newConfig.workflows[wfIdx].reviewer_roles;
    if (roles.includes(role)) {
      newConfig.workflows[wfIdx].reviewer_roles = roles.filter((r: Role) => r !== role);
    } else {
      newConfig.workflows[wfIdx].reviewer_roles = [...roles, role];
    }
    setConfig(newConfig);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
        </button>
      </div>
      {config.workflows.map((wf, idx) => (
        <div key={wf.id} className="bg-white rounded-lg border p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">{wf.name}</h3>
              <p className="text-sm text-slate-500">{wf.description}</p>
            </div>
            <button onClick={() => {
              const newConfig = JSON.parse(JSON.stringify(config)) as ReviewWorkflowConfig;
              newConfig.workflows[idx].enabled = !wf.enabled;
              setConfig(newConfig);
            }} className={`relative w-10 h-5 rounded-full transition-colors ${wf.enabled ? 'bg-green-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${wf.enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-2">审核人角色</label>
            <div className="flex flex-wrap gap-2">
              {(['admin', 'training_supervisor', 'worker_operator'] as Role[]).map(role => {
                const checked = wf.reviewer_roles.includes(role);
                return (
                  <label key={role} className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-colors ${checked ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-slate-600 border-slate-300 hover:border-[#1e3a5f]'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleReviewer(idx, role)} className="sr-only" />
                    {ALL_ROLE_LABELS[role] || role}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== 等级体系 ==================== */
function WorkerTiersSettings({ tiers, setTiers }: { tiers: WorkerTier[]; setTiers: (v: WorkerTier[]) => void }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['x-session'] = token;
      const results = await Promise.all(tiers.map(tier =>
        fetch('/api/worker-tiers', { method: 'PUT', headers, body: JSON.stringify(tier) }).then(r => r.json())
      ));
      const allOk = results.every((r: { ok?: boolean }) => r.ok);
      setSaving(false);
      setSaved(allOk);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaving(false);
    }
  };

  const updateField = (idx: number, field: keyof WorkerTier, value: number | string | boolean) => {
    setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  if (tiers.length === 0) {
    return (
      <div className="text-center text-slate-400 py-12">
        等级数据加载中...<br />
        <span className="text-xs">请确认已执行 migration_referral_v2_fix.sql</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#1e3a5f] text-white rounded-md text-sm hover:bg-[#163050] disabled:opacity-50">
          {saving ? '保存中...' : saved ? '已保存' : '保存等级配置'}
        </button>
      </div>
      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-3 font-medium text-slate-600">名称</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">等级</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">最低完单</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">最低评分</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">最低续单率</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">时薪加成(元)</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">优先派单</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">保证金减免(元)</th>
              <th className="text-center px-2 py-3 font-medium text-slate-600">徽章颜色</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tiers.map((tier, idx) => (
              <tr key={tier.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <input type="text" value={tier.name} onChange={e => updateField(idx, 'name', e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
                </td>
                <td className="text-center px-2 py-2 font-medium">{tier.level}</td>
                <td className="text-center px-2 py-2">
                  <input type="number" value={tier.min_orders} onChange={e => updateField(idx, 'min_orders', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-sm text-center" />
                </td>
                <td className="text-center px-2 py-2">
                  <input type="number" step="0.1" value={tier.min_rating} onChange={e => updateField(idx, 'min_rating', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-sm text-center" />
                </td>
                <td className="text-center px-2 py-2">
                  <input type="number" step="0.001" value={tier.min_reorder_rate} onChange={e => updateField(idx, 'min_reorder_rate', Number(e.target.value))} className="w-20 px-2 py-1 border rounded text-sm text-center" />
                </td>
                <td className="text-center px-2 py-2">
                  <input type="number" value={tier.hourly_premium} onChange={e => updateField(idx, 'hourly_premium', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-sm text-center" />
                </td>
                <td className="text-center px-2 py-2">
                  <input type="checkbox" checked={tier.priority} onChange={e => updateField(idx, 'priority', e.target.checked)} className="w-4 h-4 accent-[#1e3a5f]" />
                </td>
                <td className="text-center px-2 py-2">
                  <input type="number" value={tier.deposit_reduction} onChange={e => updateField(idx, 'deposit_reduction', Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-sm text-center" />
                </td>
                <td className="text-center px-2 py-2">
                  <div className="flex items-center gap-1 justify-center">
                    <input type="text" value={tier.badge_color} onChange={e => updateField(idx, 'badge_color', e.target.value)} className="w-20 px-2 py-1 border rounded text-sm" />
                    <span className="w-4 h-4 rounded-full inline-block border" style={{ backgroundColor: tier.badge_color }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

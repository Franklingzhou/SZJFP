'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlatformInfo, CommissionRule, PointRule, CreditRule, ModuleConfig, TextConfig } from '@/lib/types';
import { Loader2 } from 'lucide-react';

type TabKey = 'platform' | 'commission' | 'points' | 'modules' | 'texts' | 'page_access' | 'certificate' | 'reminder';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'platform', label: '基本设置' },
  { key: 'commission', label: '佣金配置' },
  { key: 'points', label: '积分规则' },
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
  const [certMode, setCertMode] = useState<'auto' | 'manual'>('auto');
  const [reminderSettings, setReminderSettings] = useState({
    lead_unfollowed_hours: 24,
    order_unmatched_hours: 48,
    worker_inactive_days: 30,
    contract_unsigned_hours: 72,
    enrollment_unscheduled_days: 7,
  });

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
      if (settingsMap.certificate_issuance) {
        const certSetting = settingsMap.certificate_issuance as Record<string, unknown>;
        if (certSetting.mode === 'manual' || certSetting.mode === 'auto') {
          setCertMode(certSetting.mode as 'auto' | 'manual');
        }
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
      {activeTab === 'points' && <PointsSettings pointRules={pointRules} setPointRules={setPointRules} creditRules={creditRules} setCreditRules={setCreditRules} />}
      {activeTab === 'modules' && <ModulesSettings modules={modules} setModules={setModules} />}
      {activeTab === 'texts' && <TextsSettings texts={texts} setTexts={setTexts} />}
      {activeTab === 'certificate' && <CertificateSettings certMode={certMode} setCertMode={setCertMode} />}
      {activeTab === 'reminder' && <ReminderSettings settings={reminderSettings} setSettings={setReminderSettings} />}
      {activeTab === 'page_access' && <PageAccessSettings pageAccess={pageAccess} setPageAccess={setPageAccess} />}
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
function PointsSettings({ pointRules, setPointRules, creditRules, setCreditRules }: {
  pointRules: PointRule[]; setPointRules: (v: PointRule[]) => void;
  creditRules: CreditRule[]; setCreditRules: (v: CreditRule[]) => void;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState<'points' | 'credit'>('points');

  const handleSave = async () => {
    setSaving(true);
    const [ok1, ok2] = await Promise.all([
      saveSetting('point_rules', pointRules),
      saveSetting('credit_rules', creditRules),
    ]);
    setSaving(false);
    setSaved(ok1 && ok2);
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

/* ==================== 证书设置 ==================== */
function CertificateSettings({ certMode, setCertMode }: {
  certMode: 'auto' | 'manual';
  setCertMode: (v: 'auto' | 'manual') => void;
}) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveSetting('certificate_issuance', { mode: certMode });
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
        <h2 className="text-lg font-semibold text-slate-800">证书颁发模式</h2>
        <p className="text-sm text-slate-500">
          设置学员课程考核通过（≥60分）后，证书是自动颁发还是由管理员手动颁发。
        </p>
        <div className="flex gap-6 mt-4">
          <label className={cn(
            'flex-1 border-2 rounded-lg p-5 cursor-pointer transition-all',
            certMode === 'auto'
              ? 'border-green-500 bg-green-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          )}>
            <input
              type="radio"
              name="certMode"
              value="auto"
              checked={certMode === 'auto'}
              onChange={() => setCertMode('auto')}
              className="sr-only"
            />
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                certMode === 'auto' ? 'border-green-500' : 'border-slate-300'
              )}>
                {certMode === 'auto' && <div className="w-3 h-3 rounded-full bg-green-500" />}
              </div>
              <h3 className={cn('font-semibold', certMode === 'auto' ? 'text-green-700' : 'text-slate-700')}>
                🚀 自动颁发
              </h3>
            </div>
            <p className="text-sm text-slate-500 ml-8">
              讲师打分 ≥60 分后，系统自动生成并颁发结业证书，同时发送通知给学员。
            </p>
          </label>

          <label className={cn(
            'flex-1 border-2 rounded-lg p-5 cursor-pointer transition-all',
            certMode === 'manual'
              ? 'border-blue-500 bg-blue-50 shadow-sm'
              : 'border-slate-200 hover:border-slate-300'
          )}>
            <input
              type="radio"
              name="certMode"
              value="manual"
              checked={certMode === 'manual'}
              onChange={() => setCertMode('manual')}
              className="sr-only"
            />
            <div className="flex items-center gap-3 mb-2">
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                certMode === 'manual' ? 'border-blue-500' : 'border-slate-300'
              )}>
                {certMode === 'manual' && <div className="w-3 h-3 rounded-full bg-blue-500" />}
              </div>
              <h3 className={cn('font-semibold', certMode === 'manual' ? 'text-blue-700' : 'text-slate-700')}>
                ✋ 手动确认
              </h3>
            </div>
            <p className="text-sm text-slate-500 ml-8">
              讲师打分后仅更新考核结果，管理员在「证书管理」页面手动审核并颁发证书。
            </p>
          </label>
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

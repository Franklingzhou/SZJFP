'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { moduleFields, FieldConfig } from '@/lib/data-permissions';
import { Loader2, Save, RotateCcw, Eye, Edit3, AlertCircle } from 'lucide-react';

// 角色列表
const roles = [
  { id: 'admin', name: '超级管理员' },
  { id: 'agent', name: '经纪人' },
  { id: 'recruiter', name: '招生代理' },
  { id: 'instructor', name: '培训讲师' },
  { id: 'worker_operator', name: '阿姨运营' },
  { id: 'training_supervisor', name: '培训主管' },
  { id: 'worker', name: '阿姨' },
  { id: 'customer', name: '客户' },
];

// 模块列表
const modules = [
  { id: 'workers', name: '阿姨简历库' },
  { id: 'orders', name: '订单管理' },
  { id: 'customers', name: '客户管理' },
  { id: 'leads', name: '线索管理' },
  { id: 'students', name: '学员管理' },
  { id: 'courses', name: '课程管理' },
  { id: 'contracts', name: '合同管理' },
  { id: 'recommendations', name: '推荐记录' },
  { id: 'reviews', name: '评价管理' },
];

interface FieldPermissionConfig {
  id?: string;
  role: string;
  module: string;
  visible_fields: string[] | null;
  editable_fields: string[] | null;
  enabled: boolean;
}

export default function FieldPermissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('agent');
  const [selectedModule, setSelectedModule] = useState<string>('workers');
  const [configs, setConfigs] = useState<Record<string, FieldPermissionConfig>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 当前模块的字段配置
  const currentFields = moduleFields[selectedModule] || [];

  // 加载配置
  useEffect(() => {
    loadConfigs();
  }, [selectedRole]);

  async function loadConfigs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/field-permissions?role=${selectedRole}`);
      const data = await res.json();
      
      if (data.success) {
        const configMap: Record<string, FieldPermissionConfig> = {};
        data.data.forEach((item: FieldPermissionConfig) => {
          configMap[item.module] = item;
        });
        setConfigs(configMap);
      }
    } catch (err) {
      console.error('Failed to load configs:', err);
    } finally {
      setLoading(false);
    }
  }

  // 获取当前模块的配置
  function getCurrentConfig(): FieldPermissionConfig {
    return configs[selectedModule] || {
      role: selectedRole,
      module: selectedModule,
      visible_fields: null,
      editable_fields: null,
      enabled: false,
    };
  }

  // 切换字段可见性
  function toggleField(fieldKey: string, type: 'visible' | 'editable') {
    const config = getCurrentConfig();
    
    if (type === 'visible') {
      const current = config.visible_fields || currentFields.map(f => f.key);
      const updated = current.includes(fieldKey)
        ? current.filter(f => f !== fieldKey)
        : [...current, fieldKey];
      
      // 如果从可见字段中移除，也要从可编辑中移除
      const newEditable = config.editable_fields?.filter(f => f !== fieldKey) || [];
      
      setConfigs(prev => ({
        ...prev,
        [selectedModule]: {
          ...config,
          visible_fields: updated,
          editable_fields: newEditable,
          enabled: true,
        },
      }));
    } else {
      const current = config.editable_fields || [];
      const updated = current.includes(fieldKey)
        ? current.filter(f => f !== fieldKey)
        : [...current, fieldKey];
      
      // 可编辑的必须是可见的
      const visibleFields = config.visible_fields || currentFields.map(f => f.key);
      if (!visibleFields.includes(fieldKey)) {
        setMessage({ type: 'error', text: '请先将字段设为可见' });
        setTimeout(() => setMessage(null), 2000);
        return;
      }
      
      setConfigs(prev => ({
        ...prev,
        [selectedModule]: {
          ...config,
          editable_fields: updated,
          enabled: true,
        },
      }));
    }
  }

  // 检查字段是否选中
  function isFieldSelected(fieldKey: string, type: 'visible' | 'editable'): boolean {
    const config = getCurrentConfig();
    
    if (type === 'visible') {
      const fields = config.visible_fields || currentFields.map(f => f.key);
      return fields.includes(fieldKey);
    } else {
      const fields = config.editable_fields || [];
      return fields.includes(fieldKey);
    }
  }

  // 全选/取消全选可见字段
  function toggleAllVisible(selected: boolean) {
    const config = getCurrentConfig();
    setConfigs(prev => ({
      ...prev,
      [selectedModule]: {
        ...config,
        visible_fields: selected ? currentFields.map(f => f.key) : [],
        editable_fields: selected ? [] : [],
        enabled: true,
      },
    }));
  }

  // 重置为默认
  function resetToDefault() {
    const config = getCurrentConfig();
    setConfigs(prev => ({
      ...prev,
      [selectedModule]: {
        ...config,
        visible_fields: null,
        editable_fields: null,
        enabled: false,
      },
    }));
    setMessage({ type: 'success', text: '已重置为默认配置' });
    setTimeout(() => setMessage(null), 2000);
  }

  // 保存配置
  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    
    try {
      const config = getCurrentConfig();
      const res = await fetch('/api/field-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: config.role,
          module: config.module,
          visible_fields: config.visible_fields,
          editable_fields: config.editable_fields,
          enabled: config.enabled,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: '保存成功' });
        loadConfigs();
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="text-slate-500 hover:text-slate-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-slate-800">字段级权限配置</h1>
          </div>
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            管理员专属
          </Badge>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {/* 提示信息 */}
        <div className="mb-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">字段级权限说明</p>
            <ul className="mt-1 space-y-1 text-blue-600">
              <li>• <strong>可见字段</strong>：控制角色在列表/详情页能看到哪些列</li>
              <li>• <strong>可编辑字段</strong>：控制角色在编辑/创建时能修改哪些字段（必须是可见字段的子集）</li>
              <li>• <strong>默认配置</strong>：关闭自定义时使用系统默认配置</li>
              <li>• <strong>管理员</strong>：始终拥有全部字段权限</li>
            </ul>
          </div>
        </div>

        {/* 选择器 */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2 min-w-[160px]">
                <label className="text-sm font-medium text-slate-700">选择角色</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 min-w-[160px]">
                <label className="text-sm font-medium text-slate-700">选择模块</label>
                <Select value={selectedModule} onValueChange={setSelectedModule}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modules.map(mod => (
                      <SelectItem key={mod.id} value={mod.id}>{mod.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                onClick={resetToDefault}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                重置默认
              </Button>

              <Button 
                onClick={saveConfig}
                disabled={saving}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存配置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 消息提示 */}
        {message && (
          <div className={cn(
            'mb-4 p-3 rounded-lg text-sm',
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          )}>
            {message.text}
          </div>
        )}

        {/* 字段配置表格 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{modules.find(m => m.id === selectedModule)?.name}</span>
              <Badge variant="secondary">{roles.find(r => r.id === selectedRole)?.name}</Badge>
            </CardTitle>
            <CardDescription>
              配置该角色在此模块下能看到的字段和可编辑的字段
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-600 w-12">
                        <Checkbox 
                          checked={isFieldSelected(currentFields[0]?.key, 'visible') || false}
                          onCheckedChange={toggleAllVisible}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 w-24">字段名</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600 w-24">标签</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600">
                        <div className="flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>可见</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-slate-600">
                        <div className="flex items-center justify-center gap-1">
                          <Edit3 className="h-4 w-4" />
                          <span>可编辑</span>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-slate-600">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentFields.map((field) => (
                      <tr key={field.key} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <Checkbox 
                            checked={isFieldSelected(field.key, 'visible')}
                            onCheckedChange={() => toggleField(field.key, 'visible')}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">{field.key}</code>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{field.label}</td>
                        <td className="py-3 px-4 text-center">
                          <Checkbox 
                            checked={isFieldSelected(field.key, 'visible')}
                            onCheckedChange={() => toggleField(field.key, 'visible')}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Checkbox 
                            checked={isFieldSelected(field.key, 'editable')}
                            onCheckedChange={() => toggleField(field.key, 'editable')}
                            disabled={!isFieldSelected(field.key, 'visible')}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {field.editable ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">可编辑</Badge>
                          ) : (
                            <span className="text-slate-400">只读</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 统计信息 */}
        <div className="mt-4 flex gap-4 text-sm text-slate-500">
          <span>可见字段：{isFieldSelected(currentFields[0]?.key, 'visible') ? currentFields.length : (getCurrentConfig().visible_fields?.length || 0)} / {currentFields.length}</span>
          <span>可编辑字段：{getCurrentConfig().editable_fields?.length || 0}</span>
          <span>配置状态：{getCurrentConfig().enabled ? '已启用自定义' : '使用默认配置'}</span>
        </div>
      </main>
    </div>
  );
}

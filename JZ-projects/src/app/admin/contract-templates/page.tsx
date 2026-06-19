'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// 类型中文名映射
const TYPE_LABELS: Record<string, string> = {
  training: '培训合同',
  employment: '劳动合同',
  service: '服务合同',
};

const TYPE_COLORS: Record<string, string> = {
  training: 'bg-blue-100 text-blue-800',
  employment: 'bg-green-100 text-green-800',
  service: 'bg-purple-100 text-purple-800',
};

interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

interface TemplateFormData {
  name: string;
  type: string;
  content: string;
  description: string;
  sort_order: number;
}

export default function ContractTemplatesPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    type: 'training',
    content: '',
    description: '',
    sort_order: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = filterType !== 'all' ? `?type=${filterType}` : '';
      const res = await fetch(`/api/contract-templates${params}`, { headers });
      const result = await res.json();
      if (result.data) {
        setTemplates(result.data);
      } else {
        setTemplates([]);
      }
    } catch (err) {
      console.error('加载模板失败:', err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setEditingTemplate(null);
    setFormData({ name: '', type: 'training', content: '', description: '', sort_order: 0 });
    setDialogOpen(true);
  }

  function openEditDialog(template: ContractTemplate) {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
      description: template.description || '',
      sort_order: template.sort_order,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.type || !formData.content) {
      alert('请填写名称、类型和内容');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const isEdit = !!editingTemplate;
      const url = '/api/contract-templates';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit
        ? JSON.stringify({ id: editingTemplate.id, ...formData })
        : JSON.stringify(formData);

      const res = await fetch(url, { method, headers, body });
      const result = await res.json();

      if (!result.success) {
        alert((isEdit ? '更新' : '创建') + '失败：' + (result.error || '请重试'));
        return;
      }

      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('确定停用此模板？')) return;

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/contract-templates', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ id }),
      });
      const result = await res.json();

      if (!result.success) {
        alert('停用失败：' + (result.error || '请重试'));
        return;
      }

      loadData();
    } catch (err) {
      console.error('停用失败:', err);
      alert('停用失败，请重试');
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">加载中...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">合同模板管理</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" /> 新建模板
        </Button>
      </div>

      {/* 类型筛选 */}
      <div className="flex items-center gap-4">
        <Label>类型筛选:</Label>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="training">培训合同</SelectItem>
            <SelectItem value="employment">劳动合同</SelectItem>
            <SelectItem value="service">服务合同</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadData}>刷新</Button>
      </div>

      {/* 模板列表 */}
      {templates.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">暂无模板</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(template => (
            <Card key={template.id} className={cn(!template.is_active && 'opacity-60')}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{template.name}</h3>
                    <Badge className={cn('text-xs mt-1', TYPE_COLORS[template.type] || 'bg-slate-100 text-slate-800')}>
                      {TYPE_LABELS[template.type] || template.type}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(template)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {template.is_active && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeactivate(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                )}
                <div className="text-xs text-muted-foreground">
                  <span>排序: {template.sort_order}</span>
                  <span className="ml-2">状态: {template.is_active ? '启用' : '停用'}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                  {template.content.slice(0, 100)}...
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 新建/编辑Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑模板' : '新建模板'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>模板名称 *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：标准培训合同"
              />
            </div>
            <div>
              <Label>合同类型 *</Label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">培训合同</SelectItem>
                  <SelectItem value="employment">劳动合同</SelectItem>
                  <SelectItem value="service">服务合同</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>模板描述</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="简要描述模板用途"
              />
            </div>
            <div>
              <Label>排序号</Label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>模板内容 *</Label>
              <Textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder="输入合同模板正文..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

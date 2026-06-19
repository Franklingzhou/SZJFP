'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getVisibleFields, getEditableFields, isFieldEditable, moduleFields, FieldConfig } from '@/lib/data-permissions';

// 表格列定义
export interface Column<T = Record<string, unknown>> {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
  width?: string | number;
}

// 权限表格Props
export interface PermissionTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T[];
  module: string;
  columns: Column<T>[];
  currentRole: string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  className?: string;
  loading?: boolean;
}

export function PermissionTable<T extends Record<string, unknown>>({
  data,
  module,
  columns,
  currentRole,
  onRowClick,
  emptyText = '暂无数据',
  className,
  loading,
}: PermissionTableProps<T>) {
  // 根据权限过滤列
  const visibleColumns = useMemo(() => {
    if (currentRole === 'admin') {
      return columns;
    }
    const visibleFields = getVisibleFields(currentRole, module);
    return columns.filter(col => visibleFields.includes(col.key));
  }, [columns, currentRole, module]);

  // 过滤数据
  const filteredData = useMemo(() => {
    return data;
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'text-left py-3 px-4 font-medium text-slate-600 text-sm',
                  col.className
                )}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => (
            <tr
              key={index}
              className={cn(
                'border-b border-slate-100 hover:bg-slate-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  className={cn('py-3 px-4 text-sm text-slate-700', col.className)}
                >
                  {col.render
                    ? col.render(row[col.key as keyof T], row)
                    : formatCellValue(row[col.key as keyof T])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 权限表单组件 - 根据字段权限控制表单字段
export interface PermissionFormField {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface PermissionFormProps {
  fields: PermissionFormField[];
  module: string;
  currentRole: string;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  errors?: Record<string, string>;
  className?: string;
}

export function PermissionForm({
  fields,
  module,
  currentRole,
  values,
  onChange,
  errors,
  className,
}: PermissionFormProps) {
  // 根据权限过滤字段
  const visibleFields = useMemo(() => {
    if (currentRole === 'admin') {
      return fields;
    }
    const editableFields = getEditableFields(currentRole, module);
    return fields.filter(field => editableFields.includes(field.key));
  }, [fields, currentRole, module]);

  if (visibleFields.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        您没有权限编辑此表单
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {visibleFields.map((field) => (
        <div key={field.key} className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'textarea' ? (
            <textarea
              value={(values[field.key] as string) || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500',
                errors?.[field.key] ? 'border-red-500' : 'border-slate-300'
              )}
            />
          ) : field.type === 'select' ? (
            <select
              value={(values[field.key] as string) || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500',
                errors?.[field.key] ? 'border-red-500' : 'border-slate-300'
              )}
            >
              <option value="">{field.placeholder || '请选择'}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type || 'text'}
              value={(values[field.key] as string | number) || ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500',
                errors?.[field.key] ? 'border-red-500' : 'border-slate-300'
              )}
            />
          )}
          
          {errors?.[field.key] && (
            <p className="text-sm text-red-500">{errors[field.key]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// 权限详情组件 - 只显示可见字段
export interface DetailItem {
  key: string;
  label: string;
  render?: (value: unknown) => React.ReactNode;
}

export interface PermissionDetailProps {
  items: DetailItem[];
  data: Record<string, unknown>;
  module: string;
  currentRole: string;
  className?: string;
}

export function PermissionDetail({
  items,
  data,
  module,
  currentRole,
  className,
}: PermissionDetailProps) {
  // 根据权限过滤字段
  const visibleItems = useMemo(() => {
    if (currentRole === 'admin') {
      return items;
    }
    const visibleFields = getVisibleFields(currentRole, module);
    return items.filter(item => visibleFields.includes(item.key));
  }, [items, currentRole, module]);

  return (
    <div className={cn('space-y-3', className)}>
      {visibleItems.map((item) => (
        <div key={item.key} className="flex items-start gap-4">
          <span className="text-sm font-medium text-slate-500 w-24 flex-shrink-0">
            {item.label}
          </span>
          <span className="text-sm text-slate-700">
            {item.render
              ? item.render(data[item.key])
              : formatCellValue(data[item.key])}
          </span>
        </div>
      ))}
    </div>
  );
}

// 辅助函数：格式化单元格值
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (Array.isArray(value)) return value.join('、') || '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// 导出字段配置（用于配置页面）
export function getModuleFieldConfig(module: string): FieldConfig[] {
  return moduleFields[module] || [];
}

// 检查角色是否可以编辑某字段
export function canEditField(role: string, module: string, field: string): boolean {
  return isFieldEditable(role, module, field);
}

// 获取角色可见字段列表
export function getRoleVisibleFields(role: string, module: string): string[] {
  return getVisibleFields(role, module);
}

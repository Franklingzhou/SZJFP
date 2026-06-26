'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface OperationLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  resource: string;
  resource_id: string | null;
  detail: string | null;
  ip: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员', agent: '经纪人', worker: '阿姨',
  customer: '客户', instructor: '讲师', recruiter: '招生',
  training_supervisor: '培训主管', worker_operator: '阿姨运营',
};

const ACTION_LABELS: Record<string, string> = {
  create: '创建', update: '更新', delete: '删除',
  approve: '审核通过', reject: '审核拒绝',
  login: '登录', logout: '登出',
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchAction, setSearchAction] = useState('');
  const [searchResource, setSearchResource] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => { loadLogs(); }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('offset', String(page * pageSize));
      if (searchAction) params.set('action', searchAction);
      if (searchResource) params.set('resource', searchResource);
      const res = await fetch(`/api/operation-logs?${params}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.ok || json.data) {
        setLogs(json.data || []);
        setTotal(json.total || 0);
      }
    } catch (e) {
      console.error('[logs] load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadLogs();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">操作日志</h1>
        <p className="text-sm text-muted-foreground mt-1">查看平台所有用户的操作记录</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索操作类型 (create/update/delete/approve...)"
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="搜索资源 (workers/orders/leads...)"
                value={searchResource}
                onChange={(e) => setSearchResource(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button variant="outline" onClick={handleSearch} className="gap-1">
              <Search className="h-4 w-4" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            日志记录 ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">暂无操作日志</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600">时间</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">操作人</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">角色</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">操作</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">资源</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">详情</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {log.created_at?.slice(0, 19)?.replace('T', ' ') || '--'}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.user_name || '--'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {ROLE_LABELS[log.user_role] || log.user_role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            log.action === 'delete' ? 'bg-red-100 text-red-700' :
                            log.action === 'create' ? 'bg-green-100 text-green-700' :
                            log.action === 'approve' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'reject' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.resource}
                        {log.resource_id && (
                          <span className="text-xs text-slate-400 ml-1">
                            ({log.resource_id.substring(0, 8)}...)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                        {log.detail || '--'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{log.ip || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-slate-500">
                共 {total} 条，第 {page + 1}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(Math.max(0, page - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

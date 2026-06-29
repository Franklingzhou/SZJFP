'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Award, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Certificate {
  id?: string;
  name: string;
  authority?: string;
  issue_date?: string;
  expiry_date?: string;
  image_url?: string;
  status: string;
}

interface WorkerCert {
  worker_id: string;
  worker_name: string;
  certificate: Certificate;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: '已通过', color: 'bg-green-100 text-green-800 border-green-200' },
  pending: { label: '待审核', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-800 border-red-200' },
};

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<WorkerCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workers', { headers: getAuthHeaders() });
      const result = await res.json();
      const workers = result.data || [];

      const allCerts: WorkerCert[] = [];
      for (const w of workers) {
        const wCerts: Certificate[] = Array.isArray(w.certificates) ? w.certificates : [];
        for (const c of wCerts) {
          allCerts.push({
            worker_id: w.id,
            worker_name: w.name || w.id,
            certificate: c,
          });
        }
      }
      // 按状态排序：pending优先
      allCerts.sort((a, b) => {
        if (a.certificate.status === 'pending' && b.certificate.status !== 'pending') return -1;
        if (a.certificate.status !== 'pending' && b.certificate.status === 'pending') return 1;
        return 0;
      });
      setCerts(allCerts);
    } catch (err) {
      console.error('[certificates] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCertificates(); }, [loadCertificates]);

  const handleApprove = async (workerId: string, certIdx: number) => {
    try {
      // 更新 workers.certificates 中指定证书的状态
      const wRes = await fetch(`/api/workers/${workerId}`, { headers: getAuthHeaders() });
      const wData = await wRes.json();
      const worker = wData.data || {};
      const workerCerts: Certificate[] = Array.isArray(worker.certificates) ? [...worker.certificates] : [];
      if (workerCerts[certIdx]) {
        workerCerts[certIdx] = { ...workerCerts[certIdx], status: 'approved' };
      }
      const updateRes = await fetch('/api/workers', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: workerId, certificates: workerCerts }),
      });
      if (updateRes.ok) {
        setMessage('证书已审核通过');
        loadCertificates();
      } else {
        const err = await updateRes.json();
        setMessage(err.error || '操作失败');
      }
    } catch {
      setMessage('网络错误');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReject = async (workerId: string, certIdx: number) => {
    try {
      const wRes = await fetch(`/api/workers/${workerId}`, { headers: getAuthHeaders() });
      const wData = await wRes.json();
      const worker = wData.data || {};
      const workerCerts: Certificate[] = Array.isArray(worker.certificates) ? [...worker.certificates] : [];
      if (workerCerts[certIdx]) {
        workerCerts[certIdx] = { ...workerCerts[certIdx], status: 'rejected' };
      }
      const updateRes = await fetch('/api/workers', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: workerId, certificates: workerCerts }),
      });
      if (updateRes.ok) {
        setMessage('证书已拒绝');
        loadCertificates();
      } else {
        const err = await updateRes.json();
        setMessage(err.error || '操作失败');
      }
    } catch {
      setMessage('网络错误');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const filtered = certs.filter(c => {
    const matchStatus = statusFilter === 'all' || c.certificate.status === statusFilter;
    const matchSearch = !searchQuery ||
      c.worker_name.includes(searchQuery) ||
      c.certificate.name.includes(searchQuery) ||
      (c.certificate.authority || '').includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const tabs = [
    { key: 'all', label: '全部', count: certs.length },
    { key: 'pending', label: '待审核', count: certs.filter(c => c.certificate.status === 'pending').length },
    { key: 'approved', label: '已通过', count: certs.filter(c => c.certificate.status === 'approved').length },
    { key: 'rejected', label: '已拒绝', count: certs.filter(c => c.certificate.status === 'rejected').length },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">证书管理</h1>
        <p className="text-sm text-slate-500 mt-1">
          证书已纳入简历范畴，内部人员和阿姨均可上传。管理员审核通过后生效。
        </p>
      </div>

      {message && (
        <div className={cn('p-3 rounded-lg text-sm', message.includes('通过') || message.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors',
              statusFilter === tab.key
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="搜索阿姨名/证书名/颁发机构..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">暂无证书记录</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item, i) => (
            <Card key={`${item.worker_id}-${i}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Award className="w-5 h-5 text-amber-500" />
                      <h3 className="font-semibold text-slate-800">{item.certificate.name}</h3>
                      <Badge className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_CONFIG[item.certificate.status]?.color || 'bg-slate-100')}>
                        {STATUS_CONFIG[item.certificate.status]?.label || item.certificate.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">持证人</div>
                        <div className="text-sm text-slate-600">{item.worker_name}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">颁发机构</div>
                        <div className="text-sm text-slate-600">{item.certificate.authority || '未填写'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">颁发日期</div>
                        <div className="text-sm text-slate-600">{item.certificate.issue_date || '未填写'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-0.5">到期日期</div>
                        <div className="text-sm text-slate-600">{item.certificate.expiry_date || '长期有效'}</div>
                      </div>
                    </div>
                    {item.certificate.image_url && (
                      <img src={item.certificate.image_url} alt={item.certificate.name} className="w-16 h-16 rounded-lg object-cover mt-2" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {item.certificate.status === 'pending' && (
                      <>
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => handleApprove(item.worker_id, i)}>
                          <CheckCircle className="w-4 h-4 mr-1" /> 通过
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 border-red-200"
                          onClick={() => handleReject(item.worker_id, i)}>
                          <XCircle className="w-4 h-4 mr-1" /> 拒绝
                        </Button>
                      </>
                    )}
                    <a href={`/resume/${item.worker_id}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

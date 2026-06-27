'use client';

import React, { useState, useEffect } from 'react';
import { UserCircle, Phone, MapPin } from 'lucide-react';

export default function WorkerCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
    if (token) headers['x-session'] = token;
    return headers;
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch('/api/customers', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.data) {
        setCustomers(Array.isArray(result.data) ? result.data : []);
      } else {
        setCustomers([]);
      }
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">我的客户</h1>

      {loading ? (
        <div className="text-center py-10 text-slate-400">加载中...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-10">
          <UserCircle className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">暂无服务过的客户</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map(customer => (
            <div key={customer.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <UserCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-800 text-sm">{customer.name || '未命名'}</h3>
                  {customer.phone && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                      <Phone className="h-3 w-3" /> {customer.phone}
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" /> {customer.address}
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  customer.status === 'active' ? 'bg-green-100 text-green-700' :
                  customer.status === 'closed' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {customer.status === 'active' ? '活跃' :
                   customer.status === 'closed' ? '已流失' : customer.status || '未知'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

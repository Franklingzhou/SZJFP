'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, MapPin, User } from 'lucide-react';

export default function WorkerOnboardConfirmPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders(); }, []);

  function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
    if (token) headers['x-session'] = token;
    return headers;
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch('/api/orders?status=confirmed', { headers: getAuthHeaders() });
      const result = await res.json();
      setOrders(result.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(orderId: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: 'in_progress', onboard_at: new Date().toISOString() }),
      });
      const result = await res.json();
      if (result.success || result.ok) {
        alert('上户确认成功！');
        loadOrders();
      } else {
        alert(result.error || '确认失败');
      }
    } catch {
      alert('网络错误');
    }
  }

  return (
    <div className="pb-20 px-4 pt-4">
      <h1 className="text-lg font-semibold text-slate-800 mb-4">上户确认</h1>

      {loading ? (
        <div className="text-center py-10 text-slate-400">加载中...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10">
          <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">暂无待确认上户的订单</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800 text-sm">{order.title || '订单'}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" />{order.location || '-'}
                    <Clock className="h-3 w-3" />{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                  </div>
                </div>
                <button
                  onClick={() => handleConfirm(order.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs rounded-full hover:bg-green-600"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> 确认上户
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

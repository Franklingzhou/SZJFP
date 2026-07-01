'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, MapPin, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Booking { date: string; time: string; course: string; }
interface Venue { id: string; name: string; capacity: number; location: string; status: string; bookings: Booking[]; }

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [showBooking, setShowBooking] = useState<string | null>(null);
  const [newVenue, setNewVenue] = useState({ name: '', capacity: 20, location: '' });
  const [newBooking, setNewBooking] = useState({ date: '', time: '', course: '' });
  const [submitting, setSubmitting] = useState(false);

  // 从 API 加载场地列表
  const loadVenues = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/venues', { headers: getAuthHeaders() });
      const result = await res.json();
      if (result.data) {
        setVenues(result.data.map((v: Record<string, unknown>) => ({
          id: v.id as string,
          name: (v.name as string) || '',
          capacity: (v.capacity as number) || 0,
          location: (v.address as string) || (v.location as string) || '',
          status: (v.status as string) || 'available',
          bookings: (v.bookings as Booking[]) || [],
        })));
      }
    } catch (err) {
      console.error('[venues] load error:', err);
      setActionMsg('加载场地数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVenues(); }, []);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleAddVenue = async () => {
    if (!newVenue.name || !newVenue.location) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: newVenue.name,
          address: newVenue.location,
          capacity: newVenue.capacity,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setNewVenue({ name: '', capacity: 20, location: '' });
        setShowAddVenue(false);
        showMsg('场地创建成功');
        loadVenues();
      } else {
        showMsg(result.error || '创建失败');
      }
    } catch {
      showMsg('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBooking = async (venueId: string) => {
    if (!newBooking.date || !newBooking.time || !newBooking.course) return;
    const targetVenue = venues.find(v => v.id === venueId);
    if (!targetVenue) return;
    const updatedBookings = [...targetVenue.bookings, { ...newBooking }];
    // 先本地乐观更新
    setVenues(prev => prev.map(v => v.id === venueId ? { ...v, bookings: updatedBookings } : v));
    setNewBooking({ date: '', time: '', course: '' });
    setShowBooking(null);
    // 持久化到数据库
    try {
      const res = await fetch('/api/venues', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: venueId, bookings: updatedBookings }),
      });
      const result = await res.json();
      if (result.success) {
        showMsg('预约已保存');
      } else {
        showMsg(result.error || '预约保存失败');
        loadVenues(); // 回滚到服务端数据
      }
    } catch {
      showMsg('网络错误，预约未持久化');
      loadVenues();
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!confirm('确定删除该场地？此操作不可撤销。')) return;
    try {
      const res = await fetch(`/api/venues?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const result = await res.json();
      if (result.success) {
        showMsg('场地已删除');
        loadVenues();
      } else {
        showMsg(result.error || '删除失败');
      }
    } catch {
      showMsg('删除请求失败');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">场地管理</h1>
          <p className="text-sm text-muted-foreground mt-1">培训场地预约与使用情况管理</p>
        </div>
        <Button className="gap-1" onClick={() => setShowAddVenue(true)} disabled={submitting}>
          <Plus className="h-4 w-4" /> 添加场地
        </Button>
      </div>

      {/* 操作提示 */}
      {actionMsg && (
        <div className={`p-3 rounded-lg text-sm ${actionMsg.includes('成功') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {actionMsg}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="text-center py-12 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          加载中...
        </div>
      )}

      {!loading && venues.length === 0 && (
        <div className="text-center py-12 text-slate-400">暂无场地数据，点击「添加场地」创建</div>
      )}

      {showAddVenue && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">添加新场地</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddVenue(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-500">场地名称</label>
                <input className="w-full mt-1 px-3 py-1.5 border rounded-md text-sm" value={newVenue.name} onChange={e => setNewVenue(p => ({ ...p, name: e.target.value }))} placeholder="如：总部培训室C" />
              </div>
              <div>
                <label className="text-xs text-slate-500">容量(人)</label>
                <input className="w-full mt-1 px-3 py-1.5 border rounded-md text-sm" type="number" value={newVenue.capacity} onChange={e => setNewVenue(p => ({ ...p, capacity: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500">位置</label>
                <input className="w-full mt-1 px-3 py-1.5 border rounded-md text-sm" value={newVenue.location} onChange={e => setNewVenue(p => ({ ...p, location: e.target.value }))} placeholder="如：总部3楼" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={handleAddVenue} disabled={submitting}>{submitting ? '保存中...' : '保存'}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddVenue(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {venues.map((venue) => (
          <Card key={venue.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">{venue.name}</span>
                    <Badge className={venue.status === 'available' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                      {venue.status === 'available' ? '空闲' : '使用中'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex gap-6 text-sm">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />{venue.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-muted-foreground" />容量 {venue.capacity}人</span>
                  </div>
                  
                  {showBooking === venue.id && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg space-y-3">
                      <h4 className="text-sm font-medium">添加预约</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <input className="px-3 py-1.5 border rounded-md text-sm" type="date" value={newBooking.date} onChange={e => setNewBooking(p => ({ ...p, date: e.target.value }))} />
                        <input className="px-3 py-1.5 border rounded-md text-sm" value={newBooking.time} onChange={e => setNewBooking(p => ({ ...p, time: e.target.value }))} placeholder="09:00-12:00" />
                        <input className="px-3 py-1.5 border rounded-md text-sm" value={newBooking.course} onChange={e => setNewBooking(p => ({ ...p, course: e.target.value }))} placeholder="课程名称" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAddBooking(venue.id)}>确认预约</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowBooking(null)}>取消</Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-slate-500 mb-2">预约记录</h4>
                    <div className="space-y-2">
                      {venue.bookings.map((booking, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{booking.date}</span>
                          <span className="text-muted-foreground">{booking.time}</span>
                          <span className="font-medium text-amber-600">{booking.course}</span>
                        </div>
                      ))}
                      {venue.bookings.length === 0 && <p className="text-sm text-muted-foreground">暂无预约</p>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setShowBooking(showBooking === venue.id ? null : venue.id)}>预约</Button>
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteVenue(venue.id)}>删除</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

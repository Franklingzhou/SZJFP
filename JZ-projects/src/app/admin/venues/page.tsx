'use client';

import React, { useState } from 'react';
import { Plus, Calendar, Clock, MapPin, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Booking { date: string; time: string; course: string; }
interface Venue { id: string; name: string; capacity: number; location: string; status: string; bookings: Booking[]; }

const initialVenues: Venue[] = [
  { id: 'v001', name: '总部培训室A', capacity: 25, location: '总部3楼', status: 'available', bookings: [
    { date: '2026-06-01', time: '09:00-12:00', course: '高级月嫂技能提升班' },
    { date: '2026-06-15', time: '14:00-17:00', course: '家政服务员基础班' },
  ]},
  { id: 'v002', name: '总部培训室B', capacity: 20, location: '总部3楼', status: 'occupied', bookings: [
    { date: '2026-05-15', time: '09:00-17:00', course: '新手月嫂入门班' },
  ]},
  { id: 'v003', name: '分部培训室', capacity: 20, location: '分部2楼', status: 'available', bookings: [
    { date: '2026-06-10', time: '09:00-12:00', course: '养老护理专业培训' },
  ]},
];

export default function VenuesPage() {
  const [venues, setVenues] = useState(initialVenues);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const [showBooking, setShowBooking] = useState<string | null>(null);
  const [newVenue, setNewVenue] = useState({ name: '', capacity: 20, location: '' });
  const [newBooking, setNewBooking] = useState({ date: '', time: '', course: '' });

  const handleAddVenue = () => {
    if (!newVenue.name || !newVenue.location) return;
    setVenues(prev => [...prev, { id: `v${Date.now()}`, ...newVenue, status: 'available', bookings: [] }]);
    setNewVenue({ name: '', capacity: 20, location: '' });
    setShowAddVenue(false);
  };

  const handleAddBooking = (venueId: string) => {
    if (!newBooking.date || !newBooking.time || !newBooking.course) return;
    setVenues(prev => prev.map(v => v.id === venueId ? { ...v, bookings: [...v.bookings, newBooking] } : v));
    setNewBooking({ date: '', time: '', course: '' });
    setShowBooking(null);
  };

  const handleDeleteVenue = (id: string) => {
    setVenues(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">场地管理</h1>
          <p className="text-sm text-muted-foreground mt-1">培训场地预约与使用情况管理</p>
        </div>
        <Button className="gap-1" onClick={() => setShowAddVenue(true)}>
          <Plus className="h-4 w-4" /> 添加场地
        </Button>
      </div>

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
              <Button size="sm" onClick={handleAddVenue}>保存</Button>
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

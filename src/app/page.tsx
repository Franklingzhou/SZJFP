'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Monitor,
  Users,
  Briefcase,
  GraduationCap,
  BookOpen,
  Heart,
  Shield,
  ArrowRight,
  Smartphone,
  ClipboardCheck,
} from 'lucide-react';

// 所有角色（展示用，不再区分直登/需注册）
const roleEntries = [
  { role: 'customer', icon: Heart, label: '客户端', color: 'bg-pink-600', phone: '13900009876' },
  { role: 'worker', icon: Users, label: '阿姨端', color: 'bg-amber-500', phone: '13800005678' },
  { role: 'agent', icon: Briefcase, label: '经纪人端', color: 'bg-blue-600', phone: '13600001234' },
  { role: 'recruiter', icon: GraduationCap, label: '招生端', color: 'bg-green-600', phone: '13500003456' },
  { role: 'instructor', icon: BookOpen, label: '讲师端', color: 'bg-purple-600', phone: '13700007890' },
  { role: 'training_supervisor', icon: ClipboardCheck, label: '培训主管端', color: 'bg-teal-600', phone: '13100001111' },
  { role: 'worker_operator', icon: Users, label: '阿姨运营端', color: 'bg-orange-600', phone: '13200002222' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
          <Shield className="h-4 w-4" />
          多角色协作 · 诚信保障 · 专业培训
        </div>
        <h1 className="text-5xl font-bold mb-4">家政共创平台</h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
          连接阿姨、经纪人、招生、讲师、客户的完整家政服务生态
        </p>

        {/* 统一登录入口 */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Link
            href="/m/login"
            className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-amber-500/25"
          >
            <Smartphone className="h-6 w-6" />
            手机号登录
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-6 py-4 rounded-2xl font-semibold transition-all border border-white/20 hover:scale-105"
          >
            <Monitor className="h-5 w-5" />
            管理员后台
          </Link>
        </div>

        {/* 角色展示 */}
        <div className="max-w-2xl mx-auto">
          <p className="text-sm text-slate-500 mb-4">登录后自动进入对应角色页面</p>
          <div className="grid grid-cols-7 gap-2">
            {roleEntries.map((r) => (
              <div key={r.role} className="bg-white/5 rounded-xl p-3 text-center">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mx-auto mb-2 text-white', r.color)}>
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="text-xs text-slate-300">{r.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Test Accounts */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-center text-slate-300">测试账号一览（验证码 888888）</h3>
          <div className="grid grid-cols-8 gap-3 text-center">
            {roleEntries.map((r) => (
              <div key={r.role} className="bg-white/5 rounded-xl p-3">
                <div className={cn('inline-flex h-8 w-8 rounded-lg items-center justify-center text-white mb-2', r.color)}>
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="font-medium text-white text-xs">{r.label}</div>
                <div className="text-slate-400 text-[11px] mt-1">{r.phone}</div>
              </div>
            ))}
            <div className="bg-white/5 rounded-xl p-3">
              <div className="inline-flex h-8 w-8 rounded-lg items-center justify-center text-white mb-2 bg-slate-600">
                <Shield className="h-4 w-4" />
              </div>
              <div className="font-medium text-white text-xs">管理员</div>
              <div className="text-slate-400 text-[11px] mt-1">13000000001</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        家政共创平台 MVP v3 · 统一登录
      </div>
    </div>
  );
}

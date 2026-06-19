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

const roleEntries = [
  { role: 'worker', icon: Users, label: '阿姨端', desc: '接单·订单·评价', color: 'bg-amber-500', lightColor: 'bg-amber-50 border-amber-200 text-amber-700', phone: '13800005678' },
  { role: 'agent', icon: Briefcase, label: '经纪人端', desc: '发单·匹配·客户', color: 'bg-blue-600', lightColor: 'bg-blue-50 border-blue-200 text-blue-700', phone: '13600001234' },
  { role: 'recruiter', icon: GraduationCap, label: '招生端', desc: '录入·推荐·转化', color: 'bg-green-600', lightColor: 'bg-green-50 border-green-200 text-green-700', phone: '13500003456' },
  { role: 'instructor', icon: BookOpen, label: '讲师端', desc: '课程·学员·点评', color: 'bg-purple-600', lightColor: 'bg-purple-50 border-purple-200 text-purple-700', phone: '13700007890' },
  { role: 'training_supervisor', icon: ClipboardCheck, label: '培训主管端', desc: '审批·分配·管理', color: 'bg-teal-600', lightColor: 'bg-teal-50 border-teal-200 text-teal-700', phone: '13100001111' },
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

        {/* Quick Role Login */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Smartphone className="h-5 w-5 text-amber-400" />
            <span className="text-lg font-semibold">选择角色快速体验</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {roleEntries.map((r) => (
              <Link
                key={r.role}
                href={`/m/login?role=${r.role}`}
                className="bg-white/10 border border-white/10 rounded-2xl p-4 text-center hover:bg-white/20 transition-all hover:scale-105 group"
              >
                <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3 text-white', r.color)}>
                  <r.icon className="h-6 w-6" />
                </div>
                <div className="font-semibold text-sm">{r.label}</div>
                <div className="text-xs text-slate-400 mt-1">{r.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
          >
            <Monitor className="h-5 w-5" />
            管理员后台
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/m/login"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all border border-white/20 hover:scale-105"
          >
            <Smartphone className="h-5 w-5" />
            小程序登录页
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Test Accounts */}
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-center text-slate-300">测试账号一览</h3>
          <div className="grid grid-cols-7 gap-3 text-center text-sm">
            {roleEntries.map((r) => (
              <div key={r.role} className="bg-white/5 rounded-xl p-3">
                <div className={cn('inline-flex h-8 w-8 rounded-lg items-center justify-center text-white mb-2', r.color)}>
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="font-medium text-white">{r.label}</div>
                <div className="text-slate-400 text-xs mt-1">{r.phone}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        家政共创平台 MVP v2 · 后续将上传微信云开发
      </div>
    </div>
  );
}

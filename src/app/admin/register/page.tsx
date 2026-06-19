'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserPlus, Smartphone, Lock, User, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const roles = [
  { id: 'agent', name: '经纪人', description: '连接客户和阿姨，发单匹配' },
  { id: 'recruiter', name: '招生代理', description: '招聘学员和阿姨，线索转化' },
  { id: 'instructor', name: '培训讲师', description: '培训阿姨，管理课程和学员' },
  { id: 'worker_operator', name: '阿姨运营', description: '管理阿姨档案，线索录入' },
  { id: 'training_supervisor', name: '培训主管', description: '审批合同/课程，全量查看' },
  { id: 'worker', name: '阿姨', description: '在订单大厅投递/自荐，管理简历' },
  { id: 'customer', name: '客户', description: '浏览简历，下单，评价' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'role' | 'info'>('phone');
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('123456');

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'register' }),
      });
      const data = await res.json() as { success?: boolean; error?: string; _devCode?: string };
      if (data.success) {
        setCountdown(60);
        if (data._devCode) {
          setError(`验证码已发送（开发模式：${data._devCode}）`);
        }
      } else {
        setError(data.error || '发送失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSending(false);
    }
  };

  // 验证手机号
  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!smsCode || smsCode.length < 4) {
      setError('请输入验证码');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 检查手机号是否已注册
      const res = await fetch(`/api/users?phone=${phone}`);
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        setError('该手机号已注册，请直接登录');
        return;
      }
      setStep('role');
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 选择角色
  const handleSelectRole = () => {
    if (!selectedRole) {
      setError('请选择角色');
      return;
    }
    setError('');
    setStep('info');
  };

  // 完成注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('请输入姓名');
      return;
    }
    if (!password || password.length < 4) {
      setError('密码至少4位');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, role: selectedRole, name }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.success) {
        alert('注册成功！请使用手机号和密码登录');
        router.push('/admin/login');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">家政云创空间</h1>
          <p className="text-white/60 text-sm mt-1">新用户注册</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          {/* 步骤指示器 */}
          <div className="flex justify-center gap-2 mb-6">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step === 'phone' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
            )}>1</div>
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step === 'role' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
            )}>2</div>
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              step === 'info' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
            )}>3</div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* 步骤1：验证手机号 */}
          {step === 'phone' && (
            <form onSubmit={handleVerifyPhone} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  手机号
                </label>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="h-11"
                  maxLength={11}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  验证码
                </label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="请输入验证码"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-11 flex-1"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sending || phone.length !== 11}
                    className="h-11 px-4 whitespace-nowrap border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
                  >
                    {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#163050] text-white font-medium"
              >
                {loading ? '验证中...' : '下一步'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/admin/login')}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  已有账号？返回登录
                </button>
              </div>
            </form>
          )}

          {/* 步骤2：选择角色 */}
          {step === 'role' && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                <User className="h-4 w-4" />
                选择角色
              </div>

              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      selectedRole === role.id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="font-medium text-slate-800">{role.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{role.description}</div>
                  </button>
                ))}
              </div>

              <Button
                type="button"
                onClick={handleSelectRole}
                disabled={loading || !selectedRole}
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#163050] text-white font-medium"
              >
                下一步
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('phone')}
                className="w-full h-11"
              >
                返回上一步
              </Button>
            </div>
          )}

          {/* 步骤3：填写信息 */}
          {step === 'info' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <User className="h-4 w-4" />
                  姓名
                </label>
                <Input
                  type="text"
                  placeholder="请输入姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <Lock className="h-4 w-4" />
                  密码
                </label>
                <Input
                  type="password"
                  placeholder="请输入密码（至少4位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-slate-400">默认密码：123456（可修改）</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                <div className="font-medium">注册信息确认</div>
                <div className="mt-2 space-y-1">
                  <div>手机号：{phone}</div>
                  <div>角色：{roles.find(r => r.id === selectedRole)?.name}</div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-medium"
              >
                {loading ? '注册中...' : '完成注册'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('role')}
                className="w-full h-11"
              >
                返回上一步
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          苏州家服派 · 家政云创空间
        </p>
      </div>
    </div>
  );
}
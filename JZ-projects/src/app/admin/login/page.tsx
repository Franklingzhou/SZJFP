'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, Eye, EyeOff, Smartphone, Lock, Key, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginMode, setLoginMode] = useState<'password' | 'sms'>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 修改密码
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpPhone, setCpPhone] = useState('');
  const [cpOldPassword, setCpOldPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState('');

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 微信扫码登录 - 通过URL传入的token自动登录
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      (async () => {
        try {
          const res = await fetch('/api/auth/session', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success && data.user) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('auth_role', data.user.role);
            localStorage.setItem('auth_username', data.user.name);
            localStorage.setItem('auth_phone', data.user.phone);
            localStorage.setItem('auth_userid', data.user.id);
            localStorage.setItem('auth_review_status', data.user.reviewStatus || 'approved');
            const redirectPath = data.user.role === 'worker' || data.user.role === 'worker_operator' ? '/worker/resume'
              : data.user.role === 'client' || data.user.role === 'customer' ? '/client/orders'
              : '/admin/dashboard';
            router.replace(redirectPath);
          }
        } catch {
          // token无效，忽略
        }
      })();
    }
  }, [searchParams, router]);

  // 根据角色获取跳转路径
  const getRedirectPath = (role: string): string => {
    if (role === 'worker' || role === 'worker_operator') return '/worker/resume';
    if (role === 'client' || role === 'customer') return '/client/orders';
    return '/admin/dashboard';
  };

  // 保存登录态并跳转
  const handleLoginSuccess = (user: { id?: string; name?: string; phone?: string; role: string; reviewStatus?: string }, token: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_role', user.role);
    localStorage.setItem('auth_username', user.name || '');
    localStorage.setItem('auth_phone', user.phone || '');
    localStorage.setItem('auth_userid', user.id || '');
    localStorage.setItem('auth_review_status', user.reviewStatus || 'approved');
    router.replace(getRedirectPath(user.role));
  };

  // 密码登录
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      setError('请输入手机号和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.token && data.user) {
        handleLoginSuccess(data.user, data.token);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

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
        body: JSON.stringify({ phone }),
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

  // 验证码登录
  const handleSmsLogin = async (e: React.FormEvent) => {
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
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: smsCode }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.token && data.user) {
        const userReviewStatus = data.user.reviewStatus || data.user.review_status;
        if (userReviewStatus === 'rejected') {
          setError('您的注册申请未通过审核，请联系管理员');
          return;
        }
        if (userReviewStatus === 'pending') {
          setError('您的注册申请正在审核中，请耐心等待');
          return;
        }
        handleLoginSuccess(data.user, data.token);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpPhone || !cpOldPassword || !cpNewPassword) {
      setCpError('请填写完整信息');
      return;
    }
    if (cpNewPassword.length < 4) {
      setCpError('新密码至少4位');
      return;
    }

    setCpLoading(true);
    setCpError('');
    setCpSuccess('');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cpPhone, oldPassword: cpOldPassword, newPassword: cpNewPassword }),
      });
      const data = await res.json();

      if (data.error) {
        setCpError(data.error);
        return;
      }

      setCpSuccess('密码修改成功，请使用新密码登录');
      setCpPhone('');
      setCpOldPassword('');
      setCpNewPassword('');
    } catch {
      setCpError('网络错误，请重试');
    } finally {
      setCpLoading(false);
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
          <p className="text-white/60 text-sm mt-1">管理后台</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          {/* 登录方式切换 */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setError(''); }}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                loginMode === 'password'
                  ? 'bg-white shadow text-[#1e3a5f]'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Lock className="h-4 w-4" />
              密码登录
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('sms'); setError(''); }}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5',
                loginMode === 'sms'
                  ? 'bg-white shadow text-[#1e3a5f]'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <MessageSquare className="h-4 w-4" />
              验证码登录
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* 密码登录 */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4" />
                  手机号
                </label>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                  <Lock className="h-4 w-4" />
                  密码
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <Key className="h-3 w-3" /> 修改密码
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#1e3a5f] hover:bg-[#163050] text-white font-medium"
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          )}

          {/* 验证码登录 */}
          {loginMode === 'sms' && (
            <form onSubmit={handleSmsLogin} className="space-y-4">
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
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          )}

          {/* 微信扫码 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-2 text-slate-400">其他方式</span></div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                alert('微信扫码登录功能即将开放，请先使用手机号登录。\n\n新注册用户默认密码：123456');
              }}
              className="flex items-center gap-2 px-4 py-2.5 border border-green-200 rounded-lg text-green-600 hover:bg-green-50 transition-colors text-sm"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.436 1.703-1.408 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.2 4.127c-3.997 0-7.242 2.697-7.242 6.03 0 3.334 3.245 6.03 7.242 6.03.69 0 1.358-.087 1.992-.248a.722.722 0 0 1 .599.082l1.345.787a.272.272 0 0 0 .14.045c.133 0 .241-.11.241-.247 0-.06-.023-.12-.038-.179l-.277-1.047a.495.495 0 0 1 .177-.556c1.52-1.07 2.486-2.663 2.486-4.434 0-3.332-3.244-6.013-7.241-6.013h-.024zm-2.4 3.152c.538 0 .974.443.974.99a.982.982 0 0 1-.974.989.982.982 0 0 1-.974-.989c0-.547.436-.99.974-.99zm4.8 0c.538 0 .974.443.974.99a.982.982 0 0 1-.974.989.982.982 0 0 1-.974-.989c0-.547.436-.99.974-.99z"/></svg>
              微信扫码登录（即将开放）
            </button>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          苏州家服派 · 家政云创空间
        </p>
      </div>

      {/* 修改密码弹窗 */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {cpError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {cpError}
              </div>
            )}
            {cpSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg p-3">
                {cpSuccess}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">手机号</label>
              <Input
                type="tel"
                placeholder="请输入手机号"
                value={cpPhone}
                onChange={(e) => setCpPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">当前密码</label>
              <Input
                type="password"
                placeholder="请输入当前密码"
                value={cpOldPassword}
                onChange={(e) => setCpOldPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">新密码</label>
              <Input
                type="password"
                placeholder="请输入新密码（至少4位）"
                value={cpNewPassword}
                onChange={(e) => setCpNewPassword(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowChangePassword(false)}>取消</Button>
              <Button type="submit" disabled={cpLoading}>
                {cpLoading ? '修改中...' : '确认修改'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">加载中...</p></div>}>
      <AdminLoginContent />
    </Suspense>
  );
}

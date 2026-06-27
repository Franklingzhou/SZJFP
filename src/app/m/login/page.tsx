'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMiniApp } from '@/components/miniapp/context';
import { ROLE_LABELS } from '@/lib/types';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Users,
  Briefcase,
  GraduationCap,
  BookOpen,
  Shield,
  Smartphone,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

// 注册可选角色
const registerRoles: { value: Role; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'worker', label: '家政阿姨', icon: Users, color: 'text-amber-600' },
  { value: 'agent', label: '经纪人', icon: Briefcase, color: 'text-blue-600' },
  { value: 'recruiter', label: '招生代理', icon: GraduationCap, color: 'text-green-600' },
  { value: 'instructor', label: '培训讲师', icon: BookOpen, color: 'text-purple-600' },
  { value: 'training_supervisor', label: '培训主管', icon: Shield, color: 'text-teal-600' },
  { value: 'customer', label: '客户', icon: Users, color: 'text-rose-600' },
];

const rolePaths: Record<string, string> = {
  worker: '/m/worker',
  agent: '/m/agent',
  recruiter: '/m/recruiter',
  instructor: '/m/instructor',
  customer: '/m/customer',
  admin: '/admin',
  training_supervisor: '/m/training_supervisor',
  worker_operator: '/m/worker_operator',
};

function LoginContent() {
  const {
    setIsLoggedIn, setCurrentRole, setUserName, setUserId, setUserPhone,
    wechatLoginError, wechatOpenId,
  } = useMiniApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [smsMsg, setSmsMsg] = useState('');

  // 微信自动登录
  const [wechatStatus, setWechatStatus] = useState<'idle' | 'checking' | 'success'>('idle');

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 自动检测已登录
  useEffect(() => {
    const token = localStorage.getItem('miniapp_token') || localStorage.getItem('auth_token');
    const role = localStorage.getItem('miniapp_role') || localStorage.getItem('auth_role');
    if (token && role && rolePaths[role]) {
      router.replace(rolePaths[role]);
    }
  }, [router]);

  // 微信自动登录 - 检查URL中的wxcode参数
  useEffect(() => {
    const wxcode = searchParams.get('wxcode');
    const openidParam = searchParams.get('openid');
    const isNew = searchParams.get('new') === 'true';

    if (wxcode) {
      setWechatStatus('checking');
      fetch('/api/auth/wechat-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: wxcode }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setWechatStatus('success');
            handleLoginSuccess(data.user, data.token);
          } else if (data.isNewUser) {
            // 新用户，跳到注册模式
            setMode('register');
            if (openidParam) {
              setPhone('');
            }
            setWechatStatus('idle');
          } else {
            setWechatStatus('idle');
            setError(data.error || '微信登录失败');
          }
        })
        .catch(() => {
          setWechatStatus('idle');
          setError('微信登录请求失败');
        });
      return;
    }

    if (openidParam && isNew) {
      setMode('register');
    }
  }, [searchParams]);

  // 登录成功处理
  const handleLoginSuccess = (user: { id?: string; name?: string; phone?: string; role: string }, token?: string) => {
    const role = user.role as Role;
    setIsLoggedIn(true);
    setCurrentRole(role);
    setUserName(user.name || '');
    setUserId(user.id || '');
    setUserPhone(user.phone || '');

    if (token) {
      localStorage.setItem('miniapp_token', token);
    }
    localStorage.setItem('miniapp_role', role);
    localStorage.setItem('miniapp_username', user.name || '');
    localStorage.setItem('miniapp_userid', user.id || '');
    localStorage.setItem('miniapp_phone', user.phone || '');

    // 通知小程序
    try {
      if (typeof window !== 'undefined') {
        const wxEnv = (window as unknown as Record<string, Record<string, { postMessage: (data: string) => void }>>);
        wxEnv.wx?.miniProgram?.postMessage?.(JSON.stringify({
          action: 'login',
          data: { id: user.id, name: user.name, phone: user.phone, role, token }
        }));
      }
    } catch { /* 非小程序环境忽略 */ }

    const path = rolePaths[role] || '/m/login';
    router.replace(path);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    setSending(true);
    setError('');
    setSmsMsg('');
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
          setSmsMsg(`验证码已发送（开发模式：${data._devCode}）`);
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

  // 登录
  const handleLogin = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code || code.length < 4) {
      setError('请输入验证码');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.token && data.user) {
        const userReviewStatus = data.user.reviewStatus || data.user.review_status;
        const userIsActive = data.user.is_active ?? data.user.isActive ?? true;
        if (userReviewStatus === 'rejected') {
          setError('您的注册申请未通过审核，请联系管理员');
          return;
        }
        if (userReviewStatus === 'pending') {
          setError('您的注册申请正在审核中，请耐心等待');
          return;
        }
        if (!userIsActive) {
          setError('账号已被停用，请联系管理员');
          return;
        }
        handleLoginSuccess(data.user, data.token);
      } else if (data.isNewUser) {
        // 没找到用户 → 切到注册页，自己选角色
        setMode('register');
        setError('');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    if (!code || code.length < 4) {
      setError('请输入验证码');
      return;
    }
    if (!name.trim()) {
      setError('请输入姓名');
      return;
    }
    if (!selectedRole) {
      setError('请选择角色');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const wechatOpenid = wechatOpenId || searchParams.get('openid') || undefined;
      const res = await fetch('/api/auth/phone-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, name: name.trim(), role: selectedRole, wechat_openid: wechatOpenid }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.needs_review) {
        setError('');
        setMode('login');
        setSmsMsg('注册成功！请等待管理员审核通过后登录。');
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

  // 微信登录中
  if (wechatStatus === 'checking') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 text-green-500 animate-spin" />
        <p className="text-slate-600">微信登录中...</p>
      </div>
    );
  }

  if (wechatStatus === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-slate-600">登录成功，正在跳转...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white px-6 pt-12 pb-16 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-8 w-8 text-amber-400" />
            <span className="text-xl font-bold">家政云创空间</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {mode === 'login' ? '欢迎回来' : '注册新账号'}
          </h1>
          <p className="text-white/70 text-sm">
            {mode === 'login'
              ? '手机号+验证码登录，系统自动识别您的角色'
              : '选择角色并注册，审核通过后即可使用'}
          </p>
        </div>
      </div>

      {/* 微信登录失败提示 */}
      {wechatLoginError && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {wechatLoginError}
        </div>
      )}

      {/* Form */}
      <div className="flex-1 px-6 -mt-8">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
          {/* Phone */}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">手机号</label>
            <input
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="w-full h-12 px-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
              maxLength={11}
            />
          </div>

          {/* Verification Code */}
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">验证码</label>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="请输入验证码"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="flex-1 h-12 px-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                maxLength={6}
              />
              <button
                onClick={handleSendCode}
                disabled={countdown > 0 || sending || phone.length !== 11}
                className={cn(
                  'h-12 px-4 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors',
                  countdown > 0 || sending || phone.length !== 11
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-[#1e3a5f]/5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10'
                )}
              >
                {sending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
              </button>
            </div>
          </div>

          {/* SMS message */}
          {smsMsg && (
            <div className="mb-4 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              {smsMsg}
            </div>
          )}

          {/* Register fields */}
          {mode === 'register' && (
            <>
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">姓名</label>
                <input
                  type="text"
                  placeholder="请输入真实姓名"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  className="w-full h-12 px-4 text-base rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                />
              </div>
              <div className="mb-4">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">选择角色</label>
                <div className="grid grid-cols-1 gap-2">
                  {registerRoles.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setSelectedRole(r.value)}
                      className={cn(
                        'w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3',
                        selectedRole === r.value
                          ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <r.icon className={cn('h-5 w-5 flex-shrink-0', r.color)} />
                      <span className="font-medium text-slate-800">{r.label}</span>
                      {selectedRole === r.value && (
                        <CheckCircle2 className="h-5 w-5 text-[#1e3a5f] ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            className="w-full h-12 rounded-xl text-base font-semibold bg-[#1e3a5f] hover:bg-[#2d5a8e] text-white transition-colors disabled:opacity-50"
          >
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>

          {/* Switch mode */}
          <div className="mt-4 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                还没有账号？
                <button
                  onClick={() => { setMode('register'); setError(''); setSmsMsg(''); }}
                  className="text-[#1e3a5f] font-medium ml-1"
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button
                  onClick={() => { setMode('login'); setError(''); setSmsMsg(''); }}
                  className="text-[#1e3a5f] font-medium ml-1"
                >
                  返回登录
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-xs text-slate-400">
        苏州家服派 · 家政云创空间
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

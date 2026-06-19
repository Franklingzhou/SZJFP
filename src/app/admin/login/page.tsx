'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Shield, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSendCode() {
    if (!phone || phone.length !== 11) {
      setMessage({ type: 'error', text: '请输入正确的手机号' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSendingCode(true);
    try {
      const res = await fetch('/api/auth/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'login' }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: '验证码已发送（开发模式：888888）' });
      } else {
        setMessage({ type: 'error', text: data.error || '发送失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '发送失败' });
    } finally {
      setSendingCode(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!phone || phone.length !== 11) {
      setMessage({ type: 'error', text: '请输入正确的手机号' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!code || code.length !== 6) {
      setMessage({ type: 'error', text: '请输入6位验证码' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();
        if (data.success) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_role', data.user.role);
          localStorage.setItem('auth_user_id', data.user.id);
          localStorage.setItem('auth_name', data.user.name);

          router.push('/admin/dashboard');
      } else {
        setMessage({ type: 'error', text: data.error || '登录失败' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch {
      setMessage({ type: 'error', text: '登录失败' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">家政共创平台</h1>
          <p className="text-slate-400">管理员后台登录</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl p-8">
          {message && (
            <div className={cn(
              'mb-4 p-3 rounded-lg text-sm font-medium',
              message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            )}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Phone Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-white mb-2">手机号</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">验证码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type={showCode ? 'text' : 'password'}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="请输入6位验证码"
                  className="w-full pl-12 pr-24 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-20 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showCode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || phone.length !== 11}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
                >
                  {sendingCode ? '发送中...' : '获取验证码'}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all"
            >
              {loginLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  登录
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* Test Account Hint */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl">
            <p className="text-xs text-slate-400 mb-2">测试账号：</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-300">管理员：13000000001</div>
              <div className="text-slate-300">经纪人：13600001234</div>
              <div className="text-slate-300">招生：13500003456</div>
              <div className="text-slate-300">讲师：13700007890</div>
              <div className="text-slate-300">培训主管：13100001111</div>
              <div className="text-slate-300">阿姨运营：13200002222</div>
              <div className="text-slate-300">客户：13900009876</div>
              <div className="text-slate-300">阿姨：13800005678</div>
              <div className="text-slate-300 col-span-2">验证码：888888</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          家政共创平台 MVP v2
        </div>
      </div>
    </div>
  );
}
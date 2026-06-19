'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 从localStorage读取当前登录手机号
    const storedPhone = localStorage.getItem('auth_phone') || localStorage.getItem('miniapp_phone') || '';
    if (storedPhone) setPhone(storedPhone);

    // 倒计时
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone || countdown > 0) return;
    setSendingCode(true);
    try {
      const res = await fetch('/api/auth/sms-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        setCountdown(60);
      } else {
        setError(data.error || '发送失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone || !code || !newPassword || !confirmPassword) {
      setError('请填写所有字段');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 4) {
      setError('新密码至少4位');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setCode('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error || '重置失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            重置登录密码
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">通过手机验证码验证身份后设置新密码</p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-green-700">密码重置成功</p>
              <p className="text-sm text-slate-500 mt-2">下次登录请使用新密码</p>
              <Button onClick={() => setSuccess(false)} className="mt-4" variant="outline">
                再次重置
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="输入手机号"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="输入验证码"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={sendingCode || countdown > 0 || !phone}
                    className="whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : sendingCode ? '发送中...' : '获取验证码'}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="输入新密码（至少4位）"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '提交中...' : '确认重置'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

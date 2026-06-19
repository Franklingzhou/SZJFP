'use client';

import { useState, useEffect } from 'react';
import { User, Phone, Shield, Lock, Save, Eye, EyeOff } from 'lucide-react';

function getAuthHeaders(contentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (contentType) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('auth_token') || localStorage.getItem('miniapp_token');
  if (token) headers['x-session'] = token;
  return headers;
}

const roleLabels: Record<string, string> = {
  admin: '管理员',
  agent: '经纪人',
  recruiter: '招生代理',
  instructor: '培训讲师',
  training_supervisor: '培训主管',
  worker_operator: '阿姨运营',
  worker: '阿姨',
  customer: '客户',
};

export default function ProfileSettingsPage() {
  const [user, setUser] = useState<{ id: string; name: string; phone: string; role: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 修改密码
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile', { headers: getAuthHeaders(false) });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setEditName(data.user.name || '');
      }
    } catch (err) {
      console.error('[profile] load error:', err);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: editName }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        // 同步更新 localStorage
        const key = localStorage.getItem('auth_token') ? 'auth_username' : 'miniapp_username';
        localStorage.setItem(key, data.user.name || '');
        setMessage({ type: 'success', text: '保存成功' });
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setMessage(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: '请填写所有密码字段' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '新密码和确认密码不一致' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少6位' });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ type: 'success', text: '密码修改成功' });
      } else {
        setMessage({ type: 'error', text: data.error || '密码修改失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '密码修改失败' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-64 text-slate-500">加载中...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">个人设置</h1>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* 用户信息卡片 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <User className="w-5 h-5" /> 基本信息
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <User className="w-4 h-4 inline mr-1" />姓名
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>

          {/* 手机号（不可编辑） */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />手机号
            </label>
            <input
              type="text"
              value={user.phone || '未绑定'}
              disabled
              className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-500"
            />
          </div>

          {/* 角色（不可编辑） */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              <Shield className="w-4 h-4 inline mr-1" />角色
            </label>
            <input
              type="text"
              value={roleLabels[user.role] || user.role}
              disabled
              className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-500"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#163050] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 修改密码卡片 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <Lock className="w-5 h-5" /> 修改密码
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {/* 旧密码 */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">当前密码</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前密码"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">新密码</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 确认密码 */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
            />
          </div>
        </div>

        <button
          onClick={handleChangePassword}
          disabled={changingPassword}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-lg text-sm hover:bg-[#163050] disabled:opacity-50"
        >
          <Lock className="w-4 h-4" />
          {changingPassword ? '修改中...' : '修改密码'}
        </button>
      </div>
    </div>
  );
}

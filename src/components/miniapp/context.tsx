'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Role } from '@/lib/types';
import { initDataFromApi, isDataLoaded } from '@/lib/data-service';

interface UserInfo {
  id: string;
  phone: string;
  name: string;
  role: Role;
  reviewStatus?: string;
  openid?: string;
  isNewUser?: boolean;
}

interface MiniAppContextType {
  currentRole: Role | null;
  setCurrentRole: (role: Role | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  userName: string;
  setUserName: (v: string) => void;
  userId: string;
  setUserId: (v: string) => void;
  userPhone: string;
  setUserPhone: (v: string) => void;
  user: UserInfo | null;
  logout: () => void;
  token: string;
  // 微信登录相关
  isWechatAutoLogging: boolean;
  wechatLoginError: string | null;
  wechatOpenId: string | null;
}

const MiniAppContext = createContext<MiniAppContextType>({
  currentRole: null,
  setCurrentRole: () => {},
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  userName: '',
  setUserName: () => {},
  userId: '',
  setUserId: () => {},
  userPhone: '',
  setUserPhone: () => {},
  user: null,
  logout: () => {},
  token: '',
  isWechatAutoLogging: false,
  wechatLoginError: null,
  wechatOpenId: null,
});

export const useMiniApp = () => useContext(MiniAppContext);

export function MiniAppProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [token, setToken] = useState('');
  const [openid, setOpenid] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [isWechatAutoLogging, setIsWechatAutoLogging] = useState(false);
  const [wechatLoginError, setWechatLoginError] = useState<string | null>(null);

  // 从localStorage恢复登录态 + 加载API数据
  useEffect(() => {
    setMounted(true);
    const savedRole = localStorage.getItem('miniapp_role');
    const savedToken = localStorage.getItem('miniapp_token');
    
    if (savedRole && savedToken) {
      setCurrentRole(savedRole as Role);
      setIsLoggedIn(true);
      setUserName(localStorage.getItem('miniapp_username') || '');
      setPhone(localStorage.getItem('miniapp_phone') || '');
      setUserId(localStorage.getItem('miniapp_userid') || '');
      setToken(savedToken);
      setOpenid(localStorage.getItem('miniapp_openid') || null);
    }

    // 从API加载业务数据，完成后触发重渲染
    if (!isDataLoaded()) {
      initDataFromApi().then(() => setDataReady(true));
    } else {
      setDataReady(true);
    }

    // 如果没有已保存的登录态，尝试微信自动登录
    if (!savedRole || !savedToken) {
      attemptWechatAutoLogin();
    }
  }, []);

  // 微信自动登录
  const attemptWechatAutoLogin = useCallback(async () => {
    // 检查是否在微信小程序环境
    const isWechat = typeof window !== 'undefined' && 
      (window.__wxjs_environment === 'miniprogram' || 
       /miniProgram/i.test(navigator.userAgent));
    
    // 也支持URL参数 ?wxcode=xxx（小程序通过URL传递code）
    const urlParams = new URLSearchParams(window.location.search);
    const wxCode = urlParams.get('wxcode') || urlParams.get('code');

    if (!isWechat && !wxCode) {
      // 非微信环境，不自动登录
      return;
    }

    if (!wxCode) {
      // 在微信环境但没有code，提示小程序端传递code
      console.log('[miniapp] 在微信环境中，等待小程序传递wxcode参数');
      return;
    }

    setIsWechatAutoLogging(true);
    setWechatLoginError(null);

    try {
      const response = await fetch('/api/auth/wechat-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: wxCode }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // 自动登录成功
        const user = data.user;
        setCurrentRole(user.role as Role);
        setIsLoggedIn(true);
        setUserName(user.name);
        setUserId(user.id);
        setPhone(user.phone);
        setToken(data.token);
        localStorage.setItem('miniapp_role', user.role);
        localStorage.setItem('miniapp_username', user.name);
        localStorage.setItem('miniapp_phone', user.phone);
        localStorage.setItem('miniapp_userid', user.id);
        localStorage.setItem('miniapp_token', data.token);
        localStorage.setItem('miniapp_openid', data.openid || '');
      } else if (data.isNewUser) {
        // 新用户，需要选择角色注册
        setOpenid(data.openid);
        // 跳转到登录页让用户选择角色
        window.location.href = '/m/login?openid=' + encodeURIComponent(data.openid) + '&new=true';
      } else {
        setWechatLoginError(data.error || '微信登录失败');
      }
    } catch (err) {
      console.error('[miniapp] 微信自动登录失败:', err);
      setWechatLoginError('网络错误，请重试');
    } finally {
      setIsWechatAutoLogging(false);
    }
  }, []);

  const handleSetRole = (role: Role | null) => {
    setCurrentRole(role);
    if (role) {
      localStorage.setItem('miniapp_role', role);
    } else {
      localStorage.removeItem('miniapp_role');
    }
  };

  const handleSetLoggedIn = (v: boolean) => {
    setIsLoggedIn(v);
    if (!v) {
      localStorage.removeItem('miniapp_role');
      localStorage.removeItem('miniapp_phone');
      localStorage.removeItem('miniapp_userid');
      localStorage.removeItem('miniapp_username');
      localStorage.removeItem('miniapp_token');
      localStorage.removeItem('miniapp_openid');
      setCurrentRole(null);
      setPhone('');
      setUserId('');
      setUserName('');
      setToken('');
      setOpenid(null);
    }
  };

  const handleSetUserName = (v: string) => {
    setUserName(v);
    if (v) localStorage.setItem('miniapp_username', v);
  };

  const handleSetUserId = (v: string) => {
    setUserId(v);
    if (v) localStorage.setItem('miniapp_userid', v);
  };

  const handleSetUserPhone = (v: string) => {
    setPhone(v);
    if (v) localStorage.setItem('miniapp_phone', v);
  };

  const user: UserInfo | null = currentRole 
    ? { id: userId, phone, name: userName, role: currentRole, openid: openid || undefined } 
    : null;

  const logout = () => {
    handleSetLoggedIn(false);
    setUserName('');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // 微信自动登录中
  if (isWechatAutoLogging) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <div className="animate-spin h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        <p className="text-slate-600 text-sm">微信登录中...</p>
      </div>
    );
  }

  return (
    <MiniAppContext.Provider
      value={{
        currentRole,
        setCurrentRole: handleSetRole,
        isLoggedIn,
        setIsLoggedIn: handleSetLoggedIn,
        userName,
        setUserName: handleSetUserName,
        userId,
        setUserId: handleSetUserId,
        userPhone: phone,
        setUserPhone: handleSetUserPhone,
        user,
        logout,
        token,
        isWechatAutoLogging,
        wechatLoginError,
        wechatOpenId: openid,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  );
}

// 声明微信小程序环境变量
declare global {
  interface Window {
    __wxjs_environment?: string;
  }
}

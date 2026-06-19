'use client';

import { useCallback } from 'react';

export function usePhoneCall() {
  const call = useCallback((phone: string) => {
    if (!phone) {
      alert('电话号码为空');
      return;
    }

    // 清理电话号码（去除空格、横线等）
    const cleanPhone = phone.replace(/[\s\-]/g, '');

    // 检测是否在微信小程序 web-view 中
    const isMiniProgram =
      typeof window !== 'undefined' &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).__wxjs_environment === 'miniprogram' ||
        /miniProgram/i.test(navigator.userAgent));

    if (isMiniProgram) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const wxMiniProgram = (window as any).wx?.miniProgram;
        if (wxMiniProgram) {
          wxMiniProgram.navigateTo({
            url: `/pages/call/call?phone=${encodeURIComponent(cleanPhone)}`,
          });
          return;
        }
      } catch (e) {
        console.warn('wx.miniProgram.navigateTo 失败，降级使用 tel:', e);
      }
    }

    // 非微信环境：使用 tel: 协议
    window.location.href = `tel:${cleanPhone}`;
  }, []);

  return call;
}

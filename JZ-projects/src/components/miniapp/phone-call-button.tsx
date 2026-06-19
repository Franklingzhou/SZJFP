'use client';

import { usePhoneCall } from '@/hooks/use-phone-call';
import { Phone } from 'lucide-react';

interface PhoneCallButtonProps {
  phone: string;
  className?: string;
  iconClassName?: string;
  label?: string;
  variant?: 'icon' | 'button' | 'link';
}

/**
 * 统一的电话拨打按钮
 * - 微信小程序web-view中：通过wx.miniProgram.navigateTo跳转原生拨打页
 * - 普通浏览器：使用tel:协议
 */
export function PhoneCallButton({ phone, className = '', iconClassName = '', label, variant = 'icon' }: PhoneCallButtonProps) {
  const makeCall = usePhoneCall();

  if (!phone) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    makeCall(phone);
  };

  if (variant === 'link') {
    return (
      <a
        href={`tel:${phone}`}
        onClick={handleClick}
        className={`text-blue-600 ${className}`}
      >
        {label || phone}
      </a>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1 ${className}`}
        type="button"
      >
        <Phone className={iconClassName || 'h-4 w-4'} />
        {label || '拨打'}
      </button>
    );
  }

  // icon variant (default)
  return (
    <button
      onClick={handleClick}
      className={`p-1.5 rounded-lg bg-green-50 text-green-600 ${className}`}
      type="button"
      title={`拨打 ${phone}`}
    >
      <Phone className={iconClassName || 'h-4 w-4'} />
    </button>
  );
}

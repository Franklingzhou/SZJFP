import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

export function formatDate(dateStr: string): string {
  return dateStr;
}

export function getCreditScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}

export function getCreditScoreBg(score: number): string {
  if (score >= 90) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 70) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (score >= 60) return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    idle: 'bg-green-50 text-green-700',
    working: 'bg-blue-50 text-blue-700',
    pending: 'bg-yellow-50 text-yellow-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
    pending_review: 'bg-yellow-50 text-yellow-700',
    created: 'bg-yellow-50 text-yellow-700',
    matched: 'bg-blue-50 text-blue-700',
    confirmed: 'bg-indigo-50 text-indigo-700',
    in_service: 'bg-green-50 text-green-700',
    // 订单状态
    open: 'bg-amber-50 text-amber-700',
    interviewing: 'bg-orange-50 text-orange-700',
    signed: 'bg-blue-50 text-blue-700',
    in_progress: 'bg-teal-50 text-teal-700',
    completed: 'bg-gray-50 text-gray-700',
    cancelled: 'bg-red-50 text-red-700',
    upcoming: 'bg-blue-50 text-blue-700',
    ongoing: 'bg-green-50 text-green-700',
  };
  return map[status] || 'bg-gray-50 text-gray-700';
}

export function maskPhone(phone: string): string {
  return phone;
}

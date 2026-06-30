import { NextRequest } from 'next/server';
import { handleGetCommission, handlePutCommission } from '@/app/api/_shared/commission-handlers';

// /api/commissions → /api/commission 的别名路由
// 通过共享 handler 避免 307 重定向暴露内部 pod 地址
export async function GET(request: NextRequest) {
  return handleGetCommission(request);
}

export async function POST(request: NextRequest) {
  return handlePutCommission(request);
}

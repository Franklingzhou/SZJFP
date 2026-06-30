import { NextRequest } from 'next/server';
import { handleGetCommission, handlePutCommission } from '@/app/api/_shared/commission-handlers';

// GET /api/commission — 获取佣金配置
export async function GET(request: NextRequest) {
  return handleGetCommission(request);
}

// PUT /api/commission — 更新佣金配置
export async function PUT(request: NextRequest) {
  return handlePutCommission(request);
}

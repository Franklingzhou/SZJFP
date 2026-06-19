import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// GET /api/file-url?key=xxx — Generate a presigned URL for a file
export async function GET(request: NextRequest) {
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: '缺少文件key参数' }, { status: 400 });
    }

    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 86400, // 24 hours
    });

    return NextResponse.json({ success: true, url });
  } catch (error: unknown) {
    console.error('[file-url GET] Error:', error);
    return NextResponse.json({ error: '生成文件链接失败' }, { status: 500 });
  }
}

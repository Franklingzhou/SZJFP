import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';
import { requireAuth, unauthorizedResponse } from '@/lib/auth-middleware';

// Initialize S3 storage (using coze-coding built-in bucket)
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: process.env.COZE_WORKLOAD_API_TOKEN || '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// Allowed file types for upload
const ALLOWED_TYPES: Record<string, string[]> = {
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  idcard: ['image/jpeg', 'image/png'],
  photo: ['image/jpeg', 'image/png', 'image/webp'],
  general: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  // Auth check
  const session = await requireAuth(request);
  if (!session) return unauthorizedResponse();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ALLOWED_TYPES[category] || ALLOWED_TYPES.general;
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}` },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);

    // Generate a clean filename
    const ext = file.name.split('.').pop() || 'jpg';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${category}/${session.userId}_${Date.now()}_${safeName}`;

    // Upload to S3
    const fileKey = await storage.uploadFile({
      fileContent,
      fileName,
      contentType: file.type,
    });

    // Generate a presigned URL for immediate access (7 days, refreshed via /api/file-url)
    const presignedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 604800, // 7 days
    });

    return NextResponse.json({
      success: true,
      data: {
        key: fileKey,
        url: presignedUrl,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        category,
      },
    });
  } catch (error: unknown) {
    console.error('[upload POST] Error:', error);
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 });
  }
}

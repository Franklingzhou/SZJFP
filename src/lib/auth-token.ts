/**
 * Token 签名与验证工具（使用标准 JWT）
 * 替换之前自定义的非标准 token 格式
 */
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-key';
const TOKEN_EXPIRY = '7d';

/** 签发标准 JWT token */
export function signToken(userId: string): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: TOKEN_EXPIRY });
}

/** 验证 JWT token，返回 userId 或 null */
export function verifyJwtToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, SECRET) as { userId: string };
    if (!payload.userId) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

/** 兼容旧版自定义 token 格式的验证 */
function verifyLegacyToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    // 旧格式: base64url(userId:timestamp).base64url(userId:timestamp:secret)[0:16]
    const decoded = Buffer.from(parts[0], 'base64url').toString('utf-8');
    const colonIdx = decoded.indexOf(':');
    if (colonIdx < 0) return null;

    const userId = decoded.substring(0, colonIdx);
    const timestamp = decoded.substring(colonIdx + 1);

    // 重新计算签名并比较
    const expectedHash = Buffer.from(`${userId}:${timestamp}:${SECRET}`).toString('base64url').substring(0, 16);
    if (expectedHash !== parts[1]) return null; // 签名不匹配 → 被篡改

    return userId;
  } catch {
    return null;
  }
}

/** 
 * 统一验证 token（支持新旧格式）
 * - 3段：标准 JWT（jsonwebtoken 签发）
 * - 2段：旧版自定义格式（带签名校验）
 * - 其他：返回 null
 */
export function parseAndVerifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length === 3) return verifyJwtToken(token);
  if (parts.length === 2) return verifyLegacyToken(token);
  return null;
}

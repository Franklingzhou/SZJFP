/**
 * 密码哈希与验证工具
 * 使用 Node.js 内置 crypto.scryptSync（纯 JS，CloudRun 兼容）
 */
import crypto from 'crypto';

const KEY_LEN = 64;  // scrypt 输出长度

/** 对密码做哈希，返回 "salt:hash" 格式字符串 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
}

/** 验证密码是否匹配已存储的哈希值 */
export function verifyPassword(password: string, stored: string): boolean {
  // 旧版明文密码（无 ':' 分隔符）→ 直接比较（兼容过渡期）
  if (!stored.includes(':')) {
    return stored === password;
  }

  const parts = stored.split(':');
  if (parts.length !== 2) return false;

  const [salt, hash] = parts;
  try {
    const computedHash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
  } catch {
    return false;
  }
}

/** 判断存储的密码是否需要重新哈希（仍然是明文） */
export function needsRehash(stored: string): boolean {
  return !stored.includes(':');
}

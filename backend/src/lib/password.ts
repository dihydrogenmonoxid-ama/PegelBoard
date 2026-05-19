import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || hash === 'CHANGEME') return false;
  const [salt, storedKey] = hash.split(':');
  if (!salt || !storedKey) return false;
  const key = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(storedKey, 'hex'), key);
}

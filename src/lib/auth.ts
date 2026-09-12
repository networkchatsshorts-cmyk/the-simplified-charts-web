import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE = 'tsc_admin';

function sign(value: string) {
  const secret = process.env.SESSION_SECRET || 'dev-secret';
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

export function makeSession() {
  const payload = `${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  return `${payload}.${sign(payload)}`;
}

export async function isAdmin() {
  const c = await cookies();
  const value = c.get(COOKIE)?.value;
  if (!value) return false;
  const [payload, signature] = value.split('.');
  if (!payload || !signature || signature !== sign(payload)) return false;
  const created = Number(payload.split(':')[0]);
  return Number.isFinite(created) && Date.now() - created < 1000 * 60 * 60 * 24 * 7;
}

export const adminCookie = COOKIE;

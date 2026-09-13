import { NextResponse } from 'next/server';
import { adminCookie, makeSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function getClientKey(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

  return crypto
    .createHash('sha256')
    .update(ip)
    .digest('hex');
}

export async function POST(req: Request) {
  const { password } = await req.json();
  const key = getClientKey(req);

  const { data: attempt } = await supabase
    .from('admin_login_attempts')
    .select('failed_attempts, locked_until')
    .eq('key', key)
    .maybeSingle();

  if (attempt?.locked_until) {
    const lockedUntil = new Date(attempt.locked_until);

    if (lockedUntil > new Date()) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    const failedAttempts = (attempt?.failed_attempts || 0) + 1;

    const lockedUntil =
      failedAttempts >= MAX_ATTEMPTS
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
        : null;

    await supabase
      .from('admin_login_attempts')
      .upsert(
        {
          key,
          failed_attempts: lockedUntil ? 0 : failedAttempts,
          locked_until: lockedUntil,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (lockedUntil) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  await supabase
    .from('admin_login_attempts')
    .delete()
    .eq('key', key);

  const res = NextResponse.json({ ok: true });

  res.cookies.set(adminCookie, makeSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

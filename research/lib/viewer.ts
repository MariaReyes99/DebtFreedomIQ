/**
 * Who is asking:
 *  - logged in to DebtFreedomIQ → keyed by their user id, with their DebtFreedomIQ plan
 *  - otherwise → anonymous, keyed by a salted hash of the IP address (the raw IP is never stored or logged)
 */
import { createHash } from 'node:crypto';
import { getSession } from '@/lib/session';
import type { Plan } from './plans';

export type Viewer = { key: string; userId: string | null; plan: Plan; name?: string };

let warnedSalt = false;

function clientIp(req: Request): string {
  return req.headers.get('x-real-ip')?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function getViewer(req: Request): Promise<Viewer> {
  try {
    const s = await getSession();
    if (s.user) {
      const plan: Plan = s.tier === 'premium_plus' ? 'plus' : s.tier === 'premium' ? 'premium' : 'free';
      return { key: `u:${s.user.id}`, userId: s.user.id, plan, name: s.displayName ?? undefined };
    }
  } catch { /* not logged in, or the database is unavailable */ }
  const salt = process.env.IP_HASH_SALT;
  if (!salt && process.env.NODE_ENV === 'production' && !warnedSalt) {
    warnedSalt = true;
    console.warn('IP_HASH_SALT is not set. Set a long random value so visitor IP hashes cannot be reversed.');
  }
  const hash = createHash('sha256').update(`${salt ?? 'irl-dev'}|${clientIp(req)}`).digest('hex').slice(0, 32);
  return { key: `ip:${hash}`, userId: null, plan: 'free' };
}

/**
 * Request limits for the app's API (used by middleware). Uses Upstash Redis when it's set up,
 * so limits hold across all servers; otherwise a per-server memory counter (fine for testing).
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis/cloudflare"; // the edge-friendly build (middleware runs on the edge)

type Rule = { match: RegExp; limit: number; window: `${number} ${"s" | "m" | "h"}`; name: string };

/** First match wins. The library chat has its own allowance and limits. */
export const RULES: Rule[] = [
  { match: /^\/api\/stripe\/webhook/, limit: 300, window: "1 m", name: "webhook" },
  { match: /^\/api\/waiver/, limit: 5, window: "1 h", name: "waiver" },
  { match: /^\/api\/support/, limit: 5, window: "10 m", name: "support" },
  { match: /^\/api\/(checkout|billing)/, limit: 10, window: "10 m", name: "billing" },
  { match: /^\/api\/(help\/brief|plan\/ask)/, limit: 20, window: "10 m", name: "ai" },
  { match: /^\/api\/account\/(delete|export)/, limit: 5, window: "1 h", name: "account" },
  { match: /^\/api\/library\/chat/, limit: 30, window: "1 m", name: "library" },
  { match: /^\/api\//, limit: 60, window: "1 m", name: "api" },
];

const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;
const limiters = new Map<string, Ratelimit>();
const memory = new Map<string, { n: number; reset: number }>();
const ms = (w: Rule["window"]) => { const [n, u] = w.split(" "); return Number(n) * (u === "s" ? 1e3 : u === "m" ? 6e4 : 36e5); };

export async function checkLimit(path: string, who: string): Promise<{ ok: boolean; retryAfter: number }> {
  const rule = RULES.find(r => r.match.test(path));
  if (!rule) return { ok: true, retryAfter: 0 };
  const key = `${rule.name}:${who}`;
  if (redis) {
    let l = limiters.get(rule.name);
    if (!l) { l = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(rule.limit, rule.window), prefix: "dfiq:rl" }); limiters.set(rule.name, l); }
    try {
      const r = await l.limit(key);
      return { ok: r.success, retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
    } catch { return { ok: true, retryAfter: 0 }; } // never lock people out because Redis is down
  }
  const now = Date.now(), e = memory.get(key);
  if (!e || e.reset < now) { memory.set(key, { n: 1, reset: now + ms(rule.window) }); return { ok: true, retryAfter: 0 }; }
  e.n += 1;
  if (memory.size > 20000) memory.clear();
  return { ok: e.n <= rule.limit, retryAfter: Math.ceil((e.reset - now) / 1000) };
}

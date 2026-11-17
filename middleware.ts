import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from "@/lib/env";
import { timedFetch } from "@/lib/supabase/fetch";
import { checkLimit } from "@/lib/ratelimit";

const PROTECTED = ["/dashboard", "/account", "/admin"];

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
const clientIp = (r: NextRequest) => r.headers.get("x-real-ip")?.trim() || r.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
const deny = (status: number, error: string, extra: Record<string, string> = {}) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store", ...extra } });

/** API protection: same-site requests only for changes, a size cap, and per-person rate limits. */
async function guardApi(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  const isCron = path.startsWith("/api/billing/run") && request.headers.get("authorization")?.startsWith("Bearer ");
  if (!SAFE.has(request.method) && !isCron) {
    // Block cross-site form posts and scripts on other sites (CSRF)
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    const crossOrigin = origin ? (() => { try { return new URL(origin).host !== request.nextUrl.host; } catch { return true; } })() : false;
    if (crossOrigin || (site && site !== "same-origin" && site !== "none")) return deny(403, "Request blocked.");
    const size = Number(request.headers.get("content-length") || 0);
    if (size > (path.startsWith("/api/library/chat") ? 512_000 : 100_000)) return deny(413, "That's too much data in one go.");
  }
  const { ok, retryAfter } = await checkLimit(path, clientIp(request));
  if (!ok) return deny(429, "Too many requests. Please wait a moment and try again.", { "Retry-After": String(retryAfter) });
  return null;
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const blocked = await guardApi(request);
    if (blocked) return blocked;
  }
  let response = NextResponse.next({ request });
  const anon = request.cookies.get("dfiq_anon")?.value ?? crypto.randomUUID();
  const setAnon = (r: NextResponse) => {
    if (!request.cookies.get("dfiq_anon")) r.cookies.set("dfiq_anon", anon, { path: "/", maxAge: 31536000, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
    if (/^\/(admin|account|api)(\/|$)/.test(request.nextUrl.pathname)) r.headers.set("X-Robots-Tag", "noindex, nofollow");
    return r;
  };
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) return setAnon(response);

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    global: { fetch: timedFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims verifies the login token locally (no round trip to Supabase when the project uses
  // signing keys) and still refreshes an expired session. Much faster than getUser on every click.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    user = data?.claims?.sub ? { id: data.claims.sub } : null;
  } catch { user = null; }
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some(p => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return setAnon(NextResponse.redirect(url));
  }
  return setAnon(response);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|images/|.*\\.(?:svg|png|jpg|ico)$).*)"] };

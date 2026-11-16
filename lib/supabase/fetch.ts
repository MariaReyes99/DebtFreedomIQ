/**
 * fetch for Supabase calls: gives up after 10 seconds (instead of hanging a page for 30+),
 * and logs any call slower than 1.5 seconds in the terminal so slow spots are easy to find.
 */
const TIMEOUT_MS = 10_000;
const SLOW_MS = 1_500;

export const timedFetch: typeof fetch = async (input, init) => {
  const started = Date.now();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = init?.signal ? (typeof AbortSignal.any === "function" ? AbortSignal.any([init.signal, timeout]) : init.signal) : timeout;
  const label = () => { try { const u = new URL(url); return `${init?.method ?? "GET"} ${u.pathname}`; } catch { return url; } };
  try {
    const res = await fetch(input, { ...init, signal });
    const ms = Date.now() - started;
    if (ms > SLOW_MS) console.warn(`[slow supabase] ${(ms / 1000).toFixed(1)}s ${label()}`);
    return res;
  } catch (e) {
    console.error(`[supabase] ${label()} failed after ${((Date.now() - started) / 1000).toFixed(1)}s: ${(e as Error).message}`);
    throw e;
  }
};

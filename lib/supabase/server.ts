import "server-only";
import { SUPABASE_URL, SUPABASE_PUBLIC_KEY, SUPABASE_SECRET } from "../env";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { timedFetch } from "./fetch";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    SUPABASE_URL!,
    SUPABASE_PUBLIC_KEY!,
    {
      global: { fetch: timedFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* called from a Server Component; proxy refreshes sessions */ }
        },
      },
    }
  );
}

/** Service-role client. Server only — bypasses RLS. */
export function adminClient() {
  return createAdmin(SUPABASE_URL!, SUPABASE_SECRET!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timedFetch },
  });
}

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);
}

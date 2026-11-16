// Supports Supabase's new key names (publishable/secret) and the legacy ones (anon/service_role).

/** Accepts common copy-paste mistakes and returns just https://<ref>.supabase.co */
function normaliseSupabaseUrl(raw?: string) {
  if (!raw) return undefined;
  let v = raw.trim().replace(/^["']|["']$/g, "");
  // Dashboard link → project URL (https://supabase.com/dashboard/project/<ref>/...)
  const dash = v.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return `https://${dash[1]}.supabase.co`;
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v}`);
    return `${u.protocol}//${u.host}`; // drop /rest/v1, /auth/v1, trailing slashes, query strings
  } catch {
    return v.replace(/\/+$/, "");
  }
}

const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, "").split(/\s+/)[0] || undefined;

export const SUPABASE_URL = normaliseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_PUBLIC_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const SUPABASE_SECRET = clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

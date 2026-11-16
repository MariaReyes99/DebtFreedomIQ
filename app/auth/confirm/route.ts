import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient, isConfigured } from "@/lib/supabase/server";

/**
 * Email links (confirm sign-up, reset password, magic link) point HERE on your own domain,
 * e.g. https://debtfreedomiq.com/auth/confirm?token_hash=…&type=signup&next=/health
 * so emails never show the database (supabase.co) address. See docs/EMAIL_SETUP.md.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextRaw = url.searchParams.get("next") || (type === "recovery" ? "/reset-password" : "/health");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/health";
  if (token_hash && type && isConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    } catch (e) { console.error("[auth/confirm]", (e as Error).message); }
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}

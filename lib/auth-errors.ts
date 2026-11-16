/** Plain-English versions of common Supabase Auth errors. */
export function friendly(e: { message?: string; code?: string; status?: number } | null): string {
  const m = (e?.message || "").toLowerCase(); const code = e?.code || "";
  if (code === "over_email_send_rate_limit" || m.includes("rate limit")) return "We've hit the email limit for now. Please wait a few minutes (up to an hour) and try again. (Site owner: set up custom SMTP in Supabase to lift this limit.)";
  if (code === "email_address_not_authorized" || m.includes("not authorized")) return "Our email service isn't set up to send to this address yet. (Site owner: set up custom SMTP in Supabase. See docs/EMAIL_SETUP.md.)";
  if (m.includes("already registered") || code === "user_already_exists") return "This email already has an account. Try logging in, or use \"Forgot password?\".";
  return e?.message || "Something went wrong. Please try again.";
}

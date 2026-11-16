import { NextResponse, type NextRequest } from "next/server";
import { createClient, isConfigured } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") || "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  if (code && isConfigured()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return NextResponse.redirect(new URL("/login?error=link", url.origin));
    } catch { return NextResponse.redirect(new URL("/login?error=link", url.origin)); }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

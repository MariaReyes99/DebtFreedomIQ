import { NextResponse, type NextRequest } from "next/server";
import { createClient, isConfigured } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  if (isConfigured()) { const s = await createClient(); await s.auth.signOut(); }
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

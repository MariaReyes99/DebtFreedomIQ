import { NextResponse } from "next/server";
import { runBilling } from "@/lib/billing";
import { isAdmin } from "@/lib/session";
import { isConfigured } from "@/lib/supabase/server";

// Daily renewal job. Called by Vercel Cron (Authorization: Bearer CRON_SECRET) or by an admin from /admin.
export const dynamic = "force-dynamic";

async function allowed(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  return isAdmin();
}

async function handle(req: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  if (!(await allowed(req))) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const simulateDue = new URL(req.url).searchParams.get("simulate") === "1";
  const report = await runBilling({ simulateDue });
  return NextResponse.json({ ok: true, simulateDue, ...report });
}
export const GET = handle;
export const POST = handle;

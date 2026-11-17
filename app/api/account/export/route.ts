import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** GET /api/account/export: everything we hold about you, as a JSON file (your right to a copy of your data). */
export async function GET() {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const db = await createClient(); // your own login: row-level security returns only your rows
  const tables = ["profiles", "financial_assessments", "assets", "debts", "expenses", "financial_plans", "subscriptions", "payments", "payment_methods"] as const;
  const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email } };
  for (const t of tables) {
    const { data } = await db.from(t).select("*").limit(5000);
    out[t] = data ?? [];
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="debtfreedomiq-my-data.json"`, "Cache-Control": "no-store" },
  });
}

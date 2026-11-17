import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { adminClient } from "@/lib/supabase/server";
import { redactPII } from "@/research/lib/guardrails/pii";

const Body = z.object({
  displayName: z.string().trim().max(40).optional().default(""),
  story: z.string().trim().min(20, "Please write a little more (at least 20 characters).").max(1500),
  outcome: z.string().trim().max(160).optional().default(""),
  consent: z.literal(true, { message: "Please tick the box to let us share it." }),
});

/** POST /api/stories: a user shares how DebtFreedomIQ helped. Shown publicly only after an admin approves it. */
export async function POST(req: Request) {
  const { user, country } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  const b = parsed.data;
  const { error } = await adminClient().from("testimonials").insert({
    user_id: user.id, display_name: b.displayName || null, country: country?.code ?? null,
    story: redactPII(b.story).clean, outcome: b.outcome ? redactPII(b.outcome).clean : null, consent: true,
  });
  if (error) { console.error("[stories]", error.message); return NextResponse.json({ error: "Couldn't save just now. Please try again." }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

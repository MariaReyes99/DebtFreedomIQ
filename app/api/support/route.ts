import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { adminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { TOPICS, esc, notifyAdmins } from "@/lib/support";
import { redactPII } from "@/research/lib/guardrails/pii";

const Body = z.object({
  name: z.string().trim().max(80).optional().default(""),
  email: z.string().trim().email().max(200),
  topic: z.enum(TOPICS.map(t => t[0]) as [string, ...string[]]),
  message: z.string().trim().min(10, "Please tell us a little more (at least 10 characters).").max(4000),
  website: z.string().max(0).optional(), // hidden field: bots fill it in, people don't
});

/** POST /api/support: a message to the support team. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  const b = parsed.data;
  const { user, country } = await getSession();
  // Never store card numbers; mask other personal numbers people paste in by mistake
  const pii = redactPII(b.message);
  if (pii.blocked) return NextResponse.json({ error: "Please don't send card numbers. Remove them and try again." }, { status: 400 });
  const { data, error } = await adminClient().from("support_messages")
    .insert({ user_id: user?.id ?? null, email: b.email, name: b.name || null, topic: b.topic, message: pii.clean, country: country?.code ?? null })
    .select("id").single();
  if (error || !data) {
    console.error("[support]", error?.message);
    return NextResponse.json({ error: "We couldn't send your message just now. Please try again shortly." }, { status: 500 });
  }
  const topic = TOPICS.find(t => t[0] === b.topic)?.[1] ?? b.topic;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  await notifyAdmins(`Support: ${topic}`, `<p><strong>${esc(b.name || "Someone")}</strong> (${esc(b.email)}) wrote:</p><p style="white-space:pre-wrap">${esc(pii.clean)}</p><p><a href="${site}/admin/support">Open the support inbox</a></p>`);
  await sendEmail({ to: b.email, subject: "We've got your message — DebtFreedomIQ", html: `<p>Kia ora${b.name ? ` ${esc(b.name)}` : ""},</p><p>Thanks for getting in touch. We usually reply within 2 working days.</p><p>If you're struggling right now, you don't have to wait for us: the free helplines on our Get help page can talk to you today.</p><p>— The DebtFreedomIQ team</p>` });
  return NextResponse.json({ ok: true });
}

"use server";
import { revalidatePath } from "next/cache";
import { getSession, isAdmin, adminClient } from "@/lib/session";
import { audit } from "@/lib/support";
import { cancelSub } from "@/lib/billing";
import { grantSubscriptionDetailed, PLUS_DAYS } from "@/lib/payments";

/** Every admin action checks the caller is an admin and is written to the audit log. */
async function admin() {
  if (!(await isAdmin())) throw new Error("Not allowed");
  const { user } = await getSession();
  return user!.email!;
}
const id = (v: FormDataEntryValue | null) => { const s = String(v ?? ""); if (!/^[0-9a-f-]{36}$/i.test(s)) throw new Error("Bad id"); return s; };

export async function setMessageStatus(fd: FormData) {
  const who = await admin();
  const msg = id(fd.get("id")), status = fd.get("status") === "resolved" ? "resolved" : "open";
  const note = String(fd.get("note") ?? "").slice(0, 2000);
  await adminClient().from("support_messages").update({ status, internal_note: note || null, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", msg);
  await audit(who, `support_${status}`, null, { message: msg });
  revalidatePath("/admin/support");
}

export async function grantAccess(fd: FormData) {
  const who = await admin();
  const user = id(fd.get("user")), tier = fd.get("tier") === "premium_plus" ? "premium_plus" : "premium";
  const reason = String(fd.get("reason") ?? "").slice(0, 300);
  const periodEnd = tier === "premium_plus" ? new Date(Date.now() + PLUS_DAYS * 864e5) : undefined;
  const r = await grantSubscriptionDetailed({ userId: user, tier, provider: "complimentary", ref: `comp_${user}_${Date.now()}`, amount: 0, currency: "nzd", periodEnd });
  await audit(who, "grant_access", user, { tier, reason, ok: r.ok, error: r.error });
  revalidatePath(`/admin/customers/${user}`);
}

export async function extendPlan(fd: FormData) {
  const who = await admin();
  const user = id(fd.get("user")), sub = id(fd.get("sub"));
  const days = Math.max(1, Math.min(400, Number(fd.get("days")) || 30));
  const db = adminClient();
  const { data } = await db.from("subscriptions").select("current_period_end").eq("id", sub).eq("user_id", user).maybeSingle();
  if (!data) return;
  const from = data.current_period_end && new Date(data.current_period_end) > new Date() ? new Date(data.current_period_end) : new Date();
  await db.from("subscriptions").update({ status: "active", current_period_end: new Date(from.getTime() + days * 864e5).toISOString(), past_due_since: null }).eq("id", sub);
  await audit(who, "extend_plan", user, { sub, days });
  revalidatePath(`/admin/customers/${user}`);
}

export async function cancelPlan(fd: FormData) {
  const who = await admin();
  const user = id(fd.get("user")), sub = id(fd.get("sub"));
  const r = await cancelSub(user, sub);
  await audit(who, "cancel_plan", user, { sub, ...r });
  revalidatePath(`/admin/customers/${user}`);
}

export async function setTestimonial(fd: FormData) {
  const who = await admin();
  const t = id(fd.get("id")), approved = fd.get("approved") === "true";
  if (fd.get("delete") === "true") await adminClient().from("testimonials").delete().eq("id", t);
  else await adminClient().from("testimonials").update({ approved }).eq("id", t);
  await audit(who, fd.get("delete") === "true" ? "testimonial_delete" : approved ? "testimonial_approve" : "testimonial_hide", null, { testimonial: t });
  revalidatePath("/admin/testimonials");
}

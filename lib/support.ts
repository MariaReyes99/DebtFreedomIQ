import "server-only";
import { adminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const TOPICS = [
  ["billing", "Payments, plans or refunds"],
  ["account", "My account or login"],
  ["technical", "Something isn't working"],
  ["hardship", "I can't afford Premium"],
  ["feedback", "Feedback or ideas"],
  ["partner", "Organisations and partnerships"],
  ["other", "Something else"],
] as const;
export type Topic = (typeof TOPICS)[number][0];

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const admins = () => (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);

/** Who did what in the admin area. Never throws. */
export async function audit(adminEmail: string, action: string, targetUser: string | null, detail?: Record<string, unknown>) {
  try { await adminClient().from("admin_audit").insert({ admin_email: adminEmail, action, target_user: targetUser, detail: detail ?? null }); }
  catch (e) { console.error("[audit]", (e as Error).message); }
}

export async function notifyAdmins(subject: string, html: string) {
  await Promise.all(admins().map(to => sendEmail({ to, subject, html })));
}

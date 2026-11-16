import "server-only";

/**
 * Transactional email (billing reminders). Uses Resend's HTTP API when RESEND_API_KEY is set,
 * otherwise logs to the server console (handy while testing).
 */
export async function sendEmail(o: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "DebtFreedomIQ <onboarding@resend.dev>";
  if (!key) { console.log(`[email:not-sent] to=${o.to} subject="${o.subject}" (set RESEND_API_KEY to send)`); return { sent: false }; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: o.to, subject: o.subject, html: o.html }),
    });
    if (!r.ok) console.error("[email] failed", r.status, await r.text());
    return { sent: r.ok };
  } catch (e) { console.error("[email]", (e as Error).message); return { sent: false }; }
}

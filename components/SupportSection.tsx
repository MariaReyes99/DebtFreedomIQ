"use client";
import { useActionState, useState } from "react";
import { sendFeedback, type FeedbackState } from "@/app/plan/feedback";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";

export default function SupportSection({ countryCode, donate }: { countryCode: CountryCode; donate?: string }) {
  const c = COUNTRIES[countryCode];
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback, {});
  const [rating, setRating] = useState(0);
  const presets = c.code === "PH" ? [100, 250, 500] : [5, 10, 20];
  const [amount, setAmount] = useState<number>(presets[1]);

  return (
    <section id="support" className="grid g2 noprint" style={{ marginTop: 24 }}>
      <div className="card">
        <h2>Tell us what you think</h2>
        {state.ok ? <p className="notice" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>Thank you. Your feedback helps us improve DebtFreedomIQ for everyone. 💚</p> : (
          <form action={action}>
            <input type="hidden" name="country" value={c.code} />
            <input type="hidden" name="rating" value={rating || ""} />
            <label>How helpful is DebtFreedomIQ?</label>
            <div className="stars" role="radiogroup" aria-label="Rating out of 5">
              {[1, 2, 3, 4, 5].map(n => (
                <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className={n <= rating ? "on" : ""} onClick={() => setRating(n)}>★</button>
              ))}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="comment">Anything we could do better, or a service we should add?</label>
              <textarea id="comment" name="comment" rows={4} maxLength={2000} placeholder="Please don't include account numbers or personal details." />
            </div>
            {state.error && <p className="error">{state.error}</p>}
            <button className="btn" disabled={pending}>{pending ? "Sending…" : "Send feedback"}</button>
          </form>
        )}
      </div>

      <div className="card soft">
        <h2>Support DebtFreedomIQ</h2>
        {donate === "thanks" && <p className="notice" style={{ background: "#fff", color: "var(--brand)" }}>Thank you so much for your donation! 💚</p>}
        {donate === "invalid" && <p className="error">Please enter an amount between {money(c, c.code === "PH" ? 50 : 1)} and {money(c, c.code === "PH" ? 50000 : 1000)}.</p>}
        {donate === "error" && <p className="error">Payment couldn&apos;t start. Please try again later.</p>}
        <p>Your donation helps keep the health check and help directory <strong>free for families who need them</strong>. Give only if you can. It never affects the help you get.</p>
        <form action="/api/donate" method="post">
          <div className="row">
            {presets.map(p => (
              <button type="button" key={p} className={`btn sm ${amount === p ? "" : "ghost"}`} onClick={() => setAmount(p)}>{money(c, p)}</button>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="amount">Or choose your own amount ({c.symbol})</label>
            <input id="amount" name="amount" inputMode="numeric" value={amount || ""} onChange={e => setAmount(Number(e.target.value.replace(/[^\d]/g, "")) || 0)} />
          </div>
          <button className="btn" disabled={!amount}>Donate {amount ? money(c, amount) : ""}</button>
          <p className="hint" style={{ marginTop: 8 }}>Secure one-off payment by Stripe. Donations are not tax-deductible unless DebtFreedomIQ becomes a registered charity.</p>
        </form>
      </div>
    </section>
  );
}

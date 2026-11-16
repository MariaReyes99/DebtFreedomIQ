"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

/** Demo card form — no card data leaves the browser. Swap for Stripe Checkout with PAYMENTS_MODE=stripe. */
export default function MockPaymentForm({ tier, label, allowNoCard = false }: { tier: string; label: string; allowNoCard?: boolean }) {
  const [noCard, setNoCard] = useState(false);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); start(async () => {
      setErr("");
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier, noCard }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Payment failed."); return; }
      if (/^https?:/.test(j.url)) { window.location.href = j.url; return; }
      router.push(j.url); router.refresh();
    }); }}>
      {allowNoCard && <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 font-normal text-amber-900"><input type="checkbox" name="noCard" checked={noCard} onChange={e => setNoCard(e.target.checked)} className="mt-0.5" /><span><strong>Testing: subscribe without a card.</strong> No card is saved and no payment is recorded.{tier === "premium_plus" ? " The next monthly renewal will fail and put Premium Plus on hold, so you can test reminders." : ""}</span></label>}
      {!noCard && (<>
      <div><label htmlFor="cn">Card number</label><input id="cn" defaultValue="4242 4242 4242 4242" readOnly className="mt-1.5 font-mono" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="ce">Expiry</label><input id="ce" defaultValue="12 / 34" readOnly className="mt-1.5 font-mono" /></div>
        <div><label htmlFor="cc">CVC</label><input id="cc" defaultValue="123" readOnly className="mt-1.5 font-mono" /></div>
      </div></>)}
      {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      <Button type="submit" size="lg" full disabled={pending}>{pending ? "Processing…" : noCard ? "Subscribe without a card (test)" : label}</Button>
      <p className="text-center text-xs text-navy-500">🔒 Demo mode: this is a test card and no money is taken.</p>
    </form>
  );
}

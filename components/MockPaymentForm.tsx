"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

/** Demo card form — no card data leaves the browser. Swap for Stripe Checkout with PAYMENTS_MODE=stripe. */
export default function MockPaymentForm({ tier, label }: { tier: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); start(async () => {
      setErr("");
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error || "Payment failed."); return; }
      router.push(j.url); router.refresh();
    }); }}>
      <div><label htmlFor="cn">Card number</label><input id="cn" defaultValue="4242 4242 4242 4242" readOnly className="mt-1.5 font-mono" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="ce">Expiry</label><input id="ce" defaultValue="12 / 34" readOnly className="mt-1.5 font-mono" /></div>
        <div><label htmlFor="cc">CVC</label><input id="cc" defaultValue="123" readOnly className="mt-1.5 font-mono" /></div>
      </div>
      {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}
      <Button type="submit" size="lg" full disabled={pending}>{pending ? "Processing…" : label}</Button>
      <p className="text-center text-xs text-navy-500">🔒 Demo mode: this is a test card and no money is taken.</p>
    </form>
  );
}

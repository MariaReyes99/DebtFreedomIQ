"use client";
import { useActionState, useEffect, useState } from "react";
import { cancelAction, addCardAction, deleteCardAction, payNowAction, type BillingState } from "@/app/account/billing-actions";
import type { Card as SavedCard, Sub } from "@/lib/billing";
import { Badge, Button, Card } from "./ui";

type Payment = { id: string; amount: number; currency: string | null; status: string; description: string | null; created_at: string };
const fmt = (minor: number | null, cur: string | null) => `${(cur ?? "").toUpperCase()} ${((minor ?? 0) / 100).toFixed(2)}`;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

function Msg({ s }: { s: BillingState }) {
  useEffect(() => { if (s.url) window.location.href = s.url; }, [s.url]);
  return <>{s.ok && <p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">✓ {s.ok}</p>}{s.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p>}</>;
}

function CancelButton({ sub }: { sub: Sub }) {
  const [s, action, pending] = useActionState<BillingState, FormData>(cancelAction, {});
  const [confirm, setConfirm] = useState(false);
  if (s.ok) return <Msg s={s} />;
  return (
    <div className="mt-4">
      {!confirm ? <Button variant="secondary" size="sm" onClick={() => setConfirm(true)}>Unsubscribe</Button> : (
        <form action={action} className="rounded-xl border border-red-200 bg-red-50 p-4">
          <input type="hidden" name="subId" value={sub.id} />
          <p className="font-semibold text-red-800">Unsubscribe from {sub.tier === "premium" ? "Premium" : "Premium Plus"}?</p>
          <p className="mt-1 text-sm text-red-800">Premium features (My Freedom Plan, Find Help matching, referral brief) will be switched off straight away.{sub.tier === "premium" ? " Bought in the last 14 days? Contact us for a refund." : " You won't be charged again."}</p>
          <div className="mt-3 flex gap-2"><Button type="submit" size="sm" disabled={pending} className="!bg-red-600 hover:!bg-red-700">{pending ? "Cancelling…" : "Yes, unsubscribe"}</Button><Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>Keep Premium</Button></div>
          <Msg s={s} />
        </form>
      )}
    </div>
  );
}

function PayNow({ sub, hasCard, stripe }: { sub: Sub; hasCard: boolean; stripe: boolean }) {
  const [s, action, pending] = useActionState<BillingState, FormData>(payNowAction, {});
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="subId" value={sub.id} />
      <Button type="submit" disabled={pending || (!hasCard && !stripe)}>{pending ? "Processing…" : stripe ? "Update card & pay" : `Pay ${fmt(sub.amount, sub.currency)} now`}</Button>
      {!hasCard && !stripe && <p className="text-sm text-red-700">Add a card below first.</p>}
      <Msg s={s} />
    </form>
  );
}

function AddCard({ stripe }: { stripe: boolean }) {
  const [s, action, pending] = useActionState<BillingState, FormData>(addCardAction, {});
  const [open, setOpen] = useState(false);
  if (stripe) return <form action={action}><Button type="submit" size="sm" disabled={pending}>+ Add a card</Button><Msg s={s} /></form>;
  if (!open) return <><Button size="sm" onClick={() => setOpen(true)}>+ Add a card</Button><Msg s={s} /></>;
  return (
    <form action={action} className="space-y-3 rounded-xl border border-navy-100 p-4">
      <div><label htmlFor="number">Card number</label><input id="number" name="number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" className="mt-1 font-mono" required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="exp">Expiry (MM / YY)</label><input id="exp" name="exp" autoComplete="cc-exp" placeholder="12 / 34" className="mt-1 font-mono" required /></div>
        <div><label htmlFor="cvc">CVC</label><input id="cvc" autoComplete="cc-csc" placeholder="123" className="mt-1 font-mono" /></div>
      </div>
      <p className="text-xs text-navy-500">🔒 Demo mode: use 4242 4242 4242 4242. We keep only the card type and last 4 digits.</p>
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save card"}</Button><Button variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
      <Msg s={s} />
    </form>
  );
}

function DeleteCard({ card, warn }: { card: SavedCard; warn: string | null }) {
  const [s, action, pending] = useActionState<BillingState, FormData>(deleteCardAction, {});
  const [confirm, setConfirm] = useState(false);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-100 py-3 first:border-0">
      <span><span className="font-semibold capitalize">{card.brand}</span> •••• {card.last4} <span className="text-sm text-navy-500">· expires {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}</span></span>
      {!confirm ? <button onClick={() => setConfirm(true)} className="text-sm font-semibold text-red-600 hover:underline">Delete</button> : (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="cardId" value={card.id} />
          {warn && <span className="text-xs text-amber-800">{warn}</span>}
          <Button type="submit" size="sm" disabled={pending} className="!bg-red-600 hover:!bg-red-700">{pending ? "Deleting…" : "Delete card"}</Button>
          <button type="button" onClick={() => setConfirm(false)} className="text-sm text-navy-500">Cancel</button>
        </form>
      )}
      <Msg s={s} />
    </li>
  );
}

export default function BillingPanel({ subs, cards, payments, stripe, plusEnabled }: { subs: Sub[]; cards: SavedCard[]; payments: Payment[]; stripe: boolean; plusEnabled: boolean }) {
  const current = subs.filter(s => s.status === "active" || s.status === "past_due");
  const recurring = current.find(s => s.tier === "premium_plus" && s.status === "active");
  const warn = recurring && cards.length <= 1 ? `Without a card, your next payment on ${date(recurring.current_period_end)} will fail and Premium Plus will be put on hold.` : null;
  const statusBadge = (s: Sub) => s.status === "active" ? <Badge tone="green">Active</Badge> : s.status === "past_due" ? <Badge tone="red">On hold: payment needed</Badge> : <Badge tone="gray">{s.status}</Badge>;
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold">Your plan</h2>
        {!current.length ? (
          <><p className="mt-1 text-navy-600">You&apos;re on the <strong>Free</strong> plan.</p><Button href="/pricing" className="mt-4">See Premium options</Button></>
        ) : current.map(s => (
          <div key={s.id} className="mt-3 rounded-xl border border-navy-100 p-4">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{s.tier === "premium" ? "Premium (one-time report)" : "Premium Plus (yearly)"}</p>{statusBadge(s)}</div>
            <p className="mt-1 text-sm text-navy-600">
              {s.tier === "premium" ? `Paid ${fmt(s.amount, s.currency)} on ${date(s.created_at)}. No renewals.`
                : s.status === "active" ? `${fmt(s.amount, s.currency)} per year · next payment ${date(s.current_period_end)}`
                : `We couldn't take your ${fmt(s.amount, s.currency)} payment on ${date(s.past_due_since)} because there's no card on file. Premium is on hold until you pay.`}
            </p>
            {s.status === "past_due" && <PayNow sub={s} hasCard={cards.length > 0} stripe={stripe} />}
            <CancelButton sub={s} />
          </div>
        ))}
        {!plusEnabled && <p className="mt-3 text-xs text-navy-500">Premium Plus (Financial Simulator) is coming soon.</p>}
        {plusEnabled && !current.some(s => s.tier === "premium_plus") && <div className="mt-4 rounded-xl bg-navy-950 p-4 text-white"><p className="font-semibold">Premium Plus: Financial Simulator</p><p className="mt-1 text-sm text-navy-200">Test selling, buying, refinancing and lump sums, and see your net worth in 10 years and at retirement.</p><Button href="/checkout?tier=premium_plus" size="sm" variant="secondary" className="mt-3">Upgrade</Button></div>}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Payment details</h2><AddCard stripe={stripe} /></div>
        {cards.length ? <ul className="mt-3">{cards.map(c => <DeleteCard key={c.id} card={c} warn={warn} />)}</ul>
          : <p className="mt-2 text-sm text-navy-500">No saved cards.{recurring ? " Add one so your Premium Plus renewal doesn't fail." : ""}</p>}
        <p className="mt-3 text-xs text-navy-500">{stripe ? "Cards are stored securely by Stripe." : "Demo mode: no real cards or money."} We never store your full card number.</p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Payment history</h2>
        {payments.length ? (
          <table className="mt-3 w-full text-left text-sm"><thead><tr className="text-navy-500"><th className="py-2">Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{payments.map(p => <tr key={p.id} className="border-t border-navy-100"><td className="py-2">{date(p.created_at)}</td><td>{p.description}</td><td>{fmt(p.amount, p.currency)}</td><td>{p.status === "paid" ? <Badge tone="green">Paid</Badge> : <Badge tone="red">Failed</Badge>}</td></tr>)}</tbody></table>
        ) : <p className="mt-2 text-sm text-navy-500">No payments yet.</p>}
      </Card>
    </div>
  );
}

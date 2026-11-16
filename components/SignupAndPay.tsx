"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAndPay } from "@/app/checkout/actions";
import { ResendBox } from "@/app/auth/AuthForms";
import type { AuthState } from "@/app/auth/actions";
import CountrySearch from "./CountrySearch";
import { Button } from "./ui";
import type { CountryCode } from "@/lib/countries";

export default function SignupAndPay({ tier, price, country, mock, allowNoCard = false }: { tier: string; price: string; country: CountryCode | null; mock: boolean; allowNoCard?: boolean }) {
  const [noCard, setNoCard] = useState(false);
  const [s, action, pending] = useActionState<AuthState, FormData>(signUpAndPay, {});
  if (s.message && s.email) return <ResendBox email={s.email} next="/plan" intro={`✓ ${s.message} We sent the link to ${s.email}.`} />;
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="tier" value={tier} />
      {s.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error} {/log in/i.test(s.error) && <Link className="font-semibold underline" href={`/login?next=${encodeURIComponent(`/checkout?tier=${tier}`)}`}>Log in</Link>}</p>}

      <fieldset className="space-y-4">
        <legend className="mb-1 text-lg font-bold">1. Your account</legend>
        <div><label htmlFor="full_name">Your name</label><input id="full_name" name="full_name" autoComplete="name" className="mt-1.5" /></div>
        <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="mt-1.5" /></div>
        <div><label htmlFor="password">Create a password <span className="font-normal text-navy-500">(8+ characters)</span></label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="mt-1.5" /></div>
        <CountrySearch label="Country you live in" value={country} required />
      </fieldset>

      <fieldset className="space-y-4 border-t border-navy-100 pt-5">
        <legend className="mb-1 text-lg font-bold">2. Payment</legend>
        {allowNoCard && <label className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 font-normal text-amber-900"><input type="checkbox" name="noCard" checked={noCard} onChange={e => setNoCard(e.target.checked)} className="mt-0.5" /><span><strong>Testing: subscribe without a card.</strong> No card is saved and no payment is recorded.{tier === "premium_plus" ? " The next yearly renewal will fail and put Premium Plus on hold, so you can test reminders." : ""}</span></label>}
        {noCard ? null : mock ? (<>
          <div><label htmlFor="cn">Card number</label><input id="cn" defaultValue="4242 4242 4242 4242" readOnly className="mt-1.5 font-mono" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label htmlFor="ce">Expiry</label><input id="ce" defaultValue="12 / 34" readOnly className="mt-1.5 font-mono" /></div>
            <div><label htmlFor="cc">CVC</label><input id="cc" defaultValue="123" readOnly className="mt-1.5 font-mono" /></div>
          </div>
          <p className="text-xs text-navy-500">🔒 Demo mode: this is a test card and no money is taken.</p>
        </>) : <p className="text-sm text-navy-600">🔒 After you click the button you&apos;ll enter your card on Stripe&apos;s secure page. We never see your card number.</p>}
      </fieldset>

      <label className="flex items-start gap-3 font-normal text-navy-700"><input type="checkbox" name="consent" required className="mt-0.5" /> I understand DebtFreedomIQ gives general information and tools, not personalised financial advice.</label>
      <Button type="submit" size="lg" full disabled={pending}>{pending ? "Setting up your Premium account…" : noCard ? "Create account & subscribe (test, no card)" : `Create account & pay ${price}`}</Button>
      <p className="text-center text-sm text-navy-600">Already have an account? <Link className="font-semibold text-teal-700" href={`/login?next=${encodeURIComponent(`/checkout?tier=${tier}`)}`}>Log in to pay</Link></p>
    </form>
  );
}

"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, signUp, resetPassword, resendConfirmation, type AuthState } from "./actions";
import { toCountryCode } from "@/lib/countries";
import CountrySearch from "@/components/CountrySearch";
import { Button } from "@/components/ui";

const Err = ({ s }: { s: AuthState }) => s.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p> : null;

/** "Didn't get the email?" box with a resend button (60-second cooldown). */
export function ResendBox({ email, next, intro, onChangeEmail }: { email: string; next?: string; intro?: string; onChangeEmail?: () => void }) {
  const [s, action, pending] = useActionState<AuthState, FormData>(resendConfirmation, {});
  const [wait, setWait] = useState(60);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  useEffect(() => { if (s.message || s.error) setWait(60); }, [s]);
  return (
    <div className="rounded-2xl bg-teal-50 p-6 text-teal-900">
      <h2 className="text-lg font-bold">Almost there 📬</h2>
      <p className="mt-1">{intro ?? <>We sent a confirmation link to <strong>{email}</strong>. Click it to finish creating your account.</>}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-teal-800">
        <li>It can take a few minutes to arrive.</li>
        <li>Check your <strong>spam, junk or promotions</strong> folder.</li>
        <li>Open the link on the same device you signed up on.</li>
      </ul>
      {s.message && <p role="status" className="mt-3 rounded-xl bg-white px-4 py-3 text-sm">✓ {s.message}</p>}
      {s.error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p>}
      <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next ?? "/health"} />
        <Button type="submit" variant="secondary" disabled={pending || wait > 0}>{pending ? "Sending…" : wait > 0 ? `Resend email (${wait}s)` : "Resend confirmation email"}</Button>
        {onChangeEmail && <button type="button" onClick={onChangeEmail} className="text-sm font-semibold text-teal-700 hover:underline">Use a different email</button>}
      </form>
    </div>
  );
}

export function SignupForm({ defaultCountry, detected, next }: { defaultCountry?: string | null; detected?: string | null; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const [dismissed, setDismissed] = useState<AuthState | null>(null);
  if (state.message && state.email && state !== dismissed) return <ResendBox email={state.email} next={next} onChangeEmail={() => setDismissed(state)} />;
  return (
    <form action={action} className="space-y-4">
      <Err s={state} />
      <input type="hidden" name="next" value={next ?? "/health"} />
      <div><label htmlFor="full_name">Your name</label><input id="full_name" name="full_name" autoComplete="name" className="mt-1.5" /></div>
      <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="mt-1.5" /></div>
      <div><label htmlFor="password">Password <span className="font-normal text-navy-500">(8+ characters)</span></label><input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="mt-1.5" /></div>
      <div>
        <CountrySearch label="Country you live in" value={toCountryCode(defaultCountry)} required />
        <p className="-mt-2 text-xs text-navy-500">{defaultCountry ? "Detected from your location." : detected ? `We detected ${detected}, which isn't covered yet. Choose the closest.` : "Type to find your country."}</p>
      </div>
      <label className="flex items-start gap-3 font-normal text-navy-700"><input type="checkbox" name="consent" required className="mt-0.5" /> I understand DebtFreedomIQ gives general information and tools, not personalised financial advice.</label>
      <Button type="submit" size="lg" full disabled={pending}>{pending ? "Creating your account…" : /checkout/.test(next ?? "") ? "Create account & continue to payment" : "Create free account"}</Button>
      <p className="text-center text-sm text-navy-600">Already have an account? <Link className="font-semibold text-teal-700" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></p>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  const [r, raction, rpending] = useActionState<AuthState, FormData>(resetPassword, {});
  return (
    <div className="space-y-6">
    {state.unconfirmed && state.email && <ResendBox email={state.email} next={next} intro={`Your email ${state.email} isn't confirmed yet. Click the link we sent you, or get a new one below.`} />}
    <form action={action} className="space-y-4">
      {!state.unconfirmed && <Err s={state} />}
      <Err s={r} />
      {r.message && <p className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{r.message}</p>}
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" className="mt-1.5" /></div>
      <div><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" className="mt-1.5" /></div>
      <Button type="submit" size="lg" full disabled={pending}>{pending ? "Logging in…" : "Log in"}</Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button formAction={raction} formNoValidate disabled={rpending} className="font-semibold text-teal-700 hover:underline">Forgot password?</button>
        <span className="text-navy-600">New here? <Link className="font-semibold text-teal-700" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create a free account</Link></span>
      </div>
    </form>
    </div>
  );
}

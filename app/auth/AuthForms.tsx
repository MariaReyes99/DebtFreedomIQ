"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, resetPassword, type AuthState } from "./actions";
import { toCountryCode } from "@/lib/countries";
import CountrySearch from "@/components/CountrySearch";
import { Button } from "@/components/ui";

const Err = ({ s }: { s: AuthState }) => s.error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p> : null;

export function SignupForm({ defaultCountry, detected, next }: { defaultCountry?: string | null; detected?: string | null; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  if (state.message) return <div className="rounded-2xl bg-teal-50 p-6 text-teal-800"><h2 className="text-lg font-bold">Almost there 📬</h2><p className="mt-1">{state.message}</p></div>;
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
      <Button type="submit" size="lg" full disabled={pending}>{pending ? "Creating your account…" : "Create free account"}</Button>
      <p className="text-center text-sm text-navy-600">Already have an account? <Link className="font-semibold text-teal-700" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></p>
    </form>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  const [r, raction, rpending] = useActionState<AuthState, FormData>(resetPassword, {});
  return (
    <form action={action} className="space-y-4">
      <Err s={state} /><Err s={r} />
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
  );
}

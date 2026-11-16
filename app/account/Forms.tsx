"use client";
import { useActionState } from "react";
import { updateProfile, changePassword, type FormState } from "./actions";
import CountrySearch from "@/components/CountrySearch";
import { Button } from "@/components/ui";
import type { CountryCode } from "@/lib/countries";

const Msg = ({ s }: { s: FormState }) => <>{s.ok && <p role="status" className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">✓ {s.ok}</p>}{s.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{s.error}</p>}</>;

export function ProfileForm({ name, email, country }: { name: string; email: string; country: CountryCode | null }) {
  const [s, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      <Msg s={s} />
      <div><label htmlFor="full_name">Your name</label><input id="full_name" name="full_name" defaultValue={name} maxLength={80} className="mt-1.5" /></div>
      <div><label htmlFor="em">Email</label><input id="em" value={email} disabled className="mt-1.5 bg-navy-50" /></div>
      <CountrySearch label="Country you live in" value={country} required />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
    </form>
  );
}

export function PasswordForm() {
  const [s, action, pending] = useActionState<FormState, FormData>(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      <Msg s={s} />
      <div><label htmlFor="current">Current password</label><input id="current" name="current" type="password" autoComplete="current-password" required className="mt-1.5" /></div>
      <div><label htmlFor="new">New password (8+ characters)</label><input id="new" name="new" type="password" minLength={8} autoComplete="new-password" required className="mt-1.5" /></div>
      <div><label htmlFor="confirm">Confirm new password</label><input id="confirm" name="confirm" type="password" minLength={8} autoComplete="new-password" required className="mt-1.5" /></div>
      <Button type="submit" disabled={pending}>{pending ? "Changing…" : "Change password"}</Button>
    </form>
  );
}

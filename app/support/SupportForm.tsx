"use client";
import { useState } from "react";
import { Button } from "@/components/ui";

export default function SupportForm({ topics, email, name, topic }: { topics: readonly (readonly [string, string])[]; email: string; name: string; topic: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setState("sending"); setError(null);
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(fd)) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setState("sent"); else { setError(j.error ?? "Something went wrong."); setState("idle"); }
  };
  if (state === "sent") return <div role="status" className="rounded-2xl bg-emerald-50 p-6 text-emerald-900"><p className="text-lg font-bold">Thanks, your message is on its way.</p><p className="mt-1">We usually reply within 2 working days, by email.</p></div>;
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="s-name">Your name (optional)</label><input id="s-name" name="name" defaultValue={name} maxLength={80} autoComplete="name" /></div>
        <div><label htmlFor="s-email">Email for our reply</label><input id="s-email" name="email" type="email" required defaultValue={email} maxLength={200} autoComplete="email" /></div>
      </div>
      <div><label htmlFor="s-topic">What&apos;s it about?</label><select id="s-topic" name="topic" defaultValue={topic}>{topics.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div><label htmlFor="s-msg">Your message</label><textarea id="s-msg" name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Tell us what happened or what you need. Please don't include card numbers or passwords." /></div>
      <div aria-hidden className="hidden"><label htmlFor="s-web">Leave this empty</label><input id="s-web" name="website" tabIndex={-1} autoComplete="off" /></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</Button>
    </form>
  );
}

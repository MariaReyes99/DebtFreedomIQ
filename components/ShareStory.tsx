"use client";
import { useState } from "react";
import { Button, Card } from "./ui";

/** "Has this helped? Share your story" — collected with consent, published only after review. */
export default function ShareStory() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  if (state === "sent") return <Card className="bg-emerald-50"><p className="font-semibold text-emerald-900">Thank you for sharing. 💚 It helps other people take the first step.</p></Card>;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setState("sending"); setError(null);
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: fd.get("displayName"), story: fd.get("story"), outcome: fd.get("outcome"), consent: fd.get("consent") === "on" }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setState("sent"); else { setError(j.error ?? "Something went wrong."); setState("idle"); }
  };
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-bold">Has DebtFreedomIQ helped you?</h2><p className="text-sm text-navy-600">A few lines about what changed could give someone else the courage to start.</p></div>
        {!open && <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Share your story</Button>}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div><label htmlFor="st-story">What happened, and what changed?</label><textarea id="st-story" name="story" rows={4} required minLength={20} maxLength={1500} placeholder="e.g. I was NZ$800 short every month and didn't know where to start…" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="st-outcome">Result in one line (optional)</label><input id="st-outcome" name="outcome" maxLength={160} placeholder="e.g. Closed a NZ$800/month gap in 6 weeks" /></div>
            <div><label htmlFor="st-name">Name to show (optional)</label><input id="st-name" name="displayName" maxLength={40} placeholder="e.g. Sarah, Wellington (or leave blank)" /></div>
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" required className="mt-1" /> <span>You can share this on DebtFreedomIQ and in its marketing. I understand it&apos;s checked before it&apos;s shown, and I can ask for it to be removed at any time.</span></label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Share"}</Button>
        </form>
      )}
    </Card>
  );
}

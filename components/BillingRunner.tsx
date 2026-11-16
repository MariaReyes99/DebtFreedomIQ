"use client";
import { useState } from "react";
import { Button, Card } from "./ui";

export default function BillingRunner() {
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (simulate: boolean) => {
    setBusy(true);
    const r = await fetch(`/api/billing/run${simulate ? "?simulate=1" : ""}`, { method: "POST" });
    const j = await r.json();
    setOut(r.ok ? `Renewed ${j.renewed} · put on hold ${j.putOnHold} · reminders sent ${j.reminders} · ended ${j.expired}` : j.error);
    setBusy(false);
  };
  return (
    <Card className="mt-6">
      <h2 className="font-bold">Billing job</h2>
      <p className="mt-1 text-sm text-navy-600">Runs automatically every day (Vercel Cron). Renews Premium Plus for people with a card; puts the rest on hold and emails a reminder (again after 3 and 7 days); ends it after 30 days unpaid.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => run(false)} disabled={busy}>Run billing now</Button>
        <Button size="sm" variant="secondary" onClick={() => run(true)} disabled={busy}>Test: treat every Premium Plus as due today</Button>
      </div>
      {out && <p className="mt-3 rounded-xl bg-navy-50 px-4 py-2 text-sm">{out}</p>}
    </Card>
  );
}

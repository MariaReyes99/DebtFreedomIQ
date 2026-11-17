"use client";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

/** Your data: download a copy, or delete your account. */
export default function DataPanel() {
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const del = async () => {
    setBusy(true); setError(null);
    const r = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) window.location.assign("/?deleted=1");
    else { setError(j.error ?? "Something went wrong."); setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-bold">Download my data</h2>
        <p className="mt-1 text-sm text-navy-600">A file with everything we hold about you: profile, checks, plans, debts, assets, subscriptions and payments.</p>
        <a href="/api/account/export" download className="mt-3 inline-flex rounded-full border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:border-teal-400">⬇ Download (JSON)</a>
      </Card>
      <Card className="border-red-200">
        <h2 className="text-lg font-bold text-red-800">Delete my account</h2>
        <p className="mt-1 text-sm text-navy-700">This stops any renewals, removes saved cards, and permanently deletes your checks, plans and account. It can&apos;t be undone.</p>
        <label htmlFor="confirm-delete" className="mt-3 block text-sm font-semibold">Type DELETE to confirm</label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input id="confirm-delete" value={confirm} onChange={e => setConfirm(e.target.value)} className="max-w-[200px]" autoComplete="off" />
          <Button onClick={del} disabled={confirm !== "DELETE" || busy} className="bg-red-600 hover:bg-red-700">{busy ? "Deleting…" : "Delete my account"}</Button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </Card>
    </div>
  );
}

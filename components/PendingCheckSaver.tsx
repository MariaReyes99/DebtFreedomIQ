"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PENDING = "dfiq_pending_assessment";

/** Saves a health check done before logging in (kept in this browser), then refreshes the page. */
export default function PendingCheckSaver() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "failed">("idle");
  useEffect(() => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(PENDING); } catch { /* ignore */ }
    if (!raw) return;
    setState("saving");
    fetch("/api/assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw })
      .then(r => r.json())
      .then(j => {
        if (j.saved) { try { localStorage.removeItem(PENDING); } catch { /* ignore */ } router.refresh(); }
        else setState("failed");
      })
      .catch(() => setState("failed"));
  }, [router]);
  if (state === "saving") return <p role="status" className="mx-auto mt-6 max-w-xl rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-800">Saving the health check you did before logging in…</p>;
  if (state === "failed") return <p role="alert" className="mx-auto mt-6 max-w-xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">We found the health check you did before logging in but couldn&apos;t save it. Check the database is set up (run supabase/schema.sql), then reload this page.</p>;
  return null;
}

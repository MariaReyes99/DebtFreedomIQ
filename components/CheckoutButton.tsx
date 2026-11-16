"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export default function CheckoutButton({ tier, label, endpoint = "/api/checkout", variant = "primary", loggedIn = true }: { tier?: string; label: string; endpoint?: string; variant?: "primary" | "secondary" | "ghost" | "dark"; loggedIn?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <div>
      <Button full size="lg" variant={variant} disabled={pending} onClick={() => {
        if (!loggedIn) { router.push(`/signup?next=${encodeURIComponent("/pricing")}`); return; }
        start(async () => {
          setErr("");
          const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { setErr(j.error || "Something went wrong."); return; }
          if (j.url?.startsWith("http")) window.location.href = j.url; else { router.push(j.url); router.refresh(); }
        });
      }}>{pending ? "Please wait…" : label}</Button>
      {err && <p role="alert" className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}

"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

export default function GeneratePlanButton({ label = "Generate my Freedom Plan" }: { label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" disabled={pending} onClick={() => start(async () => {
        setErr("");
        const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy: "avalanche" }) });
        if (!r.ok) { setErr((await r.json()).error); return; }
        router.refresh();
      })}>{pending ? "Building your plan…" : label}</Button>
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

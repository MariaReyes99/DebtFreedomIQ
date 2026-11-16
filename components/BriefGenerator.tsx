"use client";
import { useState, useTransition } from "react";
import { HELP_CATEGORIES } from "@/lib/help";
import type { HelpCategory } from "@/lib/types";
import CopyBox from "./CopyBox";
import { Badge, Button, Card } from "./ui";

type Brief = { brief: string; emailTemplate: string; matches: { category: HelpCategory; why: string; questionsToAsk: string[] }[]; source: string };

export default function BriefGenerator({ initial }: { initial: Brief }) {
  const [b, setB] = useState<Brief>(initial);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Button onClick={() => start(async () => {
          setErr("");
          const r = await fetch("/api/help/brief", { method: "POST" });
          const j = await r.json(); if (!r.ok) { setErr(j.error); return; } setB(j);
        })} disabled={pending}>{pending ? "Generating…" : "✨ Generate my AI referral brief"}</Button>
        <Badge tone={b.source === "openai" ? "teal" : "gray"}>{b.source === "openai" ? "AI-generated" : "Standard brief"}</Badge>
        {err && <span role="alert" className="text-sm text-red-600">{err}</span>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {b.matches.map((m, i) => (
          <Card key={m.category + i}>
            <div className="flex items-center gap-2"><span className="text-2xl" aria-hidden>{HELP_CATEGORIES[m.category].icon}</span><h3 className="text-lg font-bold">{i + 1}. {HELP_CATEGORIES[m.category].label}</h3>{i === 0 && <Badge tone="teal">Best first step</Badge>}</div>
            <p className="mt-2 text-navy-700">{m.why}</p>
            {m.questionsToAsk.length > 0 && <><p className="mt-3 text-sm font-semibold">Questions to ask</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-navy-700">{m.questionsToAsk.map(q => <li key={q}>{q}</li>)}</ul></>}
          </Card>
        ))}
      </div>
      <Card><CopyBox title="Your personalised referral brief" text={b.brief} /></Card>
      <Card><CopyBox title="Email to book an appointment" text={b.emailTemplate} /></Card>
    </div>
  );
}

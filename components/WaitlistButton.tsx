"use client";
import { useState } from "react";
import { Button } from "./ui";

export default function WaitlistButton() {
  const [done, setDone] = useState(false);
  return done ? <p className="rounded-full bg-teal-50 px-4 py-3 text-center text-sm font-semibold text-teal-700" role="status">✓ You&apos;re on the list. We&apos;ll let you know.</p>
    : <Button full size="lg" variant="secondary" onClick={async () => { await fetch("/api/waitlist", { method: "POST" }); setDone(true); }}>Join the waitlist</Button>;
}

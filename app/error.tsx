"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui";

/** Friendly error page. Never shows technical details to visitors (they're in the server logs). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong on our side</h1>
      <p className="mt-3 text-navy-600">Your information is safe. Please try again. If it keeps happening, contact support and quote the code below.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-navy-400">Code: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-3"><Button onClick={reset}>Try again</Button><Button href="/support" variant="secondary">Contact support</Button></div>
    </div>
  );
}

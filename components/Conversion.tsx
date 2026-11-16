"use client";
import { useEffect } from "react";

declare global { interface Window { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void } }

/** Fires ad-platform conversion events once on mount (signup / purchase). */
export default function Conversion({ kind, value, currency }: { kind: "signup" | "purchase"; value?: number; currency?: string }) {
  useEffect(() => {
    const aw = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    const label = kind === "signup" ? process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL : process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    if (window.gtag) {
      if (aw && label) window.gtag("event", "conversion", { send_to: `${aw}/${label}`, value, currency });
      window.gtag("event", kind === "signup" ? "sign_up" : "purchase", { value, currency });
    }
    if (window.fbq) window.fbq("track", kind === "signup" ? "CompleteRegistration" : "Purchase", value ? { value, currency } : undefined);
  }, [kind, value, currency]);
  return null;
}

"use client";
import { useRouter } from "next/navigation";

/** ✕ Close: go back to the page the person came from (or home if they opened this page directly). */
export default function CloseButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  const close = () => {
    const sameSite = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (sameSite && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button type="button" onClick={close} aria-label="Close and go back"
      className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-700 hover:border-teal-400 hover:text-teal-700">
      <span aria-hidden className="text-base leading-none">✕</span> Close
    </button>
  );
}

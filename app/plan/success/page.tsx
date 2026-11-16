import Link from "next/link";
import { getSession } from "@/lib/session";
import { stripe, fulfil } from "@/lib/stripe";
import Conversion from "@/components/Conversion";

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const { user } = await getSession();
  let ok = false, value: number | undefined, currency: string | undefined;
  if (session_id && user) {
    try {
      const s = await stripe().checkout.sessions.retrieve(session_id);
      if (s.client_reference_id === user.id) { ok = await fulfil(s); value = (s.amount_total ?? 0) / 100; currency = s.currency?.toUpperCase(); }
    } catch { /* fall through */ }
  }
  return (
    <div className="wrap section narrow center">
      {ok && <Conversion kind="purchase" value={value} currency={currency} />}
      <h1>{ok ? "Thank you, your plan is ready 🎉" : "Payment received"}</h1>
      <p className="muted">{ok ? "You've taken a real step today." : "If your plan isn't unlocked within a minute, refresh the plan page."}</p>
      <Link href="/plan" className="btn big">Open my Debt Recovery Plan</Link>
    </div>
  );
}

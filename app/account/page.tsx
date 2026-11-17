import Link from "next/link";
import DataPanel from "./DataPanel";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { paymentsMode } from "@/lib/payments";
import { ProfileForm, PasswordForm } from "./Forms";
import BillingPanel from "@/components/BillingPanel";
import { getSubs, listCards } from "@/lib/billing";
import { Badge, Button, Card, PageHeader, cx } from "@/components/ui";

export const metadata = { title: "My account" };
const TABS = [["profile", "Profile"], ["password", "Password"], ["billing", "Plan & billing"], ["history", "My checks"], ["data", "My data"]] as const;

export default async function Account({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user, profile, country, tier, displayName } = await getSession();
  if (!user) redirect("/login?next=/account");
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some(([t]) => t === rawTab) ? rawTab! : "profile";
  const supabase = await createClient();
  const billing = tab === "billing";
  const [subs, cards, { data: payments }] = billing
    ? await Promise.all([getSubs(user.id), listCards(user.id).catch(() => []), supabase.from("payments").select("id,amount,currency,status,description,created_at").order("created_at", { ascending: false }).limit(24)])
    : [[], [], { data: [] }];
  const { data: checks } = tab === "history" ? await supabase.from("financial_assessments").select("created_at,health_score,stress_score,net_worth,currency").order("created_at", { ascending: false }).limit(20) : { data: null };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader eyebrow="Account" title={displayName ?? "My account"} actions={<form action="/auth/signout" method="post"><Button type="submit" variant="secondary" size="sm">Log out</Button></form>}>
        {user.email} · <Badge tone={tier === "free" ? "gray" : "teal"}>{tier === "free" ? "Free" : tier === "premium" ? "Premium" : "Premium Plus"}</Badge>
      </PageHeader>
      <nav aria-label="Account sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-navy-100">
        {TABS.map(([t, l]) => <Link key={t} href={`/account?tab=${t}`} aria-current={tab === t ? "page" : undefined} className={cx("whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold", tab === t ? "border-teal-500 text-teal-700" : "border-transparent text-navy-500 hover:text-navy-800")}>{l}</Link>)}
      </nav>

      {tab === "profile" && <Card><ProfileForm name={profile?.full_name ?? ""} email={user.email ?? ""} country={country?.code ?? null} /></Card>}
      {tab === "password" && <Card><PasswordForm /><p className="mt-4 text-sm text-navy-500">Forgot your current password? Log out and use &quot;Forgot password?&quot; on the login page.</p></Card>}
      {tab === "billing" && <BillingPanel subs={subs} cards={cards} payments={payments ?? []} stripe={paymentsMode() === "stripe"} plusEnabled={process.env.PREMIUM_PLUS_ENABLED !== "false"} />}
      {tab === "data" && <DataPanel />}
      {tab === "history" && (
        <Card>
          <h2 className="text-lg font-bold">My Financial Health checks</h2>
          {checks?.length ? (
            <table className="mt-3 w-full text-left text-sm"><thead><tr className="text-navy-500"><th className="py-2">Date</th><th>Health</th><th>Stress</th><th>Financial position</th></tr></thead>
              <tbody>{checks.map(c => <tr key={c.created_at} className="border-t border-navy-100"><td className="py-2">{new Date(c.created_at).toLocaleDateString()}</td><td>{c.health_score}</td><td>{c.stress_score}</td><td>{c.currency?.toUpperCase()} {Math.round(Number(c.net_worth)).toLocaleString()}</td></tr>)}</tbody></table>
          ) : <p className="mt-2 text-sm text-navy-500">No checks saved yet.</p>}
          <Button href="/health" size="sm" className="mt-4">Do a new check</Button>
        </Card>
      )}
    </div>
  );
}

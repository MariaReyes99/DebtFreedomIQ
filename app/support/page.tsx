import { Card, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/session";
import { TOPICS } from "@/lib/support";
import SupportForm from "./SupportForm";
import { SUPPORT_EMAIL } from "@/lib/site";

export const metadata = { title: "Contact support" };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { user, profile, displayCountry: c } = await getSession();
  const { topic } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader eyebrow="Help with DebtFreedomIQ" title="Contact support">Questions about your plan, payments or account, or something not working? We&apos;re a small team and read every message.</PageHeader>
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Need money help today?</strong> We&apos;re app support, not financial counsellors. For free, confidential help now, contact <strong>{c.firstCall.name}</strong>{c.firstCall.phone ? ` on ${c.firstCall.phone}` : ""}, or see <a href="/help" className="font-semibold underline">Get help</a>. In an emergency, call your local emergency number.
      </div>
      <Card>
        <SupportForm topics={TOPICS} email={user?.email ?? ""} name={profile?.full_name ?? ""} topic={TOPICS.some(t => t[0] === topic) ? topic! : "other"} />
      </Card>
      <p className="mt-4 text-sm text-navy-600">Prefer email? Write to <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-teal-700 underline">{SUPPORT_EMAIL}</a>.</p>
      <p className="mt-2 text-xs text-navy-500">We use your message only to help you. See <a href="/about" className="underline">About &amp; privacy</a>.</p>
    </div>
  );
}

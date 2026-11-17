import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, adminClient } from "@/lib/session";
import { Badge, Card, PageHeader } from "@/components/ui";
import AdminNav from "@/components/AdminNav";
import { TOPICS } from "@/lib/support";
import { setMessageStatus } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Support inbox" };

type Msg = { id: string; user_id: string | null; email: string; name: string | null; topic: string; message: string; status: string; internal_note: string | null; country: string | null; created_at: string };
const when = (s: string) => new Date(s).toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function SupportInbox({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  if (!(await isAdmin())) notFound();
  const { s = "open" } = await searchParams;
  const db = adminClient();
  const [{ data }, { count: open }] = await Promise.all([
    db.from("support_messages").select("*").eq("status", s === "resolved" ? "resolved" : "open").order("created_at", { ascending: s !== "resolved" }).limit(300),
    db.from("support_messages").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  const msgs = (data ?? []) as Msg[];
  const topic = (k: string) => TOPICS.find(t => t[0] === k)?.[1] ?? k;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader eyebrow="Admin" title="Support inbox">Messages from the Contact support page. Oldest open first. Reply by email, then mark it resolved.</PageHeader>
      <AdminNav current="/admin/support" openCount={open ?? 0} />
      <div className="mb-4 flex gap-2 text-sm">
        <Link href="/admin/support?s=open" className={`rounded-full px-3 py-1 font-semibold ${s !== "resolved" ? "bg-navy-900 text-white" : "bg-navy-50"}`}>Open ({open ?? 0})</Link>
        <Link href="/admin/support?s=resolved" className={`rounded-full px-3 py-1 font-semibold ${s === "resolved" ? "bg-navy-900 text-white" : "bg-navy-50"}`}>Resolved</Link>
      </div>
      <div className="space-y-4">
        {msgs.map(m => (
          <Card key={m.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold">{m.name || "(no name)"} <span className="font-normal text-navy-500">· {m.email}{m.country ? ` · ${m.country}` : ""}</span></p>
                <p className="text-xs text-navy-500">{when(m.created_at)} · {m.user_id ? <Link href={`/admin/customers/${m.user_id}`} className="font-semibold text-teal-700">View customer →</Link> : "not logged in"}</p>
              </div>
              <Badge tone={m.topic === "hardship" ? "amber" : m.topic === "billing" ? "navy" : "gray"}>{topic(m.topic)}</Badge>
            </div>
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-navy-50 p-3 text-[15px]">{m.message}</p>
            <form action={setMessageStatus} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="status" value={m.status === "open" ? "resolved" : "open"} />
              <label htmlFor={`note-${m.id}`} className="text-xs">Internal note (only admins see this)</label>
              <textarea id={`note-${m.id}`} name="note" rows={2} defaultValue={m.internal_note ?? ""} maxLength={2000} />
              <div className="flex flex-wrap gap-2">
                <a href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(`Re: ${topic(m.topic)} — DebtFreedomIQ`)}`} className="rounded-full border border-teal-300 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">✉️ Reply by email</a>
                <button type="submit" className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">{m.status === "open" ? "Mark resolved" : "Reopen"}</button>
              </div>
            </form>
          </Card>
        ))}
        {!msgs.length && <Card className="text-center text-navy-500">{s === "resolved" ? "Nothing resolved yet." : "No open messages. 🎉"}</Card>}
      </div>
    </div>
  );
}

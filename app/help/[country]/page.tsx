import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNTRIES, COUNTRY_LIST, toCountryCode } from "@/lib/countries";
import ResourceItem from "@/components/Resource";
import { getSession } from "@/lib/session";
import { track } from "@/lib/events";

export function generateStaticParams() { return COUNTRY_LIST.map(c => ({ country: c.code.toLowerCase() })); }

export async function generateMetadata({ params }: { params: Promise<{ country: string }> }) {
  const code = toCountryCode((await params).country);
  const c = code ? COUNTRIES[code] : null;
  return { title: c ? `Free financial & debt help in ${c.name} — DebtFreedomIQ` : "Find help" };
}

export default async function HelpCountry({ params }: { params: Promise<{ country: string }> }) {
  const code = toCountryCode((await params).country);
  if (!code) notFound();
  const c = COUNTRIES[code];
  const { user } = await getSession();
  await track("help_view", { userId: user?.id, country: code });

  return (
    <div className="wrap section">
      <div className="banner">
        <img src="/images/meeting-adviser.jpg" alt="A support worker listening to a man during a meeting" />
        <div className="over">
          <h1>Free help in {c.name}</h1>
          <p style={{ margin: 0 }}>All of these services are free. You never need to pay someone to find help.</p>
        </div>
      </div>

      <div className="card soft" style={{ margin: "18px 0" }}>
        <h3>Start here</h3>
        <ResourceItem r={c.firstCall} />
      </div>

      <div className="grid g2">
        {c.groups.map(g => (
          <div className="card" key={g.title}>
            <h3>{g.title}</h3>
            {g.items.map(r => <ResourceItem key={r.name + r.phone} r={r} />)}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Know your rights</h3>
        <p>{c.rightsNote}</p>
        <p className="small muted">Keep records of threatening calls or messages from collectors. Don&apos;t ignore genuine court documents. Get free legal advice quickly.</p>
      </div>

      <div className="center section">
        <p>Want to understand where your money is going and what to do first?</p>
        <Link href="/#check" className="btn big">Take the free health check</Link>
      </div>
    </div>
  );
}

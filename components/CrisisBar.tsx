import type { Country } from "@/lib/countries";

export default function CrisisBar({ country }: { country: Country | null }) {
  if (!country) return (
    <div className="crisis"><div className="wrap">If you or someone else is in danger, call your local emergency number now.</div></div>
  );
  const c = country.crisis;
  return (
    <div className="crisis" role="note">
      <div className="wrap">
        <span>Feeling overwhelmed? You're not alone.</span>
        <span>{c.name.replace(/\s+–.*$/, "")}: <a href={`tel:${c.phone?.replace(/[^\d+]/g, "")}`}>{c.phone}</a>{c.text && c.text !== c.phone ? <> · text {c.text}</> : null}</span>
        <span>Emergency: <a href={`tel:${country.emergency}`}>{country.emergency}</a></span>
      </div>
    </div>
  );
}

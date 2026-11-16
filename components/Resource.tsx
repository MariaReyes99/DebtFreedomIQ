import type { Resource } from "@/lib/countries";

export default function ResourceItem({ r }: { r: Resource }) {
  return (
    <div className="res">
      <strong>{r.name}</strong>
      <div className="muted small">{r.what}</div>
      <div className="contact">
        {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>📞 {r.phone}</a>}
        {r.text && <span>💬 Text {r.text}</span>}
        {r.email && <a href={`mailto:${r.email}`}>✉️ {r.email}</a>}
        {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer">🌐 Website</a>}
      </div>
      {r.hours && <div className="hint">{r.hours}</div>}
    </div>
  );
}

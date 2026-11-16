"use client";
import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { saveCheck, type CheckState } from "./actions";
import { setCountry } from "@/app/actions";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";
import CountrySearch from "@/components/CountrySearch";
import { LEVEL_COPY } from "@/lib/health";
import ResourceItem from "@/components/Resource";

const ESSENTIALS: [string, string][] = [
  ["rent", "Rent / mortgage / board"], ["food", "Food & groceries"], ["utilities", "Power, water, phone & internet"],
  ["transport", "Transport (fuel, fares, car)"], ["health", "Health & medicines"], ["childcare", "Childcare & school costs"],
];
const FLAGS: [string, string][] = [
  ["cantAffordFood", "I'm struggling to afford food"],
  ["housingAtRisk", "I'm worried about keeping my home (eviction, arrears, repossession)"],
  ["courtOrCollection", "I'm getting debt collector calls or court notices"],
  ["behindOnBills", "I'm behind on bills or loan repayments"],
  ["creditForEssentials", "I'm using credit cards, loans or buy-now-pay-later for everyday costs"],
  ["medicalDebt", "Some of my debts or bills are from doctor, hospital or other health costs"],
  ["distressed", "I feel very stressed, alone, or I have nobody to talk to"],
];
const PENDING = "fs_pending_check";

export default function CheckForm({ countryCode, detected, hasPlan, loggedIn }:
  { countryCode: CountryCode | null; detected: string | null; hasPlan: boolean; loggedIn: boolean }) {
  const [code, setCode] = useState<CountryCode | null>(countryCode);
  const c = code ? COUNTRIES[code] : null;
  const [state, action, pending] = useActionState<CheckState, FormData>(saveCheck, {});
  const [period, setPeriod] = useState<"fortnight" | "month">(c?.defaultPeriod ?? "month");
  const formRef = useRef<HTMLFormElement>(null);

  // After someone signs up, save the check they did before creating the account.
  useEffect(() => {
    if (!loggedIn) return;
    try {
      const raw = localStorage.getItem(PENDING);
      if (!raw) return;
      localStorage.removeItem(PENDING);
      const fd = new FormData();
      Object.entries(JSON.parse(raw) as Record<string, string>).forEach(([k, v]) => fd.append(k, v));
      startTransition(() => action(fd));
    } catch { /* ignore */ }
  }, [loggedIn, action]);

  const changeCountry = (v: string) => {
    const cc = v as CountryCode;
    setCode(cc);
    setPeriod(COUNTRIES[cc].defaultPeriod);
    const fd = new FormData(); fd.append("country", cc);
    startTransition(() => { setCountry(fd); });
  };

  const onSubmit = () => {
    if (loggedIn || !formRef.current) return;
    try {
      const data: Record<string, string> = {};
      new FormData(formRef.current).forEach((v, k) => { data[k] = String(v); });
      localStorage.setItem(PENDING, JSON.stringify(data));
    } catch { /* ignore */ }
  };

  const n = (i: number) => i;
  const r = state.result;
  if (r && c) {
    const copy = LEVEL_COPY[r.level];
    const per = state.period ?? period;
    return (
      <div className="stack" id="result">
        <div className={`result ${r.level}`}>
          <div className="light"><span className={`dot ${r.level}`} /> {r.level.toUpperCase()}: {copy.label}</div>
          <p style={{ marginTop: 10, fontSize: "1.1rem" }}>{copy.action}</p>
          <p><strong>Left over each {per}:</strong> {money(c, r.balance)} {r.balance < 0 && "(shortfall)"}</p>
          <ul>{r.reasons.map(x => <li key={x}>{x}</li>)}</ul>
        </div>

        {r.level === "red" && (
          <div className="card" style={{ borderColor: "var(--red)" }}>
            <h3>If you&apos;re feeling overwhelmed right now</h3>
            <ResourceItem r={c.crisis} />
            <p className="small">If you or someone else is in immediate danger, call <a href={`tel:${c.emergency}`}>{c.emergency}</a>.</p>
          </div>
        )}

        {state.medical && (() => {
          const g = c.groups.find(x => x.title === "Health & hospital bills");
          return g ? (
            <div className="card" style={{ borderColor: "var(--accent)" }}>
              <h3>Help with health &amp; hospital bills</h3>
              <p className="muted small">Medical bills can often be reduced, paused or covered. Ask before you pay or borrow.</p>
              {g.items.map(it => <ResourceItem key={it.name} r={it} />)}
            </div>
          ) : null;
        })()}

        <div className="card">
          <h3>Your next step: contact {c.firstCall.name}</h3>
          <ResourceItem r={c.firstCall} />
          {c.groups.filter(g => g.title !== "Emotional support" && !(state.medical && g.title === "Health & hospital bills")).map(g => (
            <details key={g.title} style={{ marginTop: 8 }}>
              <summary><strong>{g.title}</strong></summary>
              {g.items.map(it => <ResourceItem key={it.name} r={it} />)}
            </details>
          ))}
          <p style={{ marginTop: 10 }}><Link href={`/help/${c.code.toLowerCase()}`}>See all free help in {c.name} →</Link></p>
        </div>

        {!loggedIn ? (
          <div className="card soft">
            <h3>Save your result and build your plan</h3>
            <p>Create a free account to keep this result, come back to it later, and unlock your step-by-step <strong>Debt Recovery Plan</strong>.</p>
            <div className="row">
              <Link href="/signup?next=/" className="btn">Create free account</Link>
              <Link href="/login?next=/" className="btn ghost">I already have one</Link>
            </div>
          </div>
        ) : (
          <div className="card soft">
            <h3>{hasPlan ? "Open your Debt Recovery Plan" : "Want a step-by-step plan?"}</h3>
            {state.saved && <p className="small">✓ Your result has been saved to your account.</p>}
            {!hasPlan && <p>Your personalised <strong>Debt Recovery Plan</strong> lists every debt in the best payoff order, shows when you could be debt-free and how much interest you&apos;d save, gives you a 30-day action checklist, and writes a hardship letter for each creditor. One-off {money(c, c.planPrice)}.</p>}
            <div className="row">
              <Link href="/plan" className="btn">{hasPlan ? "Open my plan" : "See my Debt Recovery Plan"}</Link>
              <button className="btn ghost" onClick={() => location.assign("/#check")}>Redo check</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={action} onSubmit={onSubmit} ref={formRef} className="card" id="check">
      {state.error && <p className="error">{state.error}</p>}
      <input type="hidden" name="period" value={period} />

      {!c && <h3>1. Where do you live?</h3>}
      {c ? (
        <>
          <input type="hidden" name="country" value={c.code} />
          <p className="country-line">📍 Showing help and amounts for <strong>{c.name}</strong></p>
        </>
      ) : (
      <div className="field">
        <CountrySearch label="Country" onSelect={changeCountry} required />
        <div className="hint">
          {detected && !countryCode ? `You appear to be in ${detected}, which we don't cover yet. Choose the closest country.`
            : "Type to find your country. You'll only need to do this once."}
        </div>
      </div>
      )}

      {c && (
        <>
          <div className="field">
            <label>I&apos;ll enter amounts per</label>
            <div className="row">
              {(["fortnight", "month"] as const).map(p => (
                <button type="button" key={p} className={`btn sm ${period === p ? "" : "ghost"}`} onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>

          <h3 style={{ marginTop: 18 }}>{n(1)}. Money coming in</h3>
          <div className="field"><label htmlFor="income">Total household take-home income per {period} ({c.symbol})<span className="hint">: wages, benefits, child support, everything</span></label><input id="income" name="income" inputMode="decimal" required /></div>

          <h3 style={{ marginTop: 18 }}>{n(2)}. Essentials per {period}</h3>
          <div className="grid g2">
            {ESSENTIALS.map(([k, l]) => <div className="field" key={k}><label htmlFor={k}>{l}</label><input id={k} name={k} inputMode="decimal" placeholder="0" /></div>)}
          </div>

          <h3 style={{ marginTop: 18 }}>{n(3)}. Debts</h3>
          <div className="grid g2">
            <div className="field"><label htmlFor="debtRepayments">Debt repayments per {period}</label><input id="debtRepayments" name="debtRepayments" inputMode="decimal" placeholder="0" /></div>
            <div className="field"><label htmlFor="totalDebt">Total amount owed (all debts)</label><input id="totalDebt" name="totalDebt" inputMode="decimal" placeholder="0" /></div>
          </div>
          <div className="field"><label htmlFor="other">Everything else per {period}<span className="hint">: subscriptions, clothes, gifts, etc.</span></label><input id="other" name="other" inputMode="decimal" placeholder="0" /></div>

          <h3 style={{ marginTop: 18 }}>{n(4)}. Is any of this happening to you?</h3>
          {FLAGS.map(([k, l]) => <label key={k} className="check"><input type="checkbox" name={k} /> {l}</label>)}

          <button className="btn big" style={{ width: "100%", marginTop: 16 }} disabled={pending}>{pending ? "Checking…" : "See my result"}</button>
          <p className="hint center" style={{ marginTop: 8 }}>{loggedIn ? "Your result will be saved to your account." : "No account needed to see your result. Nothing is saved unless you sign up."}</p>
        </>
      )}
    </form>
  );
}
